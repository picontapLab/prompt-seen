import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import { loadConfig } from '../../../src/config/load';
import { createUrlModule, urlConfigOf } from '../../../src/modules/url/create';
import { loadContent } from '../content/load';
import { exampleRunSchema, mediaSchema, promptEntrySchema } from '../content/schemas';
import { atomicWrite, paths, readJson, within } from './files';
import { readState } from './jobs';
import { readManifest } from './manifest';

export const preparedContentSchema = z.object({
  media: mediaSchema,
  run: exampleRunSchema,
  promptEntry: promptEntrySchema.nullable(),
  prompt: z.string(),
});
export function stagedContent(root: string, id = 'gpt-image-v1') {
  return within(paths(root, id).artifacts, 'staged/content');
}
export function buildStagedContent(root: string, id = 'gpt-image-v1') {
  const p = paths(root, id);
  const manifest = readManifest(root, id);
  const dir = stagedContent(root, id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(path.join(root, 'content'), dir, { recursive: true });
  const selected = manifest.jobs.filter((job) =>
    ['processed', 'prepared', 'applied'].includes(readState(p, job).status),
  );
  const map = new Map(selected.map((job) => [job.id, job.newAssetId]));
  for (const job of selected) {
    const data = preparedContentSchema.parse(readJson(within(p.artifacts, `jobs/${job.id}/content.json`)));
    atomicWrite(within(dir, `media/${job.newAssetId}.yaml`), YAML.stringify(data.media, { lineWidth: 0 }));
    atomicWrite(within(dir, `examples/${job.newExampleId}/run.yaml`), YAML.stringify(data.run, { lineWidth: 0 }));
    atomicWrite(within(dir, `examples/${job.newExampleId}/prompt.txt`), `${data.prompt}\n`);
    for (const oldId of job.sourceExampleIds)
      fs.rmSync(within(dir, `examples/${oldId}`), { recursive: true, force: true });
    if (job.promptId && data.promptEntry) {
      const entry = within(dir, `prompts/${job.promptId}/entry.yaml`);
      const doc = YAML.parseDocument(fs.readFileSync(entry, 'utf8'));
      for (const field of ['coverAssetId', 'model', 'annotations', 'updatedAt'] as const)
        doc.set(field, data.promptEntry[field]);
      atomicWrite(entry, doc.toString({ lineWidth: 0 }));
    }
  }
  const figureFiles = new Map<string, typeof manifest.references>();
  for (const reference of manifest.references) {
    const replacement = map.get(reference.assetId);
    if (!replacement) continue;
    const file = within(dir, path.relative('content', reference.file));
    if (reference.field === 'coverAssetId') {
      const doc = YAML.parseDocument(fs.readFileSync(file, 'utf8'));
      doc.set('coverAssetId', replacement);
      atomicWrite(file, doc.toString({ lineWidth: 0 }));
    } else figureFiles.set(file, [...(figureFiles.get(file) ?? []), reference]);
  }
  for (const [file, references] of figureFiles) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const reference of references) {
      if (!reference.line || !lines[reference.line - 1]?.includes('<Figure'))
        throw new Error(`Figure source position changed: ${reference.file}`);
      lines[reference.line - 1] = lines[reference.line - 1]!.replace(
        new RegExp(`(\\basset=)(["'])${reference.assetId}\\2`),
        `$1"${map.get(reference.assetId)}"`,
      );
    }
    atomicWrite(file, lines.join('\n'));
  }
  const editorial = path.join(p.dir, 'editorial.json');
  if (fs.existsSync(editorial)) {
    const entries = z.array(z.object({ file: z.string(), after: z.string() })).parse(readJson(editorial));
    for (const entry of entries) {
      if (!manifest.baseline.files[entry.file]) throw new Error(`Editorial file is not in baseline: ${entry.file}`);
      if (entry.file.startsWith('content/'))
        atomicWrite(within(dir, path.relative('content', entry.file)), entry.after);
      else if (entry.file.endsWith('.json')) JSON.parse(entry.after);
    }
  }
  return validateStaged(root, id);
}
export function validateStaged(root: string, id = 'gpt-image-v1') {
  const dir = stagedContent(root, id);
  const results = [];
  for (const mode of ['production', 'preview'] as const) {
    const config = loadConfig(root, { CONTENT_DIR: dir, BUILD_MODE: mode });
    const result = loadContent({
      root,
      dir,
      config,
      url: createUrlModule(urlConfigOf(config)),
      mediaRoot: path.join(root, 'public'),
    });
    if (!result.built)
      throw new Error(
        result.findings.list
          .filter((f) => ['error', 'publish'].includes(f.level))
          .map((f) => `${f.file}: ${f.message}`)
          .join('\n'),
      );
    results.push({ mode, ...result });
  }
  return { dir, results };
}
