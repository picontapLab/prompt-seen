import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';

const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, '../..');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const yaml = (file) => YAML.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const mapping = read(path.join(base, 'content-map.json'));
const originals = read(path.join(base, 'sources/manifest-v3.json'));
for (const source of originals) assert.equal(hash(fs.readFileSync(path.join(root, source.promptFile))), source.sha256);
let attemptsVerified = 0;
for (const item of mapping.flatMap((c) => c.units)) {
  let expected = fs.readFileSync(path.join(root, item.sourcePrompt), 'utf8');
  const valuesPath = path.join(base, 'sources', item.unitId, 'values.json');
  for (const [before, after] of Object.entries(fs.existsSync(valuesPath) ? read(valuesPath) : {}))
    expected = expected.replaceAll(before, after);
  for (const attempt of item.attempts) {
    assert.equal(read(path.join(root, attempt.audit)).definition.prompt, expected);
    attemptsVerified++;
  }
}
const referenceDirectories = fs.readdirSync(path.join(base, 'references'));
for (const name of referenceDirectories) {
  const folder = path.join(base, 'references', name);
  const audit = read(path.join(folder, 'audit.json'));
  assert.equal(hash(fs.readFileSync(path.join(folder, 'output.png'))), audit.outputSha256);
  assert.equal(hash(read(path.join(folder, 'definition.json')).prompt), audit.promptSha256);
  for (const ref of audit.references) assert.equal(hash(fs.readFileSync(ref.path)), ref.sha256);
}
let checked = 0;
for (const item of mapping.flatMap((c) => c.units).filter((unit) => unit.status === 'accepted')) {
  const audit = read(path.join(root, item.audit));
  const entry = yaml(`content/prompts/${item.ids.prompt}/entry.yaml`);
  const run = yaml(`content/examples/${item.ids.example}/run.yaml`);
  const submitted = audit.definition.prompt;
  const source = fs.readFileSync(path.join(root, item.sourcePrompt), 'utf8');
  const valuesPath = path.join(base, 'sources', item.unitId, 'values.json');
  const values = fs.existsSync(valuesPath) ? read(valuesPath) : {};
  let expected = source;
  for (const [before, after] of Object.entries(values)) expected = expected.replaceAll(before, after);
  assert.equal(submitted, expected);
  for (const file of [
    `content/prompts/${item.ids.prompt}/prompt.txt`,
    `content/examples/${item.ids.example}/prompt.txt`,
  ]) {
    assert.equal(fs.readFileSync(path.join(root, file), 'utf8').trim(), submitted);
  }
  assert.equal(run.promptSha256, hash(submitted));
  assert.equal(entry.promptSource.language, item.sourceLanguage);
  assert.equal(run.promptLanguage, item.sourceLanguage);
  assert.equal(entry.promptProvenance, 'source-prompt');
  assert.deepEqual(entry.source, {
    author: entry.inspirationSources[0].author,
    url: entry.inspirationSources[0].url,
    license: null,
  });
  assert.equal(run.model.providerModelId, null);
  assert.equal(fs.existsSync(path.join(root, `content/prompts/${item.ids.prompt}/prompt-locales`)), false);
  assert.deepEqual(
    run.referenceBindings,
    audit.references.map((r, referenceIndex) => ({ slotId: r.slotId, referenceIndex })),
  );
  const mediaIds = [...run.outputAssetIds, ...run.referenceAssetIds];
  const hashes = [audit.receipt.output.sha256, ...audit.references.map((r) => r.sha256)];
  mediaIds.forEach((id, i) => {
    const asset = yaml(`content/media/${id}.yaml`);
    assert.equal(hash(fs.readFileSync(path.join(root, 'public', asset.original.key))), hashes[i]);
  });
  checked++;
}
const collection = yaml('content/collections/c_013/entry.yaml');
assert.equal(collection.items.length, checked);
assert.deepEqual(
  new Set(collection.items),
  new Set(
    mapping
      .flatMap((c) => c.units)
      .filter((u) => u.ids)
      .map((u) => u.ids.prompt),
  ),
);
for (const id of ['p_221', 'p_228', 'p_232']) {
  const file = `content/prompts/${id}/prompt.txt`;
  assert.deepEqual(
    fs.readFileSync(path.join(root, file)),
    execFileSync('git', ['show', `HEAD:${file}`], { cwd: root }),
  );
}
const result = {
  sourceBodiesVerified: originals.length,
  originalAttemptsVerified: attemptsVerified,
  referenceFilesVerified: referenceDirectories.length,
  importedOutputsVerified: checked,
  originalMediaAndOrderedInputHashesMatch: true,
  originalAuthorAttributionAndUnknownLicenseVerified: true,
  priorSourceRelatedPromptsUnchanged: ['p_221', 'p_228', 'p_232'],
};
fs.writeFileSync(path.join(base, 'audit/import-integrity.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
