import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import YAML from 'yaml';
import { contentDir, loadConfig } from '../../../src/config/load';
import { acquireContentLock } from '../content-production/lock';
import { applyChanges, type Change } from '../media-generation/transaction';
import { within, atomicWrite } from '../media-generation/files';
import { splitFrontmatter } from '../content/mdx';
import { reviewState } from '../content/localization';
import { analyzeLocale, checkLocale, readLocalizationSnapshot, reviewSchema } from './check';
import { batchSchema, fieldIdentity, lifecycle, type BatchManifest } from './import';
import { fingerprint, proseFingerprint } from './fingerprint';

function page(text: string) {
  const split = splitFrontmatter(text);
  if (!split) throw new Error('Candidate has no frontmatter');
  return { fm: YAML.parse(split.frontmatter), body: split.body };
}

/** Publish only the selected fields and their approvals under the content writer lock. */
export async function promoteTranslations(
  root: string,
  locale: string,
  batchId: string,
  input: unknown,
  apply = false,
): Promise<{ changes: Change[] }> {
  if (!/^[a-f0-9]{64}$/.test(batchId)) throw new Error('Invalid batch ID');
  const config = loadConfig(root);
  if (!config.locales.some((entry) => entry.code === locale)) throw new Error(`Unknown locale: ${locale}`);
  if (contentDir(root) !== path.join(path.resolve(root), 'content'))
    throw new Error('Promotion requires the repository content directory');
  const approvals = reviewSchema.parse(input);
  if (approvals.locale !== locale) throw new Error('Review locale does not match');
  const release = apply ? acquireContentLock(root) : () => {};
  let staging: string | undefined;
  try {
    const pending = `.artifacts/localization/${locale}/pending/${batchId}`;
    const manifestFile = within(root, `${pending}/manifest.json`);
    if (!fs.existsSync(manifestFile))
      throw new Error('Missing manifest; explicitly migrate the legacy candidate before promotion');
    const manifest: BatchManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    const batch = batchSchema.parse(manifest.batch);
    if (
      manifest.schemaVersion !== 1 ||
      manifest.locale !== locale ||
      batch.locale !== locale ||
      manifest.batchId !== batchId ||
      fingerprint(batch).slice(7) !== batchId ||
      !['pending', 'applied-draft'].includes(manifest.mode) ||
      manifest.operations.length !== batch.operations.length
    )
      throw new Error('Manifest identity conflict');
    const report = checkLocale(root, locale);
    const changes = new Map<string, string>();
    const before = new Map<string, string | null>();
    const read = (file: string) => {
      if (!before.has(file))
        before.set(file, fs.existsSync(within(root, file)) ? fs.readFileSync(within(root, file), 'utf8') : null);
      return changes.get(file) ?? before.get(file) ?? null;
    };
    const reviewFile = `production/localization/${locale}/reviews.json`;
    const previous = read(reviewFile);
    const existing = previous
      ? reviewSchema.parse(JSON.parse(previous))
      : { schemaVersion: 1 as const, locale, records: [] };
    if (existing.locale !== locale) throw new Error('Stored review locale does not match');
    for (const [index, op] of batch.operations.entries()) {
      const saved = manifest.operations[index]!;
      const item = report.items.find((item) => item.key === op.key);
      const field = report.fields.find((field) => field.key === op.key);
      const file = item?.targetFile ?? field?.file;
      if (
        !file ||
        saved.key !== op.key ||
        saved.file !== file ||
        (item?.sourceLocale ?? field?.sourceLocale) === locale
      )
        throw new Error('Manifest target conflict');
      const sourceHash = item?.sourceFingerprint ?? field!.sourceHash;
      const targetHash = item?.targetHash ?? field?.targetHash ?? null;
      const identity = item ? item.key : fieldIdentity(root, file, op.targetField);
      const desired = item
        ? proseFingerprint(op.translation as Parameters<typeof proseFingerprint>[0])
        : fingerprint({ field: op.targetField, value: op.translation });
      if (
        saved.identity !== identity ||
        saved.sourceHash !== sourceHash ||
        op.expectedSourceHash !== sourceHash ||
        saved.candidateHash !== desired
      )
        throw new Error('Source or candidate identity conflict');
      if (reviewState(op.key, sourceHash, desired, approvals.records) !== 'current')
        throw new Error(`Missing current candidate approval: ${op.key}`);
      if (manifest.mode === 'pending') {
        const candidate = fs.readFileSync(within(root, `${pending}/${file}`), 'utf8');
        const candidatePage = item ? page(candidate) : null;
        const hash = candidatePage
          ? proseFingerprint({ ...candidatePage.fm, body: candidatePage.body })
          : fingerprint({
              field: op.targetField,
              value: op.targetField.reduce<unknown>(
                (value, part) => (value as Record<string | number, unknown>)[part],
                YAML.parse(candidate),
              ),
            });
        if (hash !== desired || (item && lifecycle(candidate) !== saved.candidateLifecycle))
          throw new Error('Candidate was edited; new approval and plan required');
      }
      const alreadyPublished =
        targetHash === desired &&
        (!item || item.declaredStatus === 'published') &&
        reviewState(op.key, sourceHash, desired, existing.records) === 'current';
      if (alreadyPublished) continue;
      const current = read(file);
      if (targetHash !== saved.expectedTargetHash || (item && lifecycle(current) !== saved.lifecycle))
        throw new Error(`Target or lifecycle conflict: ${op.key}`);
      if (item) {
        const fm = current ? page(current).fm : page(fs.readFileSync(within(root, `${pending}/${file}`), 'utf8')).fm;
        const { body, ...text } = op.translation as Parameters<typeof proseFingerprint>[0];
        for (const key of ['seoTitle', 'seoDescription', 'reasons']) delete fm[key];
        const next = {
          ...fm,
          ...text,
          status: 'published',
          translation: { sourceLocale: item.sourceLocale, sourceHash: item.sourceHash, reviewStatus: 'reviewed' },
        };
        changes.set(file, `---\n${YAML.stringify(next)}---\n\n${body.trim()}\n`);
      } else {
        if (
          !field ||
          JSON.stringify(op.targetField) !== JSON.stringify(field.targetField) ||
          JSON.stringify(op.sourceField) !== JSON.stringify(field.sourceField)
        )
          throw new Error('Field path conflict');
        const doc = YAML.parseDocument(current!);
        doc.setIn(op.targetField, op.translation);
        changes.set(file, doc.toString());
      }
    }
    const allowed = new Set([...report.items.map((item) => item.key), ...report.fields.map((field) => field.key)]);
    for (const record of approvals.records) {
      const item = report.items.find((item) => item.key === record.key);
      const field = report.fields.find((field) => field.key === record.key);
      const operation = manifest.operations.find((operation) => operation.key === record.key);
      const sourceHash = item?.sourceFingerprint ?? field?.sourceHash;
      const targetHash = operation?.candidateHash ?? item?.targetHash ?? field?.targetHash;
      if (
        !allowed.has(record.key) ||
        Date.parse(record.completedAt) > Date.now() ||
        record.sourceHash !== sourceHash ||
        record.targetHash !== targetHash
      )
        throw new Error('Invalid approval key, fingerprints or future review time');
      if (!existing.records.some((old) => fingerprint(old) === fingerprint(record))) existing.records.push(record);
    }
    const reviewText = JSON.stringify(existing, null, 2) + '\n';
    if (reviewText !== previous) changes.set(reviewFile, reviewText);
    if (!changes.size) return { changes: [] };
    staging = within(root, `.artifacts/localization/${locale}/promote-${randomUUID()}`);
    for (const dir of ['content', 'src/i18n/messages', 'production/localization']) {
      if (fs.existsSync(within(root, dir)))
        fs.cpSync(within(root, dir), within(staging, dir), { recursive: true, dereference: false });
    }
    for (const [file, text] of changes) atomicWrite(within(staging, file), text);
    const validate = (candidateRoot: string) => {
      const snapshot = readLocalizationSnapshot(candidateRoot, { mediaRoot: path.join(root, 'public') });
      if (snapshot.findings.blocking) throw new Error('Candidate content validation failed');
      const candidate = analyzeLocale(snapshot, locale);
      const changedKeys = new Set(batch.operations.map((operation) => operation.key));
      for (const item of candidate.items)
        if (
          item.declaredStatus === 'published' &&
          item.dependencies.some((key) => changedKeys.has(key)) &&
          item.localStatus !== 'current'
        )
          throw new Error(`Affected published consumer is not ready: ${item.key}`);
      for (const op of batch.operations) {
        const field = candidate.fields.find((field) => field.key === op.key);
        if (field && reviewState(field.key, field.sourceHash, field.targetHash, existing.records) !== 'current')
          throw new Error(`Effective field approval is not current: ${op.key}`);
        const item = candidate.items.find((item) => item.key === op.key);
        if (item && item.localStatus !== 'current')
          throw new Error(`Candidate dependencies are not approved: ${op.key}`);
      }
      for (const entry of snapshot.config.locales.filter((entry) => entry.enabled))
        if (!analyzeLocale(snapshot, entry.code).ready)
          throw new Error(`Enabled locale release gate failed: ${entry.code}`);
    };
    validate(staging);
    const result = { changes: [...changes].map(([file, after]) => ({ file, after })) };
    for (const [file, expected] of before) {
      const actual = fs.existsSync(within(root, file)) ? fs.readFileSync(within(root, file), 'utf8') : null;
      if (actual !== expected) throw new Error(`Concurrent file conflict: ${file}`);
    }
    if (apply)
      await applyChanges(
        root,
        path.join(root, '.artifacts/localization', locale, 'transactions', `${randomUUID()}.json`),
        result.changes,
        () => validate(root),
      );
    return result;
  } finally {
    if (staging) fs.rmSync(staging, { recursive: true, force: true });
    release();
  }
}
