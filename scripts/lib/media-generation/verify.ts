import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import { loadConfig } from '../../../src/config/load';
import { createUrlModule, urlConfigOf } from '../../../src/modules/url/create';
import { loadContent } from '../content/load';
import { normalizePrompt } from '../content/read';
import { exampleRunSchema, mediaSchema, promptEntrySchema } from '../content/schemas';
import { preparedContentSchema, validateStaged } from './content';
import { digest, filesUnder, hashFile, paths, readJson, within, writeJson } from './files';
import { describeArtifact, readAttempt, readState } from './jobs';
import { promptOf, readManifest } from './manifest';

export function publicContent(root: string) {
  return (['production', 'preview'] as const).map((mode) => {
    const config = loadConfig(root, { BUILD_MODE: mode });
    const loaded = loadContent({
      root,
      dir: path.join(root, 'content'),
      config,
      url: createUrlModule(urlConfigOf(config)),
      mediaRoot: path.join(root, 'public'),
    });
    if (!loaded.built)
      throw new Error(
        loaded.findings.list
          .filter((f) => ['error', 'publish'].includes(f.level))
          .map((f) => `${f.file}: ${f.message}`)
          .join('\n'),
      );
    return { mode, ...loaded };
  });
}
function assetReferences(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(assetReferences);
  return Object.entries(value).flatMap(([key, v]) =>
    key === 'assetId' && typeof v === 'string' ? [v] : assetReferences(v),
  );
}
export async function verifyAssets(root: string, id = 'gpt-image-v1', scope: 'pilot' | 'final' | 'prepared' = 'final') {
  const p = paths(root, id);
  const manifest = readManifest(root, id);
  const selected =
    scope === 'prepared'
      ? manifest.jobs.filter((j) => ['prepared', 'applied'].includes(readState(p, j).status))
      : scope === 'pilot'
        ? manifest.jobs.filter((j) => manifest.policy.pilot.includes(j.id))
        : manifest.jobs;
  for (const job of selected) {
    const state = readState(p, job);
    if (!(scope !== 'final' ? ['prepared', 'applied'] : ['applied']).includes(state.status))
      throw new Error(`${job.id}: ${state.status}, expected ${scope === 'pilot' ? 'prepared' : 'applied'}`);
    if (!state.generationReview || !state.displayReview || !state.selectedAttemptId)
      throw new Error(`Missing review evidence: ${job.id}`);
    for (const hash of [state.generationReview, state.displayReview]) {
      const evidence = readJson(within(p.dir, `jobs/${job.id}/reviews/${hash}.json`));
      if (digest(JSON.stringify(evidence)) !== hash) throw new Error(`Review evidence changed: ${job.id}`);
    }
    const display = readJson(within(p.dir, `jobs/${job.id}/reviews/${state.displayReview}.json`)) as {
      phase: string;
      attemptId: string;
      contentHash: string;
      artifacts: Record<string, string>;
    };
    if (
      display.phase !== 'display' ||
      display.attemptId !== state.selectedAttemptId ||
      display.contentHash !== state.contentHash
    )
      throw new Error(`Display approval changed: ${job.id}`);
    if (scope !== 'final' && state.status !== 'applied') {
      const contentFile = within(p.artifacts, `jobs/${job.id}/content.json`);
      if (!fs.existsSync(contentFile) || hashFile(contentFile) !== state.contentHash)
        throw new Error(`Prepared content changed: ${job.id}`);
    }
    for (const artifact of state.artifacts) {
      if (display.artifacts[artifact.file] !== artifact.sha256)
        throw new Error(`Artifact approval mismatch: ${artifact.file}`);
      const actual = await describeArtifact(root, within(root, artifact.file));
      if (JSON.stringify(actual) !== JSON.stringify(artifact)) throw new Error(`Artifact changed: ${artifact.file}`);
    }
    const attempt = readAttempt(p, job, state.selectedAttemptId);
    if (attempt.promptSha256 !== job.promptSha256 || attempt.receipt?.outcome !== 'success')
      throw new Error(`Invalid generation evidence: ${job.id}`);
  }
  if (scope === 'prepared') return { checked: selected.length };
  if (scope === 'pilot') {
    validateStaged(root, id);
    return { checked: selected.length };
  }
  return verifyPublishedContracts(root, id);
}
export function verifyPublishedContracts(root: string, id = 'gpt-image-v1') {
  const p = paths(root, id);
  const manifest = readManifest(root, id);
  const selected = manifest.jobs;
  const oldIds = new Set(manifest.jobs.map((j) => j.id));
  const oldRuns = new Set(manifest.jobs.flatMap((j) => j.sourceExampleIds));
  for (const job of manifest.jobs) {
    const dir = within(root, `content/examples/${job.newExampleId}`);
    const run = exampleRunSchema.parse(YAML.parse(fs.readFileSync(path.join(dir, 'run.yaml'), 'utf8')));
    if (
      run.promptSha256 !== job.promptSha256 ||
      (job.promptLanguage !== undefined && run.promptLanguage !== job.promptLanguage) ||
      normalizePrompt(fs.readFileSync(path.join(dir, 'prompt.txt'), 'utf8')) !== promptOf(root, job) ||
      run.outputAssetIds.length !== 1 ||
      run.outputAssetIds[0] !== job.newAssetId ||
      run.provider !== 'OpenAI'
    )
      throw new Error(`Run/asset mismatch: ${job.id}`);
    const media = mediaSchema.parse(
      YAML.parse(fs.readFileSync(within(root, `content/media/${job.newAssetId}.yaml`), 'utf8')),
    );
    const state = readState(p, job);
    const attempt = readAttempt(p, job, state.selectedAttemptId!);
    const receipt = attempt.receipt!;
    const expectedModel = {
      displayName: receipt.model.displayName ?? 'GPT Image',
      providerModelId: receipt.model.providerModelId,
    };
    if (
      JSON.stringify(run.model) !== JSON.stringify(expectedModel) ||
      JSON.stringify(run.parameters) !== JSON.stringify(receipt.parameters) ||
      run.promptId !== job.promptId ||
      JSON.stringify(run.template) !== JSON.stringify(job.template)
    )
      throw new Error(`Run metadata differs from receipt: ${job.id}`);
    const promptEntry = job.promptId
      ? promptEntrySchema.parse(
          YAML.parse(fs.readFileSync(within(root, `content/prompts/${job.promptId}/entry.yaml`), 'utf8')),
        )
      : null;
    const canonical = preparedContentSchema.parse({ media, run, promptEntry, prompt: promptOf(root, job) });
    if (digest(JSON.stringify(canonical, null, 2) + '\n') !== state.contentHash)
      throw new Error(`Published content differs from display approval: ${job.id}`);
    if (media.provenance.digitalSourceType !== 'trainedAlgorithmicMedia')
      throw new Error(`Incorrect provenance: ${job.id}`);
    if (`sha256:${hashFile(within(root, `public/${media.original.key}`))}` !== media.contentHash)
      throw new Error(`Mother hash mismatch: ${job.id}`);
  }
  for (const oldId of oldRuns) {
    if (fs.existsSync(within(root, `content/examples/${oldId}`)))
      throw new Error(`Sample run remains active: ${oldId}`);
    for (const name of ['run.yaml', 'prompt.txt']) {
      const relative = `content/examples/${oldId}/${name}`;
      if (hashFile(within(p.dir, `archive/${relative}`)) !== manifest.baseline.files[relative])
        throw new Error(`Archive mismatch: ${relative}`);
    }
  }
  const modes = publicContent(root);
  for (const { mode, built } of modes) {
    for (const model of built!.details)
      for (const assetId of assetReferences(model))
        if (oldIds.has(assetId)) throw new Error(`Old asset in ${mode} output: ${assetId}`);
    for (const [code, index] of built!.locales) {
      const visible = [...index.prompts, ...index.templates, ...index.collections, ...index.pages]
        .map((entry) => entry.path)
        .sort();
      if (JSON.stringify(visible) !== JSON.stringify(manifest.baseline.visible[`${mode}/${code}`]))
        throw new Error(`Published addresses changed: ${mode}/${code}`);
    }
  }
  return {
    checked: selected.length,
    promptRuns: selected.filter((j) => j.promptId).length,
    templateRuns: selected.filter((j) => j.template).length,
    reviewedAnnotations: selected.reduce((sum, j) => sum + j.annotationCount, 0),
    annotatedPrompts: selected.filter((j) => j.annotationCount).length,
    archivedRuns: oldRuns.size,
    activeLegacyRuns: 0,
    legacyAssetReferences: 0,
    modes: modes.map((r) => r.mode),
  };
}
const evidenceSchema = z.object({
  reviewer: z.string().min(1),
  checks: z.record(z.string(), z.boolean()),
  executions: z.record(z.string(), z.unknown()).optional(),
  screenshots: z.array(z.object({ file: z.string(), sha256: z.string() })).min(2),
  firstScreen: z
    .array(
      z.object({
        page: z.enum(['home', 'gallery', 'detail']),
        viewport: z.enum(['desktop', 'mobile']),
        imageBytes: z.number().nonnegative(),
      }),
    )
    .default([]),
});
export async function verifyMigration(root: string, scope: 'pilot' | 'final', id = 'gpt-image-v1') {
  const p = paths(root, id);
  try {
    const assets = await verifyAssets(root, id, scope);
    const evidence = evidenceSchema.parse(
      readJson(path.join(p.dir, scope === 'pilot' ? 'pilot-review.json' : 'acceptance.json')),
    );
    const required =
      scope === 'pilot'
        ? ['desktop', 'mobile', 'template', 'annotations']
        : [
            'unit',
            'typecheck',
            'lint',
            'contentValidation',
            'previewBuild',
            'productionBuild',
            'e2e',
            'visualAll',
            'annotations',
            'rollback',
          ];
    for (const key of required) if (evidence.checks[key] !== true) throw new Error(`Missing acceptance check: ${key}`);
    for (const shot of evidence.screenshots)
      if (hashFile(within(root, shot.file)) !== shot.sha256) throw new Error(`Screenshot changed: ${shot.file}`);
    if (scope === 'final')
      for (const page of ['home', 'gallery', 'detail'])
        for (const viewport of ['desktop', 'mobile']) {
          const measurement = evidence.firstScreen.find((r) => r.page === page && r.viewport === viewport);
          if (!measurement || measurement.imageBytes > 600 * 1024)
            throw new Error(`Missing or exceeded first-screen budget: ${page}/${viewport}`);
        }
    const report = {
      status: scope === 'pilot' ? 'pilot-complete' : 'complete',
      verifiedAt: new Date().toISOString(),
      ...assets,
      evidence,
      ...(scope === 'final' ? { jobs: manifestReport(root, id), usage: null, cost: null } : {}),
    };
    writeJson(path.join(p.dir, scope === 'pilot' ? 'pilot.json' : 'report.json'), report);
    return report;
  } catch (error) {
    if (scope === 'final')
      writeJson(path.join(p.dir, 'report.json'), { status: 'incomplete', reason: (error as Error).message });
    throw error;
  }
}

function manifestReport(root: string, id: string) {
  const p = paths(root, id);
  const historical = filesUnder(path.join(p.dir, 'archive/revisions')).filter((f) => /\/attempts\/\d+\.json$/.test(f));
  return readManifest(root, id).jobs.map((job) => {
    const state = readState(p, job);
    const attempts = new Map<string, unknown>();
    for (const file of [
      ...historical.filter((f) => f.includes(`/jobs/${job.id}/`)),
      ...filesUnder(within(p.dir, `jobs/${job.id}/attempts`)).filter((f) => /\/\d+\.json$/.test(f)),
    ]) {
      const attempt = readJson(file) as { claimToken: string };
      attempts.set(attempt.claimToken, attempt);
    }
    const selected = readAttempt(p, job, state.selectedAttemptId!);
    const media = mediaSchema.parse(
      YAML.parse(fs.readFileSync(within(root, `content/media/${job.newAssetId}.yaml`), 'utf8')),
    );
    return {
      oldAssetId: job.id,
      newAssetId: job.newAssetId,
      newExampleId: job.newExampleId,
      promptId: job.promptId,
      template: job.template,
      promptSha256: job.promptSha256,
      selectedAttemptId: state.selectedAttemptId,
      attempts: [...attempts.values()],
      recoveryEvents: filesUnder(within(p.dir, `jobs/${job.id}/attempts`))
        .filter((f) => /\.recovery-.*\.json$/.test(f))
        .map((f) => readJson(f)),
      raw: selected.raw,
      artifacts: state.artifacts,
      generationReview: state.generationReview,
      displayReview: state.displayReview,
      contentHash: state.contentHash,
      processing: media.processing,
      generationAssessment: readJson(within(p.dir, `jobs/${job.id}/reviews/${state.generationReview}.json`)),
      displayAssessment: readJson(within(p.dir, `jobs/${job.id}/reviews/${state.displayReview}.json`)),
    };
  });
}
