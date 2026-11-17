/** Apply independently reviewed values; never manufacture approval records. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fingerprint, proseFingerprint } from '../../../scripts/lib/localization/fingerprint.ts';
import { reviewSchema } from '../../../scripts/lib/localization/check.ts';
const base = 'production/localization/zh-Hant/';
if (fs.existsSync(base + 'evidence/promotion.json'))
  throw new Error('Already promoted; create a fresh review plan instead of overwriting approvals.');
const read = (p) => JSON.parse(fs.readFileSync(base + p, 'utf8'));
const write = (p, v) => fs.writeFileSync(base + p, JSON.stringify(v, null, 2) + '\n');
const entries = new Map(),
  records = [],
  overrides = {};
for (const group of ['pages_a', 'pages_b', 'fields']) {
  const input = read(`review/${group}-input.json`),
    review = reviewSchema.parse(read(`review/${group}-reviews.json`));
  Object.assign(overrides, read(`review/${group}-overrides.json`));
  assert.equal(review.records.length, input.entries.length);
  for (const entry of input.entries) {
    assert(!entries.has(entry.key));
    entries.set(entry.key, entry);
  }
  records.push(...review.records);
}
assert.equal(entries.size, 2601);
assert.equal(new Set(records.map((r) => r.key)).size, 2601);
for (const r of records) {
  const e = entries.get(r.key);
  assert(e);
  assert.equal(r.conclusion, 'approved', r.key);
  assert.equal(r.sourceHash, e.sourceHash, r.key);
  const value = overrides[r.key] ?? e.target;
  assert.equal(
    r.targetHash,
    e.targetField ? fingerprint({ field: e.targetField, value }) : proseFingerprint(value),
    r.key,
  );
}
const plan = read('batch-plan.json');
for (const item of plan.batches) {
  const batch = JSON.parse(fs.readFileSync(item.file));
  for (const op of batch.operations) {
    const e = entries.get(op.key);
    assert.equal(op.expectedSourceHash, e.sourceHash);
    op.translation = overrides[op.key] ?? e.target;
  }
  fs.writeFileSync(item.file, JSON.stringify(batch, null, 2) + '\n');
  item.batchId = fingerprint(batch).slice(7);
}
const ui = records.filter((r) => entries.get(r.key).targetFile.startsWith('src/i18n/'));
assert.equal(ui.length, 427);
const catalogs = new Map();
for (const r of ui) {
  const e = entries.get(r.key);
  const doc = catalogs.get(e.targetFile) ?? JSON.parse(fs.readFileSync(e.targetFile));
  let parent = doc;
  for (const part of e.targetField.slice(0, -1)) parent = parent[part];
  parent[e.targetField.at(-1)] = overrides[r.key] ?? e.target;
  catalogs.set(e.targetFile, doc);
}
for (const [file, doc] of catalogs) fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
write('review/approved.json', { schemaVersion: 1, locale: 'zh-Hant', records });
write('reviews.json', { schemaVersion: 1, locale: 'zh-Hant', records: ui });
write('batch-plan.json', plan);
const audit = read('conversion-audit.json');
for (const row of audit.records) {
  const r = records.find((r) => r.key === row.key);
  if (r) {
    row.sourceHash = r.sourceHash;
    row.targetHash = r.targetHash;
    row.reviewEvidence = 'review/approved.json';
  }
}
write('conversion-audit.json', audit);
console.log(
  `Verified ${entries.size} independent approvals and integrated ${Object.keys(overrides).length} corrections.`,
);
