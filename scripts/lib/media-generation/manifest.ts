import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { renderTemplate } from '../../../src/modules/template/render';
import { loadConfig } from '../../../src/config/load';
import { createUrlModule, urlConfigOf } from '../../../src/modules/url/create';
import { buildIndex } from '../content/build-index';
import { Findings } from '../content/findings';
import { normalizePrompt, readContent } from '../content/read';
import { promptTextOf } from '../content/rules';
import { resolveTemplate, runPromptLanguage, sourcePromptLanguage } from '../content/prompt-variants';
import { exampleRunSchema } from '../content/schemas';
import { atomicWrite, digest, filesUnder, hashFile, locked, paths, readJson, within, writeJson } from './files';
import { initialState, manifestSchema, stateSchema, type Job, type Manifest } from './schema';
import { applyChanges, rollbackChanges, type Change } from './transaction';

export const PILOT = ['a_018', 'a_045', 'a_101', 'a_050', 'a_063', 'a_020', 'a_067', 'a_064'];
export function readManifest(root: string, id = 'gpt-image-v1'): Manifest {
  const p = paths(root, id);
  const manifest = manifestSchema.parse(readJson(path.join(p.dir, 'manifest.json')));
  if (manifest.migrationId !== id) throw new Error('Manifest migration ID mismatch');
  return manifest;
}
export function jobOf(manifest: Manifest, id: string): Job {
  const job = manifest.jobs.find((job) => job.id === id);
  if (!job) throw new Error(`Unknown job ${id}`);
  return job;
}
export function assertBaseline(root: string, manifest: Manifest) {
  for (const [relative, hash] of Object.entries(manifest.baseline.files)) {
    const file = within(root, relative);
    if (!fs.existsSync(file) || hashFile(file) !== hash)
      throw new Error(`Baseline conflict: ${relative}; run plan --rebase`);
  }
  const baselineContent = Object.keys(manifest.baseline.files)
    .filter((f) => f.startsWith('content/'))
    .sort();
  const current = filesUnder(path.join(root, 'content'))
    .map((f) => path.relative(root, f))
    .sort();
  if (JSON.stringify(current) !== JSON.stringify(baselineContent))
    throw new Error('Content file set changed; run plan --rebase');
}
export function promptOf(root: string, job: Job): string {
  const text = normalizePrompt(fs.readFileSync(within(root, job.promptFile), 'utf8'));
  if (digest(text) !== job.promptSha256) throw new Error(`Prompt snapshot changed: ${job.id}`);
  return text;
}
function collectManifest(
  root: string,
  id: string,
  previous?: Manifest,
): { manifest: Manifest; prompts: Map<string, string> } {
  const config = loadConfig(root, {});
  const findings = new Findings(root);
  const content = readContent(path.join(root, 'content'), config.locales, findings);
  if (findings.blocking) throw new Error(findings.list.map((f) => `${f.file}: ${f.message}`).join('\n'));
  if (content.prompts.size !== 100 || (!previous && (content.media.size !== 101 || content.examples.size !== 44)))
    throw new Error('Expected baseline: 100 prompts, 101 assets, 44 sample runs');
  const p = paths(root, id);
  const baselineFiles = filesUnder(path.join(root, 'content'));
  const overrideFile = path.join(p.dir, 'source-overrides.json');
  const overrides = fs.existsSync(overrideFile)
    ? z
        .record(
          z.string(),
          z
            .object({
              previousPromptSha256: z.string().regex(/^[a-f0-9]{64}$/),
              template: exampleRunSchema.shape.template,
              promptLanguage: z.string().min(2).optional(),
            })
            .strict(),
        )
        .parse(readJson(overrideFile))
    : {};
  if (fs.existsSync(overrideFile)) baselineFiles.push(overrideFile);
  for (const relative of [
    'README.md',
    ...filesUnder(path.join(root, 'src/i18n/messages'))
      .filter((f) => f.endsWith('/detail.json'))
      .map((f) => path.relative(root, f)),
  ]) {
    if (fs.existsSync(path.join(root, relative))) baselineFiles.push(path.join(root, relative));
  }
  const mediaIds = previous?.jobs.map((job) => job.id) ?? [...content.media.keys()].sort();
  if (mediaIds.some((id) => !content.media.has(id))) throw new Error('Migration source asset set changed');
  if (previous) {
    for (const oldId of new Set(previous.jobs.flatMap((job) => job.sourceExampleIds)))
      for (const name of ['run.yaml', 'prompt.txt']) {
        const relative = `content/examples/${oldId}/${name}`;
        const file = within(root, relative);
        if (!fs.existsSync(file) || hashFile(file) !== previous.baseline.files[relative])
          throw new Error(`Historical run changed: ${relative}`);
      }
    const used = [...content.examples.values()].flatMap((run) => (run.data.template ? [run.data.template] : []));
    for (const job of previous.jobs)
      if (job.template && stateSchema.parse(readJson(within(p.dir, `jobs/${job.id}/state.json`))).attempts.length)
        used.push(job.template);
    for (const template of used) {
      const prefix = `content/templates/${template.id}/versions/${template.version}/`;
      for (const [file, hash] of Object.entries(previous.baseline.files))
        if (file.startsWith(prefix) && (!fs.existsSync(within(root, file)) || hashFile(within(root, file)) !== hash))
          throw new Error(`Frozen template source changed: ${file}; create a new version`);
    }
  }
  const mediaMax = Math.max(...[...content.media.keys()].map((id) => Number(id.slice(2))));
  const exampleMax = Math.max(...[...content.examples.keys()].map((id) => Number(id.slice(2))));
  const prompts = new Map<string, string>();
  const jobs: Job[] = mediaIds.map((assetId, i) => {
    const owners = [...content.prompts.values()].filter((r) => r.data.coverAssetId === assetId);
    const runs = [...content.examples.values()].filter((r) => r.data.outputAssetIds.includes(assetId));
    const texts = [...owners.map((r) => promptTextOf(content, r)), ...runs.map((r) => r.prompt)].filter(
      (t): t is string => t !== null,
    );
    const revisedOwner =
      previous && owners.length === 1 && previous.jobs.find((j) => j.id === assetId)?.promptId === owners[0]!.data.id;
    if (!texts.length || (!revisedOwner && new Set(texts).size !== 1) || owners.length > 1)
      throw new Error(`Conflicting or missing prompt sources for ${assetId}`);
    let text = texts[0]!;
    const owner = owners[0];
    let promptLanguage = owner
      ? sourcePromptLanguage(content, owner)
      : (runs.map((run) => runPromptLanguage(content, run)).find((language) => language !== null) ?? undefined);
    const ownerSource = owner?.data.promptSource;
    let template = owner
      ? ownerSource?.type === 'template'
        ? {
            id: ownerSource.templateId,
            version: ownerSource.version,
            values: ownerSource.values,
            sample:
              runs.find(
                (r) =>
                  r.prompt === text &&
                  r.data.template?.id === ownerSource.templateId &&
                  r.data.template?.version === ownerSource.version,
              )?.data.template?.sample ?? null,
          }
        : null
      : (runs.find((r) => r.data.template)?.data.template ?? null);
    const override = overrides[assetId];
    if (override) {
      if (owner || !override.template || override.previousPromptSha256 !== digest(text))
        throw new Error(`Invalid standalone template revision for ${assetId}`);
      template = override.template;
      const recTemplate = content.templates.get(template.id);
      const version = recTemplate?.versions.get(template.version);
      promptLanguage = override.promptLanguage ?? recTemplate?.data.promptLanguage;
      if (
        recTemplate &&
        version &&
        promptLanguage !== recTemplate.data.promptLanguage &&
        !version.promptLocales.has(promptLanguage!)
      )
        throw new Error(`Missing template locale: ${promptLanguage}`);
      const selected = recTemplate && version ? resolveTemplate(recTemplate, version, promptLanguage!) : null;
      const rendered = selected ? renderTemplate(selected.spec, template.values).text : null;
      if (!rendered) throw new Error(`Invalid template override for ${assetId}`);
      if (selected?.variantHash) template = { ...template, variantHash: selected.variantHash };
      text = rendered;
    }
    const ratios = [...text.matchAll(/\b(\d+)\s*:\s*(\d+)\b/g)].map((m) => `${m[1]}:${m[2]}`);
    const ratio = template?.values.aspectRatio;
    const aspect = typeof ratio === 'string' ? ratio : new Set(ratios).size === 1 ? ratios[0] : null;
    if (!aspect || !/^\d+:\d+$/.test(aspect)) throw new Error(`Missing or ambiguous aspect ratio for ${assetId}`);
    if (
      owner?.data.inputRequirements.referenceImage === 'required' ||
      runs.some((r) => r.data.referenceAssetIds.length)
    )
      throw new Error(`Reference image required: ${assetId}`);
    const media = content.media.get(assetId)!.data;
    const locales = new Set(Object.keys(media.alt));
    for (const rec of owners)
      for (const locale of rec.locales.values()) if (locale.fm.status === 'published') locales.add(locale.locale);
    prompts.set(assetId, text);
    return {
      id: assetId,
      slug: owner?.data.slug ?? 'product-poster-v2-default',
      promptId: owner?.data.id ?? null,
      ...(promptLanguage ? { promptLanguage } : {}),
      template: exampleRunSchema.shape.template.parse(template),
      sourceExampleIds: runs.map((r) => r.data.id),
      promptFile: path.relative(root, path.join(p.dir, 'jobs', assetId, 'prompt.txt')),
      promptSha256: digest(text),
      targetAspectRatio: aspect,
      inputRequirement: owner?.data.inputRequirements.referenceImage ?? 'none',
      newAssetId: `a_${String(mediaMax + i + 1).padStart(3, '0')}`,
      newExampleId: `x_${String(exampleMax + i + 1).padStart(3, '0')}`,
      requiredAltLocales: [...locales].sort(),
      annotationCount: owner?.data.annotations.length ?? 0,
    };
  });
  const references: Manifest['references'] = [];
  for (const rec of [...content.prompts.values(), ...content.collections.values()])
    if (rec.data.coverAssetId)
      references.push({ file: path.relative(root, rec.file), field: 'coverAssetId', assetId: rec.data.coverAssetId });
  const localized = [
    ...content.prompts.values(),
    ...content.templates.values(),
    ...content.collections.values(),
    ...content.pages.values(),
    ...content.topics,
  ];
  for (const rec of localized)
    for (const locale of rec.locales.values())
      for (const fig of locale.compiled.figures) {
        references.push({
          file: path.relative(root, locale.file),
          field: 'Figure',
          assetId: fig.assetId,
          line: fig.line,
        });
        const job = jobs.find((job) => job.id === fig.assetId);
        if (job && !job.requiredAltLocales.includes(locale.locale)) job.requiredAltLocales.push(locale.locale);
      }
  let head: string | null = null;
  try {
    head = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
  } catch {
    /* A fixture need not be a Git checkout. */
  }
  const visible: Record<string, string[]> = {};
  for (const mode of ['production', 'preview'] as const) {
    const c = loadConfig(root, { BUILD_MODE: mode });
    const built = buildIndex(content, c, createUrlModule(urlConfigOf(c)));
    for (const [code, index] of built.locales)
      visible[`${mode}/${code}`] = [...index.prompts, ...index.templates, ...index.collections, ...index.pages]
        .map((entry) => entry.path)
        .sort();
  }
  return {
    prompts,
    manifest: manifestSchema.parse({
      schemaVersion: 1,
      migrationId: id,
      revision: 1,
      baseline: {
        head,
        createdAt: new Date().toISOString(),
        timezone: 'America/Los_Angeles',
        files: Object.fromEntries(baselineFiles.map((f) => [path.relative(root, f), hashFile(f)])),
        visible,
      },
      policy: {
        transport: 'builtin-imagegen',
        concurrency: 1,
        maxAttempts: 3,
        pilot: PILOT,
        batchSize: 10,
        processingVersion: 1,
      },
      jobs,
      references,
    }),
  };
}
export async function planMigration(root: string, id = 'gpt-image-v1'): Promise<Manifest> {
  const p = paths(root, id);
  return locked(p, () => {
    if (fs.existsSync(path.join(p.dir, 'manifest.json'))) {
      const manifest = readManifest(root, id);
      assertBaseline(root, manifest);
      manifest.jobs.forEach((job) => promptOf(root, job));
      return manifest;
    }
    const { manifest, prompts } = collectManifest(root, id);
    for (const job of manifest.jobs) {
      atomicWrite(within(root, job.promptFile), `${prompts.get(job.id)!}\n`);
      writeJson(path.join(p.dir, 'jobs', job.id, 'state.json'), initialState());
    }
    writeJson(path.join(p.dir, 'asset-map.json'), Object.fromEntries(manifest.jobs.map((j) => [j.id, j.newAssetId])));
    writeJson(path.join(p.dir, 'manifest.json'), manifest);
    return manifest;
  });
}

export async function rebaseMigration(root: string, id = 'gpt-image-v1'): Promise<Manifest> {
  const p = paths(root, id);
  return locked(p, async () => {
    const journalFile = path.join(p.artifacts, 'rebase-journal.json');
    if (fs.existsSync(journalFile)) {
      const journal = readJson(journalFile) as { phase: string; entries: { file: string; after: string | null }[] };
      if (journal.phase === 'applying') {
        await applyChanges(
          root,
          journalFile,
          journal.entries.map((e) => ({
            file: e.file,
            after: e.after === null ? null : Buffer.from(e.after, 'base64').toString('utf8'),
          })),
          () => {
            const committed = readManifest(root, id);
            committed.jobs.forEach((j) => promptOf(root, j));
          },
        );
        return readManifest(root, id);
      }
      if (journal.phase === 'rolling_back') await rollbackChanges(root, journalFile);
      const archivedJournal = path.join(p.dir, 'archive/rebase-journals', `${digest(JSON.stringify(journal))}.json`);
      if (!fs.existsSync(archivedJournal)) writeJson(archivedJournal, journal);
      fs.rmSync(journalFile);
    }
    const previous = readManifest(root, id);
    const states = previous.jobs.map((job) => stateSchema.parse(readJson(within(p.dir, `jobs/${job.id}/state.json`))));
    if (
      states.some((s) => ['running', 'applied'].includes(s.status)) ||
      fs.existsSync(path.join(p.dir, 'apply-journal.json'))
    )
      throw new Error('Rebase requires no active claim or application transaction');
    const { manifest, prompts } = collectManifest(root, id, previous);
    manifest.revision = previous.revision + 1;
    const archive = within(p.dir, `archive/revisions/${previous.revision}`);
    if (!fs.existsSync(archive)) {
      const temp = `${archive}.staging`;
      fs.rmSync(temp, { recursive: true, force: true });
      fs.mkdirSync(temp, { recursive: true });
      fs.cpSync(path.join(p.dir, 'manifest.json'), path.join(temp, 'manifest.json'));
      fs.cpSync(path.join(p.dir, 'jobs'), path.join(temp, 'jobs'), { recursive: true });
      writeJson(
        path.join(temp, 'seal.json'),
        Object.fromEntries(filesUnder(temp).map((file) => [path.relative(temp, file), hashFile(file)])),
      );
      fs.renameSync(temp, archive);
    }
    const seal = z.record(z.string(), z.string()).parse(readJson(path.join(archive, 'seal.json')));
    for (const [file, hash] of Object.entries(seal))
      if (hashFile(within(archive, file)) !== hash) throw new Error(`Immutable revision archive changed: ${file}`);
    const changes: Change[] = [];
    let pilotInvalidated = false;
    const reserved = new Set(previous.jobs.flatMap((j) => [j.newAssetId, j.newExampleId]));
    let nextAsset =
      Math.max(
        ...manifest.jobs.map((j) => Number(j.newAssetId.slice(2))),
        ...previous.jobs.map((j) => Number(j.newAssetId.slice(2))),
      ) + 1;
    let nextExample =
      Math.max(
        ...manifest.jobs.map((j) => Number(j.newExampleId.slice(2))),
        ...previous.jobs.map((j) => Number(j.newExampleId.slice(2))),
      ) + 1;
    const allocate = (prefix: 'a' | 'x') => {
      let value: string;
      do {
        value = `${prefix}_${String(prefix === 'a' ? nextAsset++ : nextExample++).padStart(3, '0')}`;
      } while (reserved.has(value));
      reserved.add(value);
      return value;
    };
    for (const [i, job] of manifest.jobs.entries()) {
      const old = previous.jobs[i]!;
      job.newAssetId = fs.existsSync(within(root, `content/media/${old.newAssetId}.yaml`))
        ? allocate('a')
        : old.newAssetId;
      job.newExampleId = fs.existsSync(within(root, `content/examples/${old.newExampleId}/run.yaml`))
        ? allocate('x')
        : old.newExampleId;
      const same =
        job.promptSha256 === old.promptSha256 &&
        job.targetAspectRatio === old.targetAspectRatio &&
        job.inputRequirement === old.inputRequirement;
      const state = states[i]!;
      const metadataChanged = Object.entries(manifest.baseline.files).some(
        ([file, hash]) =>
          (file === `content/media/${job.id}.yaml` ||
            (job.promptId !== null && file.startsWith(`content/prompts/${job.promptId}/`))) &&
          previous.baseline.files[file] !== hash,
      );
      const affected =
        !same || job.newAssetId !== old.newAssetId || job.newExampleId !== old.newExampleId || metadataChanged;
      if (affected && previous.policy.pilot.includes(job.id)) pilotInvalidated = true;
      if (!same) {
        for (const file of filesUnder(within(p.dir, `jobs/${job.id}`)))
          changes.push({ file: path.relative(root, file), after: null });
        changes.push({
          file: path.relative(root, within(p.dir, `jobs/${job.id}/state.json`)),
          after: JSON.stringify(initialState(), null, 2) + '\n',
        });
      } else if (affected && state.generationReview)
        changes.push({
          file: path.relative(root, within(p.dir, `jobs/${job.id}/state.json`)),
          after:
            JSON.stringify(
              {
                ...state,
                status: 'accepted',
                artifacts: [],
                contentHash: null,
                displayReview: null,
              },
              null,
              2,
            ) + '\n',
        });
      changes.push({ file: job.promptFile, after: `${prompts.get(job.id)!}\n` });
    }
    changes.push({
      file: path.relative(root, path.join(p.dir, 'asset-map.json')),
      after: JSON.stringify(Object.fromEntries(manifest.jobs.map((j) => [j.id, j.newAssetId])), null, 2) + '\n',
    });
    if (pilotInvalidated) changes.push({ file: path.relative(root, path.join(p.dir, 'pilot.json')), after: null });
    changes.push({
      file: path.relative(root, path.join(p.dir, 'manifest.json')),
      after: JSON.stringify(manifest, null, 2) + '\n',
    });
    const unique = [...new Map(changes.map((change) => [change.file, change])).values()];
    await applyChanges(root, journalFile, unique, () => {
      const committed = readManifest(root, id);
      committed.jobs.forEach((j) => promptOf(root, j));
    });
    return manifest;
  });
}
