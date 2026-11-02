import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import YAML from 'yaml';
import { renderTemplate } from '../src/modules/template/render';
import { toFieldSpec } from './lib/content/rules';
import { templateContractHash } from './lib/content/template-contract';

// Campaign-specific regression guard. Run from repository root with node --import tsx.
// It deliberately uses committed audit snapshots and public originals, not ignored tool caches.
const base = 'production/design-ai-top60-2026-10';
const read = (file: string) => fs.readFileSync(file, 'utf8');
const yaml = (file: string) => YAML.parse(read(file));
const json = (file: string) => JSON.parse(read(file));
const sha = (value: string | Buffer) => crypto.createHash('sha256').update(value).digest('hex');
const jobs = fs.readdirSync(`${base}/audit`).map((file) => json(`${base}/audit/${file}`));
const hashAsset = (id: string) => {
  const media = yaml(`content/media/${id}.yaml`);
  const hash = sha(fs.readFileSync(`public/${media.original.key}`));
  assert.equal(media.contentHash, `sha256:${hash}`, `${id}: original was modified`);
  for (const variant of Object.values(media.variants) as { key: string }[])
    assert.ok(fs.existsSync(`public/${variant.key}`), `${id}: missing variant`);
  return hash;
};
const checkRun = (id: string, pid: string) => {
  const run = yaml(`content/examples/${id}/run.yaml`);
  const prompt = read(`content/examples/${id}/prompt.txt`).trim();
  assert.equal(run.promptId, pid);
  assert.equal(run.promptSha256, sha(prompt));
  const outputHash = hashAsset(run.outputAssetIds[0]);
  const matching = jobs.filter((j) => j.receipt?.output.sha256 === outputHash && j.definition.prompt === prompt);
  assert.equal(matching.length, 1, `${id}: no unique actual generation receipt`);
  const job = matching[0];
  assert.equal(job.status, 'accepted');
  assert.equal(job.review?.accepted, true);
  assert.equal(run.referenceAssetIds.length, job.references.length);
  run.referenceAssetIds.forEach((assetId: string, index: number) => {
    assert.equal(hashAsset(assetId), job.references[index].sha256, `${id}: reference order changed`);
    assert.ok(
      run.referenceBindings.some(
        (binding: { slotId: string; referenceIndex: number }) =>
          binding.referenceIndex === index && binding.slotId === job.references[index].slotId,
      ),
    );
  });
  if (run.template) {
    const dir = `content/templates/${run.template.id}/versions/${run.template.version}`;
    const body = read(`${dir}/body.txt`).trim();
    const fields = yaml(`${dir}/fields.yaml`).fields;
    const inputs = yaml(`${dir}/inputs.yaml`);
    assert.equal(renderTemplate({ body, fields: fields.map(toFieldSpec) }, run.template.values).text, prompt);
    assert.equal(templateContractHash(body, fields, inputs), run.template.contractHash);
  }
  return {
    jobKey: job.definition.key,
    outputSha256: outputHash,
    promptSha256: sha(prompt),
    referenceAssetIds: run.referenceAssetIds,
  };
};
const cases = json(`${base}/source-cases.json`).filter((c: { rank: number }) => ![15, 16].includes(c.rank));
assert.equal(cases.length, 58);
const entries = cases.map((c: { rank: number; title: string }) => {
  const promptId = `p_${150 + c.rank - (c.rank >= 17 ? 2 : 0)}`;
  const dir = `content/prompts/${promptId}`;
  const entry = yaml(`${dir}/entry.yaml`);
  const run = yaml(`content/examples/${entry.showcaseExampleId}/run.yaml`);
  assert.equal(entry.coverAssetId, run.outputAssetIds[0]);
  const checked = checkRun(entry.showcaseExampleId, promptId);
  if (entry.promptSource.type === 'template') {
    assert.equal(entry.promptSource.templateId, run.template.id);
    assert.deepEqual(entry.promptSource.values, run.template.values);
    assert.ok(!fs.existsSync(`${dir}/prompt.txt`));
  } else assert.equal(read(`${dir}/prompt.txt`).trim(), read(`content/examples/${run.id}/prompt.txt`).trim());
  for (const locale of ['en', 'zh-Hans']) assert.match(read(`${dir}/locales/${locale}.mdx`), /status: published/);
  return {
    rank: c.rank,
    title: c.title,
    promptId,
    exampleId: run.id,
    assetId: entry.coverAssetId,
    categoryId: entry.categoryId,
    useCaseIds: entry.useCaseIds,
    templateId: run.template?.id ?? null,
    displayMode:
      c.rank === 42
        ? 'two-step-reference-gallery'
        : run.referenceAssetIds.length
          ? 'reference-output-gallery'
          : entry.categoryId === 'poster'
            ? 'poster-detail-zoom'
            : 'image-detail',
    status: 'generated-and-reviewed',
    ...checked,
  };
});
assert.equal(new Set(entries.map((e: { assetId: string }) => e.assetId)).size, 58);
assert.equal(new Set(entries.map((e: { outputSha256: string }) => e.outputSha256)).size, 58, 'Repeated image bytes');
const reverse = { exampleId: 'x_271', ...checkRun('x_271', 'p_190') };
assert.ok(!entries.some((e: { outputSha256: string }) => e.outputSha256 === reverse.outputSha256));
for (let n = 285; n <= 290; n++) {
  assert.ok(!fs.existsSync(`content/media/a_${n}.yaml`));
  assert.ok(!fs.existsSync(`public/media/a_${n}`));
}
const report = {
  campaign: 'design-ai-top60-2026-10',
  scope: '58 static cases; source ranks 15 and 16 excluded',
  auditedAt: new Date().toISOString(),
  counts: {
    cases: 58,
    uniqueShowcaseImages: 58,
    generatedRuns: 59,
    templateBackedCases: entries.filter((e: { templateId: string | null }) => e.templateId).length,
    referenceBasedCases: entries.filter((e: { referenceAssetIds: string[] }) => e.referenceAssetIds.length).length,
  },
  entries,
  reverseStep: reverse,
};
for (const file of ['manifest.json', 'content-map.json', 'audit-results.json'])
  fs.writeFileSync(`${base}/${file}`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.counts));
console.log(
  'PASS: output uniqueness, byte hashes, actual prompts, references, template defaults, accepted reviews and published locales.',
);
