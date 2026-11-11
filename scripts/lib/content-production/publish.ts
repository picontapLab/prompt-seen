import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import { loadConfig } from '../../../src/config/load';
import { createUrlModule, urlConfigOf } from '../../../src/modules/url/create';
import { renderTemplate } from '../../../src/modules/template/render';
import { loadContent, readValidatedContent } from '../content/load';
import { readContent, sha256, sourceHashOf } from '../content/read';
import { Findings } from '../content/findings';
import { resolvePrompt, resolveTemplate, sourcePromptLanguage } from '../content/prompt-variants';
import { sameValues, toFieldSpec } from '../content/rules';
import {
  fieldSchema,
  fieldsFileSchema,
  promptEntrySchema,
  inputRequirementsSchema,
  inspirationSourceSchema,
  SLUG_PATTERN,
} from '../content/schemas';
import { importMedia } from '../media/import';
import { localStorage } from '../media/storage';
import { applyChanges, type Change } from '../media-generation/transaction';
import { jobStatus } from './production';
import { acquireContentLock } from './lock';
import { templateContractHash } from '../content/template-contract';

const locale = z.object({ title: z.string().min(1), description: z.string().min(1), body: z.string().min(1) }).strict();
export const recipeSchema = z
  .object({
    candidateId: z.string().min(1),
    editorialReview: z
      .object({
        reviewer: z.string().min(1),
        reviewedAt: z.iso.datetime(),
        contentHash: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict()
      .optional(),
    target: z
      .object({ promptId: z.string().regex(/^p_\d+$/), sampleName: z.string().regex(/^[a-z][a-z0-9-]*$/) })
      .strict()
      .optional(),
    slug: z.string().regex(SLUG_PATTERN),
    categoryId: z.string(),
    useCaseIds: z.array(z.string()),
    body: z.string().trim().min(1),
    promptLanguage: z.string().min(2).optional(),
    promptProvenance: z.enum(['unknown', 'original', 'independent-adaptation', 'source-prompt']).optional(),
    source: promptEntrySchema.shape.source.removeDefault().optional(),
    fields: z.array(fieldSchema),
    values: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
    inputRequirements: inputRequirementsSchema,
    inspirationSources: z.array(inspirationSourceSchema).default([]),
    locales: z.object({ en: locale, 'zh-Hans': locale }).strict(),
    alt: z.object({ en: z.string().min(1), 'zh-Hans': z.string().min(1) }).strict(),
  })
  .strict();
/** Hash the normalized recipe, excluding the attestation itself. */
export function recipeReviewHash(input: unknown): string {
  const recipe = recipeSchema.parse(input);
  delete recipe.editorialReview;
  return sha256(JSON.stringify(recipe));
}

const preparedSchema = z
  .object({
    key: z.string(),
    candidateId: z.string(),
    jobFingerprint: z.string(),
    planHash: z.string(),
    ids: z.object({
      prompt: z.string(),
      template: z.string().nullable(),
      example: z.string(),
      media: z.array(z.string()),
    }),
    changes: z.array(z.object({ file: z.string(), after: z.string() })),
    before: z.record(z.string(), z.string().nullable()),
  })
  .strict();
const safeKey = (key: string) =>
  z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .parse(key);
const workspace = (root: string, key: string) =>
  path.join(root, '.artifacts/content-production/prepared', safeKey(key));
function files(dir: string): string[] {
  return fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]))
    : [];
}
function nextId(dir: string, prefix: string) {
  const names = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const numbers = names
    .map((n) => new RegExp(`^${prefix}_(\\d+)`).exec(n))
    .filter((m) => m !== null)
    .map((m) => Number(m[1]));
  return `${prefix}_${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`;
}
function write(file: string, text: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}
function validate(root: string, dir: string) {
  const config = loadConfig(root, {});
  const result = loadContent({
    root,
    config,
    url: createUrlModule(urlConfigOf(config)),
    dir,
    mediaRoot: path.join(root, 'public'),
  });
  if (result.findings.blocking)
    throw new Error(
      result.findings.list
        .filter((f) => f.level === 'error' || f.level === 'publish')
        .map((f) => `${f.file}: ${f.message}`)
        .join('\n') || 'Staged content is invalid',
    );
}
async function locked<T>(root: string, operation: () => Promise<T>) {
  const release = acquireContentLock(root);
  try {
    return await operation();
  } finally {
    release();
  }
}
/** Stage a complete new case against the current content tree; no fixed corpus size. */
export async function prepareContent(root: string, jobRoot: string, key: string, input: unknown) {
  return locked(root, async () => {
    const recipe = recipeSchema.parse(input);
    if (!recipe.editorialReview || recipe.editorialReview.contentHash !== recipeReviewHash(recipe))
      throw new Error('A matching editorial review of the complete recipe is required before publication');
    if (!recipe.target)
      for (const file of files(path.join(root, 'production/applied')).filter((file) => file.endsWith('.json'))) {
        const applied = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (applied.candidateId === recipe.candidateId)
          throw new Error(`Candidate already published as ${applied.ids.prompt}; append a run with target`);
      }
    const job = jobStatus(jobRoot, key);
    if (job.status !== 'accepted' || !job.receipt || !job.review?.accepted)
      throw new Error('Preparation requires an accepted generation');
    if (job.definition.candidateId !== recipe.candidateId) throw new Error('Candidate does not match generation');
    let text = recipe.fields.length
      ? renderTemplate({ body: recipe.body, fields: recipe.fields.map(toFieldSpec) }, recipe.values).text
      : recipe.body;
    for (const asset of [job.receipt.output, ...job.references])
      if (crypto.createHash('sha256').update(fs.readFileSync(asset.path)).digest('hex') !== asset.sha256)
        throw new Error('Recorded asset changed');
    const stage = workspace(root, key);
    const stageContent = path.join(stage, 'content');
    const planFile = path.join(stage, 'prepared.json');
    if (fs.existsSync(path.join(stage, 'apply-journal.json')))
      throw new Error('This job has an apply journal; inspect its status instead of preparing again');
    if (fs.existsSync(stageContent)) fs.rmSync(stageContent, { recursive: true });
    fs.cpSync(path.join(root, 'content'), stageContent, { recursive: true });
    const existing = recipe.target
      ? promptEntrySchema.parse(
          YAML.parse(fs.readFileSync(path.join(stageContent, 'prompts', recipe.target.promptId, 'entry.yaml'), 'utf8')),
        )
      : null;
    if (existing && existing.slug !== recipe.slug) throw new Error('Existing prompt slug does not match recipe');
    if (
      existing?.inspirationSources.length &&
      !existing.inspirationSources.some((s) => s.candidateId === recipe.candidateId)
    )
      throw new Error('Existing prompt belongs to another candidate');
    if (!existing)
      for (const kind of ['prompts', 'templates'])
        for (const file of files(path.join(stageContent, kind)).filter((f) => f.endsWith('/entry.yaml'))) {
          if (YAML.parse(fs.readFileSync(file, 'utf8')).slug === recipe.slug)
            throw new Error(`Slug already exists: ${recipe.slug}`);
        }
    const promptId = existing?.id ?? nextId(path.join(stageContent, 'prompts'), 'p');
    const existingTemplate = existing?.promptSource.type === 'template' ? existing.promptSource : null;
    const templateId = existing
      ? (existingTemplate?.templateId ?? null)
      : recipe.fields.length
        ? nextId(path.join(stageContent, 'templates'), 't')
        : null;
    const versionId = existingTemplate?.version ?? 'v1';
    let promptLanguage = recipe.promptLanguage ?? 'en';
    let variantHash: string | null = null;
    let sourceContractHash = recipe.fields.length
      ? templateContractHash(recipe.body, recipe.fields, recipe.inputRequirements)
      : null;
    let translated = false;
    if (existing) {
      const config = loadConfig(root, {});
      const findings = new Findings(root);
      const content = readContent(stageContent, config.locales, findings);
      if (findings.blocking) throw new Error('Existing content cannot be read');
      const rec = content.prompts.get(promptId)!;
      const sourceLanguage = sourcePromptLanguage(content, rec);
      promptLanguage = recipe.promptLanguage ?? sourceLanguage;
      translated = promptLanguage !== sourceLanguage;
      if (translated && !rec.promptLocales.has(promptLanguage))
        throw new Error(`Missing prompt locale: ${promptLanguage}`);
      if (existingTemplate) {
        const template = content.templates.get(existingTemplate.templateId)!;
        const version = template.versions.get(versionId)!;
        if (translated && !version.promptLocales.has(promptLanguage))
          throw new Error(`Missing template locale: ${promptLanguage}`);
        const selected = resolveTemplate(template, version, promptLanguage);
        if (selected.spec.body !== recipe.body) throw new Error('Existing body is immutable; create a new version');
        text = renderTemplate(selected.spec, recipe.values).text;
        variantHash = selected.variantHash;
        sourceContractHash = templateContractHash(version.body, version.fields, version.inputs);
        if (
          translated &&
          (!selected.samples.has(recipe.target!.sampleName) ||
            !sameValues(selected.samples.get(recipe.target!.sampleName)!.values, recipe.values, selected.spec.fields))
        )
          throw new Error('Translated sample values must match the existing language variant');
      } else if (resolvePrompt(content, rec, promptLanguage).text !== recipe.body) {
        throw new Error('Existing body is immutable; create a new version');
      }
    }
    if (!loadConfig(root, {}).locales.some((locale) => locale.code === promptLanguage))
      throw new Error('Unregistered prompt language');
    if (!text || text !== job.definition.prompt) throw new Error('Recipe does not render the exact recorded prompt');
    if (existing) {
      const versionDir = templateId ? path.join(stageContent, 'templates', templateId, 'versions', versionId) : null;
      const bodyFile = versionDir
        ? path.join(versionDir, 'body.txt')
        : path.join(stageContent, 'prompts', promptId, 'prompt.txt');
      if (!translated && fs.readFileSync(bodyFile, 'utf8').trim() !== recipe.body)
        throw new Error('Existing body is immutable; create a new version');
      if (versionDir) {
        const fields = fieldsFileSchema.parse(
          YAML.parse(fs.readFileSync(path.join(versionDir, 'fields.yaml'), 'utf8')),
        ).fields;
        const inputs = inputRequirementsSchema.parse(
          YAML.parse(fs.readFileSync(path.join(versionDir, 'inputs.yaml'), 'utf8')),
        );
        if (
          JSON.stringify(fields) !== JSON.stringify(recipe.fields) ||
          JSON.stringify(inputs) !== JSON.stringify(recipe.inputRequirements)
        )
          throw new Error('Existing version contract changed');
        const sampleFile = path.join(versionDir, 'samples', `${recipe.target!.sampleName}.yaml`);
        if (
          !translated &&
          fs.existsSync(sampleFile) &&
          JSON.stringify(YAML.parse(fs.readFileSync(sampleFile, 'utf8'))) !== JSON.stringify(recipe.values)
        )
          throw new Error('Existing sample values are immutable');
      } else if (
        recipe.fields.length ||
        JSON.stringify(existing.inputRequirements) !== JSON.stringify(recipe.inputRequirements)
      )
        throw new Error('Existing literal input contract changed');
    }
    const exampleId = nextId(path.join(stageContent, 'examples'), 'x');
    const output = await importMedia({
      dir: stageContent,
      storage: localStorage(path.join(root, 'public')),
      input: fs.readFileSync(job.receipt.output.path),
      slug: recipe.slug,
      metadata: {
        alt: recipe.alt,
        credit: {
          creator: 'Prompt Seen',
          creditText: 'AI-generated demonstration · Prompt Seen',
          copyrightNotice: null,
          sourceUrl: null,
          license: 'CC BY 4.0',
          licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
          acquireLicenseUrl: null,
        },
      },
    });
    const referenceIds: string[] = [];
    for (const reference of job.references) {
      const slot = recipe.inputRequirements.slots.find((s) => s.id === reference.slotId);
      if (!slot) throw new Error(`Missing input slot ${reference.slotId}`);
      const ref = await importMedia({
        dir: stageContent,
        storage: localStorage(path.join(root, 'public')),
        input: fs.readFileSync(reference.path),
        slug: `${recipe.slug}-reference`,
        // A local input path does not establish authorship (§9.7). Previously imported
        // references retain their declared credit; new inputs keep unknown fields null.
        metadata: { alt: slot.labels },
      });
      referenceIds.push(ref.id);
    }
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    const yaml = (relative: string, value: unknown) =>
      write(path.join(stageContent, relative), YAML.stringify(value, { lineWidth: 0 }));
    const template = templateId
      ? { id: templateId, version: versionId, sample: recipe.target?.sampleName ?? 'default', values: recipe.values }
      : null;
    if (!existing)
      yaml(`prompts/${promptId}/entry.yaml`, {
        id: promptId,
        slug: recipe.slug,
        createdAt: date,
        updatedAt: date,
        promptSource: templateId
          ? { type: 'template', templateId, version: 'v1', values: recipe.values }
          : { type: 'literal', file: 'prompt.txt', language: recipe.promptLanguage ?? 'en' },
        categoryId: recipe.categoryId,
        styleIds: [],
        useCaseIds: recipe.useCaseIds,
        coverAssetId: output.id,
        relatedTemplateIds: templateId ? [templateId] : [],
        model: {
          displayName: job.receipt.model,
          providerModelId: null,
          verification: job.receipt.model ? 'verified' : 'unknown',
        },
        inputRequirements: templateId
          ? { referenceImage: recipe.inputRequirements.referenceImage }
          : recipe.inputRequirements,
        showcaseExampleId: exampleId,
        promptProvenance:
          recipe.promptProvenance ?? (recipe.inspirationSources.length ? 'independent-adaptation' : 'unknown'),
        inspirationSources: recipe.inspirationSources,
        source:
          recipe.source ??
          (recipe.promptProvenance === 'source-prompt'
            ? {
                author: recipe.inspirationSources.length === 1 ? recipe.inspirationSources[0]!.author : null,
                url: recipe.inspirationSources.length === 1 ? recipe.inspirationSources[0]!.url : null,
                license: null,
              }
            : { author: 'Prompt Seen', url: null, license: 'CC BY 4.0' }),
        annotations: [],
      });
    if (!existing && !templateId) write(path.join(stageContent, `prompts/${promptId}/prompt.txt`), text + '\n');
    const writeLocales = (dir: string) => {
      const source = recipe.locales.en;
      const sourceHash = sourceHashOf({ fm: source, body: source.body });
      for (const [code, copy] of Object.entries(recipe.locales))
        write(
          path.join(stageContent, dir, 'locales', `${code}.mdx`),
          '---\n' +
            YAML.stringify({
              title: copy.title,
              description: copy.description,
              status: 'published',
              updatedAt: date,
              ...(code === 'en' ? {} : { translation: { sourceLocale: 'en', sourceHash, reviewStatus: 'reviewed' } }),
            }) +
            '---\n\n' +
            copy.body.trim() +
            '\n',
        );
    };
    if (!existing) writeLocales(`prompts/${promptId}`);
    if (templateId && !existing) {
      yaml(`templates/${templateId}/entry.yaml`, {
        id: templateId,
        slug: recipe.slug,
        createdAt: date,
        updatedAt: date,
        currentVersion: 'v1',
        promptLanguage: recipe.promptLanguage ?? 'en',
        categoryId: recipe.categoryId,
        styleIds: [],
        useCaseIds: recipe.useCaseIds,
      });
      yaml(`templates/${templateId}/versions/v1/fields.yaml`, { fields: recipe.fields });
      yaml(`templates/${templateId}/versions/v1/inputs.yaml`, recipe.inputRequirements);
      yaml(`templates/${templateId}/versions/v1/samples/default.yaml`, recipe.values);
      write(path.join(stageContent, `templates/${templateId}/versions/v1/body.txt`), recipe.body + '\n');
      writeLocales(`templates/${templateId}`);
    }
    if (templateId && recipe.target && !translated)
      yaml(`templates/${templateId}/versions/${versionId}/samples/${recipe.target.sampleName}.yaml`, recipe.values);
    yaml(`examples/${exampleId}/run.yaml`, {
      id: exampleId,
      promptId,
      promptLanguage,
      template: template
        ? { ...template, contractHash: sourceContractHash, ...(variantHash ? { variantHash } : {}) }
        : null,
      promptSha256: sha256(text),
      referenceAssetIds: referenceIds,
      referenceBindings: job.references.map((r, i) => ({ slotId: r.slotId, referenceIndex: i })),
      outputAssetIds: [output.id],
      provider: job.receipt.provider,
      model: { displayName: job.receipt.model, providerModelId: null },
      recordedAt: new Date(job.receipt.recordedAt).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }),
      parameters: {},
      notes: { en: job.review.notes, 'zh-Hans': recipe.alt['zh-Hans'] },
    });
    write(path.join(stageContent, `examples/${exampleId}/prompt.txt`), text + '\n');
    const prepared = readValidatedContent({ root, config: loadConfig(root, {}), dir: stageContent });
    if (prepared.findings.blocking)
      throw new Error(
        prepared.findings.list
          .filter((finding) => finding.level === 'error' || finding.level === 'publish')
          .map((finding) => `${finding.file}: ${finding.message}`)
          .join('\n'),
      );

    const changes: Change[] = [];
    const before: Record<string, string | null> = {};
    for (const file of files(stageContent)) {
      const relative = path.relative(stageContent, file);
      const target = path.join(root, 'content', relative);
      const after = fs.readFileSync(file, 'utf8');
      if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === after) continue;
      const dest = `content/${relative}`;
      before[dest] = fs.existsSync(target) ? sha256(fs.readFileSync(target, 'utf8')) : null;
      changes.push({ file: dest, after });
    }
    const ids = { prompt: promptId, template: templateId, example: exampleId, media: [output.id, ...referenceIds] };
    const recordFile = `production/applied/${key}.json`;
    if (fs.existsSync(path.join(root, recordFile))) throw new Error('An applied record already exists for this job');
    before[recordFile] = null;
    changes.push({
      file: recordFile,
      after:
        JSON.stringify(
          {
            key,
            candidateId: recipe.candidateId,
            fingerprint: job.fingerprint,
            ids,
            provider: job.receipt.provider,
            model: job.receipt.model,
            outputSha256: job.receipt.output.sha256,
            referenceHashes: job.references.map(({ slotId, sha256 }) => ({ slotId, sha256 })),
            review: job.review,
            editorialReview: recipe.editorialReview,
          },
          null,
          2,
        ) + '\n',
    });
    const payload = { key, candidateId: recipe.candidateId, jobFingerprint: job.fingerprint, ids, changes, before };
    const plan = preparedSchema.parse({ ...payload, planHash: sha256(JSON.stringify(payload)) });
    write(planFile, JSON.stringify(plan, null, 2) + '\n');
    return plan;
  });
}
export async function applyPrepared(root: string, key: string, expectedHash: string) {
  return locked(root, async () => {
    const stage = workspace(root, key);
    const plan = preparedSchema.parse(JSON.parse(fs.readFileSync(path.join(stage, 'prepared.json'), 'utf8')));
    const { planHash, ...payload } = plan;
    if (planHash !== expectedHash || sha256(JSON.stringify(payload)) !== planHash)
      throw new Error('Prepared plan hash mismatch');
    const journal = path.join(stage, 'apply-journal.json');
    if (!fs.existsSync(journal))
      for (const [file, before] of Object.entries(plan.before)) {
        const target = path.join(root, file);
        const current = fs.existsSync(target) ? sha256(fs.readFileSync(target, 'utf8')) : null;
        if (current !== before) throw new Error(`Target changed since prepare: ${file}`);
      }
    await applyChanges(root, journal, plan.changes, () => validate(root, path.join(root, 'content')));
    return plan.ids;
  });
}
