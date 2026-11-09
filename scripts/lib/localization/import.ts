import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import YAML from 'yaml';
import { loadConfig, contentDir } from '../../../src/config/load';
import { createUrlModule, urlConfigOf } from '../../../src/modules/url/create';
import { loadContent } from '../content/load';
import { acquireContentLock } from '../content-production/lock';
import { applyChanges, type Change } from '../media-generation/transaction';
import { within, atomicWrite } from '../media-generation/files';
import { splitFrontmatter } from '../content/mdx';
import { checkLocale, type LocaleReport } from './check';
import { fingerprint } from './fingerprint';

const fieldPath = z.array(z.union([z.string().min(1), z.number().int().nonnegative()])).min(1);
const hash = z.string().regex(/^sha256:[a-f0-9]{16}(?:[a-f0-9]{48})?$/);
const pageText = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    body: z.string().trim().min(1),
    seoTitle: z.string().trim().min(1).optional(),
    seoDescription: z.string().trim().min(1).optional(),
    reasons: z.record(z.string(), z.string().trim().min(1)).optional(),
  })
  .strict();
export const batchSchema = z
  .object({
    schemaVersion: z.literal(1),
    locale: z.literal('ja'),
    operations: z
      .array(
        z
          .object({
            key: z.string().min(1),
            sourceField: fieldPath,
            targetField: fieldPath,
            expectedSourceHash: hash,
            expectedTargetHash: hash.nullable(),
            translation: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1)).min(1), pageText]),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export type TranslationBatch = z.infer<typeof batchSchema>;
export type ImportPlan = {
  changes: Change[];
  conflicts: string[];
  pendingReview: boolean;
  fields: { file: string; field: (string | number)[] }[];
};
const samePath = (a: (string | number)[], b: (string | number)[]) => JSON.stringify(a) === JSON.stringify(b);

function plan(root: string, batch: TranslationBatch, report: LocaleReport): ImportPlan {
  const changes = new Map<string, string>();
  const conflicts: string[] = [];
  const fields: ImportPlan['fields'] = [];
  let pendingReview = false;
  const used = new Set<string>();
  const read = (file: string) =>
    changes.get(file) ?? (fs.existsSync(within(root, file)) ? fs.readFileSync(within(root, file), 'utf8') : null);
  for (const op of batch.operations) {
    try {
      const identity = `${op.key}#${JSON.stringify(op.targetField)}`;
      if (used.has(identity)) throw new Error('Duplicate operation');
      used.add(identity);
      const item = report.items.find((i) => i.key === op.key);
      if (item) {
        if (!samePath(op.sourceField, ['$page']) || !samePath(op.targetField, ['$page']))
          throw new Error('Page translations must address $page');
        const translated = pageText.parse(op.translation);
        if (op.expectedSourceHash !== item.sourceFingerprint) throw new Error('Source fingerprint changed');
        const file = item.targetFile;
        const previous = read(file);
        const split = previous ? splitFrontmatter(previous) : null;
        const fm = split ? YAML.parse(split.frontmatter) : {};
        const desiredHash = fingerprint({
          title: translated.title,
          description: translated.description,
          body: translated.body,
          seoTitle: translated.seoTitle ?? null,
          seoDescription: translated.seoDescription ?? null,
          reasons: translated.reasons ?? {},
        });
        if (desiredHash === item.targetHash) continue;
        if (op.expectedTargetHash !== item.targetHash) throw new Error('Target fingerprint changed');
        const { body, ...text } = translated;
        const next = {
          ...fm,
          ...text,
          status: 'draft',
          updatedAt: new Date().toISOString().slice(0, 10),
          translation: { sourceLocale: item.sourceLocale, sourceHash: item.sourceHash, reviewStatus: 'machine-draft' },
        };
        // Omitted optional prose is removed, not accidentally inherited from an earlier revision.
        for (const name of ['seoTitle', 'seoDescription', 'reasons']) if (!(name in text)) delete next[name];
        changes.set(file, `---\n${YAML.stringify(next)}---\n\n${body.trim()}\n`);
        fields.push({ file, field: op.targetField });
        if (fm.status === 'published') pendingReview = true;
        continue;
      }
      const field = report.fields.find((f) => f.key === op.key);
      if (!field || !field.file.startsWith('content/') || !field.file.endsWith('.yaml'))
        throw new Error('Target is not an allowed content dependency');
      if (
        !samePath(op.sourceField, field.sourceField) ||
        !samePath(op.targetField, field.targetField) ||
        field.targetField.at(-1) !== batch.locale
      )
        throw new Error('Field path is not in the translation allowlist');
      if (op.expectedSourceHash !== field.sourceHash) throw new Error('Source fingerprint changed');
      const translation = Array.isArray(field.source)
        ? z.array(z.string().trim().min(1)).min(1).parse(op.translation)
        : z.string().trim().min(1).parse(op.translation);
      const desiredHash = fingerprint({ field: field.targetField, value: translation });
      if (desiredHash === field.targetHash) continue;
      if (op.expectedTargetHash !== field.targetHash) throw new Error('Target fingerprint changed');
      const doc = YAML.parseDocument(read(field.file)!);
      if (doc.errors.length) throw new Error('Invalid target YAML');
      doc.setIn(field.targetField, translation);
      changes.set(field.file, doc.toString());
      fields.push({ file: field.file, field: field.targetField });
      if (report.items.some((i) => i.pageStatus === 'published' && i.dependencies.includes(field.key)))
        pendingReview = true;
    } catch (error) {
      conflicts.push(`${op.key}: ${(error as Error).message}`);
    }
  }
  return { changes: [...changes].map(([file, after]) => ({ file, after })), conflicts, pendingReview, fields };
}

/** Dry-run is read-only; apply re-reads under the shared content writer lock. */
export async function importTranslations(root: string, input: unknown, apply = false): Promise<ImportPlan> {
  const batch = batchSchema.parse(input);
  if (!apply) return plan(root, batch, checkLocale(root, batch.locale));
  const release = acquireContentLock(root);
  let staging: string | undefined;
  try {
    const report = checkLocale(root, batch.locale);
    if (report.blocking) throw new Error('Fix existing content errors before importing');
    const result = plan(root, batch, report);
    if (result.conflicts.length || !result.changes.length) return result;
    const artifactRoot = within(root, `.artifacts/localization/${batch.locale}`);
    staging = path.join(artifactRoot, `validate-${randomUUID()}`);
    const config = loadConfig(root);
    const dir = contentDir(root);
    if (path.resolve(dir) !== path.join(path.resolve(root), 'content'))
      throw new Error('Imports require the repository content directory');
    fs.cpSync(dir, path.join(staging, 'content'), { recursive: true, dereference: false });
    for (const change of result.changes) atomicWrite(within(staging, change.file), change.after!);
    const validate = (contentPath: string) => {
      const loaded = loadContent({ root, config, dir: contentPath, url: createUrlModule(urlConfigOf(config)) });
      if (loaded.findings.blocking)
        throw new Error(
          loaded.findings.list
            .filter((f) => f.level === 'error' || f.level === 'publish')
            .map((f) => `${f.file}: ${f.message}`)
            .join('\n'),
        );
    };
    validate(path.join(staging, 'content'));
    if (result.pendingReview) {
      // Keep published files intact. A reviewer can inspect complete candidate files and the
      // explicit plan; promotion is a separate reviewed content change, never a status override.
      const pending = path.join(artifactRoot, 'pending', fingerprint(batch).slice(7));
      for (const change of result.changes) atomicWrite(within(pending, change.file), change.after!);
      atomicWrite(path.join(pending, 'batch.json'), JSON.stringify(batch, null, 2) + '\n');
      return result;
    }
    const journal = path.join(artifactRoot, 'transactions', `${randomUUID()}.json`);
    await applyChanges(root, journal, result.changes, () => validate(dir));
    return result;
  } finally {
    if (staging) fs.rmSync(staging, { recursive: true, force: true });
    release();
  }
}
