import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import YAML from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { planMigration, rebaseMigration } from './manifest';
import { verifyAssets } from './verify';
import { claimNext, migrationStatus, readAttempt, recordResult, reviewJob } from './jobs';
import { paths } from './files';
import { prepareJob } from './prepare';
import { buildStagedContent } from './content';

const roots: string[] = [];
function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-generation-'));
  roots.push(root);
  fs.cpSync(path.resolve('content'), path.join(root, 'content'), { recursive: true });
  // This migration tests the original corpus, not later editorial additions.
  for (const [kind, limit] of [
    ['prompts', 100],
    ['templates', 3],
    ['collections', 2],
  ] as const)
    for (const name of fs.readdirSync(path.join(root, 'content', kind)))
      if (Number(name.slice(2)) > limit) fs.rmSync(path.join(root, 'content', kind, name), { recursive: true });
  const siteFile = path.join(root, 'content/site.yaml');
  const site = YAML.parse(fs.readFileSync(siteFile, 'utf8'));
  site.home.featured = site.home.featured.filter((item: { prompt: string }) => Number(item.prompt.slice(2)) <= 100);
  site.feed.showcase = site.feed.showcase.filter((item: { lead: string }) => Number(item.lead.slice(2)) <= 100);
  site.feed.interludes = site.feed.interludes.filter((item: { type: string; collection?: string; prompt?: string }) =>
    item.type === 'collection' ? Number(item.collection?.slice(2)) <= 2 : item.type !== 'feature' || Number(item.prompt?.slice(2)) <= 100);
  fs.writeFileSync(siteFile, YAML.stringify(site));
  const journalFile = path.resolve('migrations/gpt-image-v1/apply-journal.json');
  if (fs.existsSync(journalFile)) {
    const journal = JSON.parse(fs.readFileSync(journalFile, 'utf8')) as {
      entries: { file: string; before: string | null }[];
    };
    for (const entry of journal.entries.filter((e) => e.file.startsWith('content/'))) {
      const file = path.join(root, entry.file);
      if (entry.before === null) fs.rmSync(file, { force: true });
      else {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.from(entry.before, 'base64'));
      }
    }
  }
  // Exercise the migration's original sample dataset even after the live corpus is migrated.
  const archivedRuns = path.resolve('migrations/gpt-image-v1/archive/content/examples');
  if (fs.existsSync(archivedRuns)) {
    fs.rmSync(path.join(root, 'content/examples'), { recursive: true });
    fs.cpSync(archivedRuns, path.join(root, 'content/examples'), { recursive: true });
  }
  for (const name of fs.readdirSync(path.join(root, 'content/media')))
    if (Number(name.slice(2, -5)) > 101) fs.rmSync(path.join(root, 'content/media', name));
  for (let i = 1; i <= 100; i++) {
    const suffix = String(i).padStart(3, '0');
    const entryFile = path.join(root, `content/prompts/p_${suffix}/entry.yaml`);
    const entry = YAML.parseDocument(fs.readFileSync(entryFile, 'utf8'));
    entry.set('coverAssetId', `a_${suffix}`);
    fs.writeFileSync(entryFile, entry.toString());
    const snapshot = path.resolve(`migrations/gpt-image-v1/archive/revisions/1/jobs/a_${suffix}/prompt.txt`);
    if (entry.getIn(['promptSource', 'type']) === 'literal' && fs.existsSync(snapshot))
      fs.copyFileSync(snapshot, path.join(root, `content/prompts/p_${suffix}/prompt.txt`));
  }
  for (const name of fs.readdirSync(path.join(root, 'content/examples'))) {
    const run = YAML.parse(fs.readFileSync(path.join(root, 'content/examples', name, 'run.yaml'), 'utf8'));
    if (!run.promptId || !run.template) continue;
    const file = path.join(root, 'content/prompts', run.promptId, 'entry.yaml');
    const doc = YAML.parseDocument(fs.readFileSync(file, 'utf8'));
    doc.set('promptSource', {
      type: 'template',
      templateId: run.template.id,
      version: run.template.version,
      values: run.template.values,
    });
    fs.writeFileSync(file, doc.toString());
  }
  const templateFile = path.join(root, 'content/templates/t_001/entry.yaml');
  const template = YAML.parseDocument(fs.readFileSync(templateFile, 'utf8'));
  template.set('currentVersion', 'v2');
  fs.writeFileSync(templateFile, template.toString());
  fs.rmSync(path.join(root, 'content/templates/t_001/versions/v3'), { recursive: true, force: true });
  for (const name of fs.readdirSync(path.resolve('public/media')))
    if (Number(name.slice(2)) <= 101)
      fs.cpSync(path.resolve('public/media', name), path.join(root, 'public/media', name), { recursive: true });
  return root;
}
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

describe('generation manifest', () => {
  it('preserves historical runs even when they have no Prompt owner', async () => {
    const root = workspace();
    await planMigration(root);
    const file = path.join(root, 'content/examples/x_009/run.yaml');
    const doc = YAML.parseDocument(fs.readFileSync(file, 'utf8'));
    doc.set('provider', 'Changed provider');
    fs.writeFileSync(file, doc.toString());
    await expect(rebaseMigration(root)).rejects.toThrow(/Historical run changed/);
  });
  it('validates editorial content in staging before an application can be planned', async () => {
    const root = workspace();
    await planMigration(root);
    const file = 'content/pages/about/locales/en.mdx';
    const before = fs.readFileSync(path.join(root, file), 'utf8');
    fs.writeFileSync(
      path.join(root, 'migrations/gpt-image-v1/editorial.json'),
      JSON.stringify([{ file, after: before + '\n<UnsupportedComponent />\n' }]),
    );
    expect(() => buildStagedContent(root)).toThrow();
    expect(fs.readFileSync(path.join(root, file), 'utf8')).toBe(before);
  });
  it('snapshots all prompts, including the independent current template default, without reallocating IDs', async () => {
    const root = workspace();
    const manifest = await planMigration(root);
    expect(manifest.jobs).toHaveLength(101);
    expect(manifest.jobs.find((job) => job.id === 'a_010')).toMatchObject({
      promptId: 'p_010',
      template: { id: 't_001', version: 'v1', sample: 'default' },
      newAssetId: 'a_111',
    });
    expect(manifest.jobs.find((job) => job.id === 'a_101')).toMatchObject({
      promptId: null,
      template: { id: 't_001', version: 'v2', sample: 'default' },
      newExampleId: 'x_145',
    });
    expect(await planMigration(root)).toEqual(manifest);
    expect(fs.existsSync(path.join(root, 'content/media/a_102.yaml'))).toBe(false);
  });
  it('revises a literal prompt while preserving historical runs and the prior snapshot', async () => {
    const root = workspace();
    const first = await planMigration(root);
    const job = first.jobs.find((j) => j.id === 'a_018')!;
    const file = path.join(root, 'content/prompts/p_018/prompt.txt');
    fs.appendFileSync(file, '\nUse clear two-dimensional shapes.\n');
    const revised = await rebaseMigration(root);
    expect(revised.jobs.find((j) => j.id === 'a_018')?.promptSha256).not.toBe(job.promptSha256);
    expect(
      fs.readFileSync(path.join(root, 'migrations/gpt-image-v1/archive/revisions/1/jobs/a_018/prompt.txt'), 'utf8'),
    ).not.toContain('clear two-dimensional shapes');
  });
  it('uses the current template owner after a version upgrade and rejects edits to a frozen version', async () => {
    const root = workspace();
    await planMigration(root);
    const base = path.join(root, 'content/templates/t_001/versions');
    fs.cpSync(path.join(base, 'v1'), path.join(base, 'v4'), { recursive: true });
    fs.appendFileSync(path.join(base, 'v4/body.txt'), '\nUse crisp two-dimensional shapes.\n');
    const file = path.join(root, 'content/prompts/p_010/entry.yaml');
    const entry = YAML.parseDocument(fs.readFileSync(file, 'utf8'));
    entry.setIn(['promptSource', 'version'], 'v4');
    fs.writeFileSync(file, entry.toString());
    const revised = await rebaseMigration(root);
    expect(revised.jobs.find((j) => j.id === 'a_010')?.template).toMatchObject({ version: 'v4', sample: null });
    fs.appendFileSync(path.join(base, 'v1/body.txt'), '\nChange the historical output.\n');
    await expect(rebaseMigration(root)).rejects.toThrow(/Frozen template source/);
  });
});

it('requires a separate hash-bound display review after preparing an accepted image', async () => {
  const root = workspace();
  const manifest = await planMigration(root);
  const claim = await claimNext(root);
  if (!claim.claimToken || !claim.jobId || !claim.attemptId) throw new Error('Expected a claim');
  const sourcePath = path.join(root, 'source.png');
  await sharp({ create: { width: 1792, height: 768, channels: 4, background: '#667788' } })
    .png()
    .toFile(sourcePath);
  await recordResult(root, claim.jobId, claim.attemptId, claim.claimToken, { outcome: 'success', sourcePath });
  // Simulate loss of the projected-state write after the completed receipt was persisted.
  const statePath = path.join(root, 'migrations/gpt-image-v1/jobs', claim.jobId, 'state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  fs.writeFileSync(statePath, JSON.stringify({ ...state, status: 'running' }));
  expect(
    (await recordResult(root, claim.jobId, claim.attemptId, claim.claimToken, { outcome: 'success', sourcePath }))
      .status,
  ).toBe('generated');
  const raw = readAttempt(
    paths(root),
    manifest.jobs.find((j) => j.id === claim.jobId)!,
    claim.attemptId,
  ).raw!;
  await reviewJob(root, claim.jobId, {
    phase: 'generation',
    reviewer: 'test reviewer',
    attemptId: claim.attemptId,
    decision: 'accept',
    checks: { subject: true, count: true, text: true, style: true, composition: true, artifacts: true },
    artifacts: { [raw.file]: raw.sha256 },
  });
  const processed = await prepareJob(root, claim.jobId);
  expect(processed.status).toBe('processed');
  expect(processed.artifacts).toHaveLength(5);
  await expect(
    reviewJob(root, claim.jobId, {
      phase: 'display',
      reviewer: 'test reviewer',
      attemptId: claim.attemptId,
      decision: 'accept',
      checks: { card: true, detail: true, mobile: true, alt: true, annotations: true, focus: true },
      contentHash: processed.contentHash!,
      artifacts: {},
    }),
  ).rejects.toThrow(/hash mismatch/);
  expect(migrationStatus(root).jobs.find((j) => j.id === claim.jobId)?.state.status).toBe('processed');
  await reviewJob(root, claim.jobId, {
    phase: 'display',
    reviewer: 'test reviewer',
    attemptId: claim.attemptId,
    decision: 'accept',
    checks: { card: true, detail: true, mobile: true, alt: true, annotations: true, focus: true },
    contentHash: processed.contentHash!,
    artifacts: Object.fromEntries(processed.artifacts.map((a) => [a.file, a.sha256])),
  });
  expect(migrationStatus(root).jobs.find((j) => j.id === claim.jobId)?.state.status).toBe('prepared');
  expect(fs.existsSync(path.join(root, 'content/media/a_119.yaml'))).toBe(false);
  fs.appendFileSync(path.join(root, 'content/prompts/p_002/prompt.txt'), '\nKeep all shapes distinct.\n');
  await rebaseMigration(root);
  expect(migrationStatus(root).jobs.find((j) => j.id === claim.jobId)?.state.status).toBe('prepared');
  const preparedContent = path.join(root, '.artifacts/gpt-image-v1/jobs/a_018/content.json');
  fs.appendFileSync(preparedContent, '\n');
  await expect(verifyAssets(root, 'gpt-image-v1', 'prepared')).rejects.toThrow(/content.*changed/i);
});

describe('generation queue', () => {
  it('persists a claim across restarts and never retries an unknown result automatically', async () => {
    const root = workspace();
    await planMigration(root);
    const first = await claimNext(root);
    expect(first).toMatchObject({ jobId: 'a_018', attemptId: '001' });
    expect(await claimNext(root)).toMatchObject({ reason: 'in-flight' });
    if (!first.claimToken || !first.jobId || !first.attemptId) throw new Error('Expected a claimed job');
    await recordResult(root, first.jobId, first.attemptId, first.claimToken, {
      outcome: 'unknown',
      error: { category: 'unknown', message: 'Connection lost after dispatch' },
    });
    expect(migrationStatus(root).jobs.find((job) => job.id === 'a_018')?.state).toMatchObject({
      status: 'needs_attention',
      attempts: ['001'],
    });
    const next = await claimNext(root);
    expect(next).toMatchObject({ jobId: 'a_045', attemptId: '001' });
    if (!next.jobId || !next.attemptId || !next.claimToken) throw new Error('Expected a claim');
    const receipt = {
      outcome: 'failed' as const,
      error: { category: 'transient' as const, message: 'Transport failed' },
    };
    await recordResult(root, next.jobId, next.attemptId, next.claimToken, receipt);
    const statePath = path.join(root, `migrations/gpt-image-v1/jobs/${next.jobId}/state.json`);
    const projected = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    fs.writeFileSync(statePath, JSON.stringify({ ...projected, status: 'running' }));
    expect((await recordResult(root, next.jobId, next.attemptId, next.claimToken, receipt)).status).toBe('pending');
  });
});
