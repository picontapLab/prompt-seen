import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import YAML from 'yaml';
import { exampleRunSchema, mediaSchema, processingSchema, promptEntrySchema } from '../content/schemas';
import { importMedia } from '../media/import';
import { localStorage } from '../media/storage';
import { buildStagedContent, preparedContentSchema } from './content';
import { atomicWrite, hashFile, locked, paths, readJson, within, writeJson } from './files';
import { checkDimensions, describeArtifact, readAttempt, readState, saveState } from './jobs';
import { assertBaseline, jobOf, promptOf, readManifest } from './manifest';
import { reviewSchema } from './schema';

export const DEFAULT_PROCESSING = processingSchema.parse({
  version: 1,
  thumbnail: { quality: 76, lossless: false },
  card: { quality: 82, lossless: false },
  detail: { quality: 82, lossless: false },
  og: { quality: 84 },
});
export async function prepareJob(root: string, jobId: string, id = 'gpt-image-v1') {
  const p = paths(root, id);
  return locked(p, async () => {
    const manifest = readManifest(root, id);
    assertBaseline(root, manifest);
    const job = jobOf(manifest, jobId);
    const state = readState(p, job);
    if (
      !['accepted', 'processed', 'prepared'].includes(state.status) ||
      !state.selectedAttemptId ||
      !state.generationReview
    )
      throw new Error(`${jobId} needs an accepted generation review`);
    const attempt = readAttempt(p, job, state.selectedAttemptId);
    if (!attempt.raw || !attempt.receipt || !attempt.completedAt) throw new Error('Accepted output is missing');
    checkDimensions(job, attempt.raw);
    const source = within(root, attempt.raw.file);
    if (!fs.existsSync(source) || hashFile(source) !== attempt.raw.sha256)
      throw new Error(`Raw output missing or changed: ${jobId}`);
    const settings = reviewSchema
      .pick({ alt: true, focalPoint: true, regions: true, processing: true })
      .parse(readJson(within(p.dir, `jobs/${jobId}/settings.json`)));
    const oldMedia = mediaSchema.parse(
      YAML.parse(fs.readFileSync(within(root, `content/media/${jobId}.yaml`), 'utf8')),
    );
    const alt = settings.alt ?? oldMedia.alt;
    for (const locale of job.requiredAltLocales)
      if (!alt[locale]?.trim()) throw new Error(`Missing alt.${locale}: ${jobId}`);
    if (job.annotationCount && settings.regions?.length !== job.annotationCount)
      throw new Error(`Provide all ${job.annotationCount} new annotation regions: ${jobId}`);
    const input = fs.readFileSync(source);
    const meta = await sharp(input).metadata();
    // A GIF is the model's original animation, not a single frame to normalize.
    const candidate =
      meta.format === 'gif'
        ? input
        : await sharp(input).autoOrient().toColourspace('srgb').webp({ lossless: true, effort: 5 }).toBuffer();
    // Source retention is safe only when its decoded sRGB pixels already match the normalized mother.
    const pixels = await sharp(input).autoOrient().toColourspace('srgb').ensureAlpha().raw().toBuffer();
    const retainedPixels = await sharp(input).ensureAlpha().raw().toBuffer();
    const retain =
      meta.format === 'gif' ||
      (input.length < candidate.length &&
        (!meta.orientation || meta.orientation === 1) &&
        (!meta.space || meta.space === 'srgb') &&
        pixels.equals(retainedPixels));
    const mother = retain ? input : candidate;
    const extension = retain ? (attempt.raw.format === 'jpeg' ? 'jpg' : attempt.raw.format) : 'webp';
    const motherPath = within(p.artifacts, `jobs/${jobId}/mother.${extension}`);
    atomicWrite(motherPath, mother);
    const outputDir = within(p.artifacts, `jobs/${jobId}/content`);
    fs.rmSync(path.join(outputDir, 'media'), { recursive: true, force: true });
    const media = await importMedia({
      dir: outputDir,
      storage: localStorage(path.join(root, 'public')),
      input: mother,
      slug: job.slug,
      id: job.newAssetId,
      force: true,
      metadata: {
        alt,
        focalPoint: settings.focalPoint,
        processing:
          settings.processing === undefined ? DEFAULT_PROCESSING : processingSchema.parse(settings.processing),
        credit: {
          ...oldMedia.credit,
          creator: 'Prompt Seen',
          creditText: 'Prompt Seen · GPT Image',
          copyrightNotice: null,
          sourceUrl: null,
        },
        provenance: { digitalSourceType: 'trainedAlgorithmicMedia', contentCredentials: 'unknown' },
      },
    });
    const model = {
      displayName: attempt.receipt.model.displayName ?? 'GPT Image',
      providerModelId: attempt.receipt.model.providerModelId,
    };
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(attempt.completedAt));
    const run = exampleRunSchema.parse({
      id: job.newExampleId,
      promptId: job.promptId,
      template: job.template,
      promptSha256: job.promptSha256,
      referenceAssetIds: [],
      outputAssetIds: [media.id],
      provider: 'OpenAI',
      model,
      recordedAt: date,
      parameters: attempt.receipt.parameters,
      notes: {},
    });
    let promptEntry = null;
    if (job.promptId) {
      const original = promptEntrySchema.parse(
        YAML.parse(fs.readFileSync(within(root, `content/prompts/${job.promptId}/entry.yaml`), 'utf8')),
      );
      promptEntry = promptEntrySchema.parse({
        ...original,
        coverAssetId: media.id,
        model: { ...model, verification: 'verified' },
        updatedAt: date,
        annotations: original.annotations.map((annotation, index) => ({
          ...annotation,
          region: settings.regions![index],
        })),
      });
    }
    const content = preparedContentSchema.parse({ media, run, promptEntry, prompt: promptOf(root, job) });
    const contentFile = within(p.artifacts, `jobs/${jobId}/content.json`);
    writeJson(contentFile, content);
    const artifacts = await Promise.all(
      [media.original.key, ...Object.values(media.variants).map((v) => v.key)].map((key) =>
        describeArtifact(root, within(root, `public/${key}`)),
      ),
    );
    const updated = {
      ...state,
      status: 'processed' as const,
      artifacts,
      contentHash: hashFile(contentFile),
      displayReview: null,
    };
    saveState(p, job, updated);
    buildStagedContent(root, id);
    return updated;
  });
}
