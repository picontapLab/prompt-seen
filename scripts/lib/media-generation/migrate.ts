import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { buildStagedContent } from './content';
import { atomicWrite, filesUnder, hashFile, locked, paths, readJson, within, writeJson } from './files';
import { readState, saveState } from './jobs';
import { assertBaseline, readManifest } from './manifest';
import { applyChanges, rollbackChanges, type Change } from './transaction';
import { publicContent, verifyAssets, verifyPublishedContracts } from './verify';

function buildContent(root: string) {
  const env = { ...process.env, CONTENT_DIR: path.join(root, 'content'), MEDIA_BASE_URL: '', BUILD_MODE: 'preview' };
  for (const file of ['scripts/config-gen.ts', 'scripts/content-build.ts'])
    execFileSync(process.execPath, ['--import', 'tsx', file], { cwd: root, env, stdio: 'pipe' });
}
export async function applyMigration(root: string, { id = 'gpt-image-v1', dryRun = false, offline = false } = {}) {
  const p = paths(root, id);
  return locked(p, async () => {
    const manifest = readManifest(root, id);
    const journal = path.join(p.dir, 'apply-journal.json');
    if (fs.existsSync(journal)) {
      const saved = readJson(journal) as { phase: string; entries: { file: string; after: string | null }[] };
      if (saved.phase === 'applying' || saved.phase === 'applied') {
        if (dryRun) return { status: saved.phase, changes: saved.entries.map((e) => ({ file: e.file })) };
        if (!offline) throw new Error('Stop watchers, then pass --offline to resume application');
        await verifyAssets(root, id, 'prepared');
        await applyChanges(
          root,
          journal,
          saved.entries.map((e) => ({
            file: e.file,
            after: e.after === null ? null : Buffer.from(e.after, 'base64').toString('utf8'),
          })),
          () => {
            publicContent(root);
            verifyPublishedContracts(root, id);
            buildContent(root);
          },
        );
        for (const job of manifest.jobs) saveState(p, job, { ...readState(p, job), status: 'applied' });
        return { status: 'applied', resumed: true };
      }
    }
    if (!manifest.jobs.every((j) => readState(p, j).status === 'prepared'))
      throw new Error('All 101 jobs must be prepared before applying');
    if (!fs.existsSync(path.join(p.dir, 'pilot.json'))) throw new Error('Pilot review is required');
    assertBaseline(root, manifest);
    await verifyAssets(root, id, 'prepared');
    for (const job of manifest.jobs)
      for (const relative of [
        `content/media/${job.newAssetId}.yaml`,
        `content/examples/${job.newExampleId}/run.yaml`,
      ]) {
        if (fs.existsSync(within(root, relative))) throw new Error(`Reserved ID occupied: ${relative}`);
      }
    const { dir } = buildStagedContent(root, id);
    const changes: Change[] = [];
    const stageFiles = filesUnder(dir);
    const currentFiles = filesUnder(path.join(root, 'content'));
    for (const relative of [
      ...new Set([
        ...stageFiles.map((f) => path.relative(dir, f)),
        ...currentFiles.map((f) => path.relative(path.join(root, 'content'), f)),
      ]),
    ].sort()) {
      const staged = within(dir, relative);
      const current = within(root, `content/${relative}`);
      const after = fs.existsSync(staged) ? fs.readFileSync(staged, 'utf8') : null;
      if ((fs.existsSync(current) ? fs.readFileSync(current, 'utf8') : null) !== after)
        changes.push({ file: `content/${relative}`, after });
    }
    const editorial = path.join(p.dir, 'editorial.json');
    if (fs.existsSync(editorial)) {
      const entries = readJson(editorial) as Change[];
      for (const entry of entries) {
        if (!manifest.baseline.files[entry.file] || typeof entry.after !== 'string')
          throw new Error(`Editorial file is not in baseline: ${entry.file}`);
        const existing = changes.find((c) => c.file === entry.file);
        if (existing) existing.after = entry.after;
        else changes.push(entry);
      }
    }
    if (dryRun)
      return {
        status: 'dry-run',
        changes: changes.map((c) => ({
          file: c.file,
          action: c.after === null ? 'remove' : fs.existsSync(within(root, c.file)) ? 'modify' : 'create',
        })),
      };
    if (!offline) throw new Error('Stop content/dev watchers, then pass --offline to apply');
    for (const relative of Object.keys(manifest.baseline.files).filter((f) => f.startsWith('content/examples/'))) {
      const dest = within(p.dir, `archive/${relative}`);
      if (fs.existsSync(dest) && hashFile(dest) !== manifest.baseline.files[relative])
        throw new Error(`Archive already differs: ${relative}`);
      atomicWrite(dest, fs.readFileSync(within(root, relative)));
    }
    await applyChanges(root, journal, changes, () => {
      publicContent(root);
      verifyPublishedContracts(root, id);
      buildContent(root);
    });
    for (const job of manifest.jobs) saveState(p, job, { ...readState(p, job), status: 'applied' });
    writeJson(path.join(p.dir, 'report.json'), { status: 'incomplete', reason: 'Applied; final acceptance remains' });
    return { status: 'applied', changedFiles: changes.length };
  });
}
export async function rollbackMigration(root: string, id = 'gpt-image-v1') {
  const p = paths(root, id);
  return locked(p, async () => {
    await rollbackChanges(root, path.join(p.dir, 'apply-journal.json'));
    const manifest = readManifest(root, id);
    for (const job of manifest.jobs)
      if (readState(p, job).status === 'applied') saveState(p, job, { ...readState(p, job), status: 'prepared' });
    buildContent(root);
    writeJson(path.join(p.dir, 'report.json'), { status: 'rolled_back', at: new Date().toISOString() });
    return { status: 'rolled_back' };
  });
}
