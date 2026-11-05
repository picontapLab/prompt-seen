import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  atomicWrite,
  digest,
  filesUnder,
  hashFile,
  locked,
  paths,
  readJson,
  within,
  writeJson,
  type MigrationPaths,
} from './files';
import { assertBaseline, jobOf, promptOf, readManifest } from './manifest';
import {
  attemptSchema,
  receiptSchema,
  reviewSchema,
  stateSchema,
  type Artifact,
  type Attempt,
  type Job,
  type JobState,
  type Receipt,
  type Review,
} from './schema';

export const stateFile = (p: MigrationPaths, job: Job) => within(p.dir, `jobs/${job.id}/state.json`);
export const attemptFile = (p: MigrationPaths, job: Job, attemptId: string) => {
  if (!/^\d{3}$/.test(attemptId)) throw new Error('Invalid attempt ID');
  return within(p.dir, `jobs/${job.id}/attempts/${attemptId}.json`);
};
export const readState = (p: MigrationPaths, job: Job): JobState => stateSchema.parse(readJson(stateFile(p, job)));
export const saveState = (p: MigrationPaths, job: Job, state: JobState) =>
  writeJson(stateFile(p, job), stateSchema.parse(state));
export const readAttempt = (p: MigrationPaths, job: Job, id: string): Attempt =>
  attemptSchema.parse(readJson(attemptFile(p, job, id)));
function attemptHistory(p: MigrationPaths, job: Job) {
  return filesUnder(p.dir)
    .filter((file) => new RegExp(`/jobs/${job.id}/attempts/\\d{3}\\.json$`).test(file))
    .map((file) => attemptSchema.parse(readJson(file)));
}
function usedAttempts(p: MigrationPaths, job: Job) {
  return new Set(
    attemptHistory(p, job)
      .filter((a) => a.promptSha256 === job.promptSha256)
      .map((a) => a.claimToken),
  ).size;
}
export function migrationStatus(root: string, id = 'gpt-image-v1') {
  const p = paths(root, id);
  const manifest = readManifest(root, id);
  const jobs = manifest.jobs.map((job) => ({ ...job, state: readState(p, job) }));
  return {
    migrationId: id,
    revision: manifest.revision,
    total: jobs.length,
    counts: jobs.reduce<Record<string, number>>((counts, { state }) => {
      counts[state.status] = (counts[state.status] ?? 0) + 1;
      return counts;
    }, {}),
    jobs,
  };
}
export async function claimNext(root: string, id = 'gpt-image-v1') {
  const p = paths(root, id);
  return locked(p, () => {
    const manifest = readManifest(root, id);
    const status = migrationStatus(root, id);
    if (status.jobs.some((job) => job.state.status === 'running')) return { reason: 'in-flight' as const };
    const pilotComplete =
      manifest.policy.pilot.every((id) =>
        status.jobs.some((j) => j.id === id && ['prepared', 'applied'].includes(j.state.status)),
      ) && fs.existsSync(path.join(p.dir, 'pilot.json'));
    const order = pilotComplete ? manifest.jobs : manifest.policy.pilot.map((id) => jobOf(manifest, id));
    const job = order.find((job) => readState(p, job).status === 'pending');
    if (!job)
      return {
        reason: !pilotComplete
          ? ('pilot-review-required' as const)
          : status.jobs.some((j) => j.state.status === 'needs_attention')
            ? ('needs-attention' as const)
            : ('generation-complete' as const),
      };
    assertBaseline(root, manifest);
    const state = readState(p, job);
    if (usedAttempts(p, job) >= manifest.policy.maxAttempts) throw new Error(`${job.id} has exhausted its attempts`);
    const attemptId = String(Math.max(0, ...attemptHistory(p, job).map((a) => Number(a.id))) + 1).padStart(3, '0');
    const claimToken = crypto.randomUUID();
    const attempt: Attempt = {
      id: attemptId,
      claimToken,
      promptSha256: job.promptSha256,
      startedAt: new Date().toISOString(),
      completedAt: null,
      receipt: null,
      raw: null,
      rejected: null,
    };
    writeJson(attemptFile(p, job, attemptId), attempt);
    saveState(p, job, { ...state, status: 'running', reason: null, attempts: [...state.attempts, attemptId] });
    return {
      jobId: job.id,
      attemptId,
      claimToken,
      prompt: promptOf(root, job),
      targetAspectRatio: job.targetAspectRatio,
      outputDirectory: within(p.artifacts, `raw/${job.id}/${attemptId}`),
    };
  });
}
export async function describeArtifact(root: string, file: string): Promise<Artifact> {
  const meta = await sharp(file).metadata();
  if (
    !meta.width ||
    !meta.height ||
    !meta.format ||
    ((meta.pages ?? 1) > 1 && !['gif', 'webp'].includes(meta.format)) ||
    !['png', 'jpeg', 'webp', 'avif', 'gif'].includes(meta.format)
  )
    throw new Error('Expected a readable raster image (animations must be GIF or WebP)');
  return {
    file: path.relative(root, file),
    sha256: hashFile(file),
    bytes: fs.statSync(file).size,
    width: meta.autoOrient.width,
    height: meta.pageHeight ?? meta.autoOrient.height,
    format: meta.format,
  };
}
export async function recordResult(
  root: string,
  jobId: string,
  attemptId: string,
  claimToken: string,
  input: Receipt,
  id = 'gpt-image-v1',
) {
  const p = paths(root, id);
  return locked(p, async () => {
    const manifest = readManifest(root, id);
    const job = jobOf(manifest, jobId);
    promptOf(root, job);
    const attempt = readAttempt(p, job, attemptId);
    const state = readState(p, job);
    if (attempt.claimToken !== claimToken) throw new Error('Claim token mismatch');
    const receipt = receiptSchema.parse(input);
    if (receipt.outcome !== 'success' && !receipt.error) throw new Error('Failed/unknown receipt requires an error');
    if (attempt.receipt && attempt.receipt.outcome !== 'unknown') {
      const sameSuccess =
        receipt.outcome === 'success' &&
        attempt.raw &&
        receipt.sourcePath &&
        hashFile(receipt.sourcePath) === attempt.raw.sha256 &&
        JSON.stringify({ ...receipt, sourcePath: attempt.receipt.sourcePath }) === JSON.stringify(attempt.receipt);
      if (!sameSuccess && JSON.stringify(attempt.receipt) !== JSON.stringify(receipt))
        throw new Error('Completed attempt is immutable');
      if (state.status !== 'running' || state.attempts.at(-1) !== attemptId) return state;
      const retry =
        attempt.receipt.outcome === 'failed' &&
        attempt.receipt.error?.category === 'transient' &&
        usedAttempts(p, job) < manifest.policy.maxAttempts;
      const repaired: JobState = {
        ...state,
        status: attempt.raw ? 'generated' : retry ? 'pending' : 'needs_attention',
        reason: attempt.receipt.error?.message ?? null,
      };
      saveState(p, job, repaired);
      return repaired;
    }
    if (!state.attempts.includes(attemptId) || !['running', 'needs_attention'].includes(state.status))
      throw new Error('Attempt is not awaiting a result');
    let raw: Artifact | null = null;
    if (receipt.outcome === 'success') {
      if (!receipt.sourcePath) throw new Error('Success requires sourcePath');
      const source = await describeArtifact(root, receipt.sourcePath);
      for (const other of manifest.jobs.filter((j) => j.id !== jobId))
        for (const n of readState(p, other).attempts) {
          if (readAttempt(p, other, n).raw?.sha256 === source.sha256)
            throw new Error(`Output already belongs to ${other.id}`);
        }
      const dest = within(
        p.artifacts,
        `raw/${jobId}/${attemptId}/output.${source.format === 'jpeg' ? 'jpg' : source.format}`,
      );
      atomicWrite(dest, fs.readFileSync(receipt.sourcePath));
      raw = { ...source, file: path.relative(root, dest) };
    }
    if (attempt.receipt?.outcome === 'unknown')
      writeJson(attemptFile(p, job, attemptId).replace('.json', `.recovery-${crypto.randomUUID()}.json`), attempt);
    writeJson(attemptFile(p, job, attemptId), {
      ...attempt,
      completedAt: new Date().toISOString(),
      receipt: { ...receipt, sourcePath: raw?.file ?? receipt.sourcePath },
      raw,
    });
    const retry =
      receipt.outcome === 'failed' &&
      receipt.error?.category === 'transient' &&
      usedAttempts(p, job) < manifest.policy.maxAttempts;
    const updated: JobState = {
      ...state,
      status: raw ? 'generated' : retry ? 'pending' : 'needs_attention',
      reason: receipt.error?.message ?? null,
    };
    saveState(p, job, updated);
    return updated;
  });
}
export function checkDimensions(job: Job, raw: Artifact) {
  const [w, h] = job.targetAspectRatio.split(':').map(Number);
  if (Math.abs(raw.width / raw.height / (w! / h!) - 1) > 0.02)
    throw new Error(`Aspect ratio differs from ${job.targetAspectRatio}`);
  if (Math.max(raw.width, raw.height) < 1024 || Math.min(raw.width, raw.height) < 512)
    throw new Error('Generated image is too small');
}
export async function reviewJob(root: string, jobId: string, input: Review, id = 'gpt-image-v1') {
  const p = paths(root, id);
  return locked(p, () => {
    const manifest = readManifest(root, id);
    const job = jobOf(manifest, jobId);
    const state = readState(p, job);
    const review = reviewSchema.parse(input);
    const attempt = readAttempt(p, job, review.attemptId);
    if (state.status === 'applied') throw new Error('Roll back before changing an applied job');
    if (!attempt.raw || attempt.receipt?.outcome !== 'success')
      throw new Error('Review requires a successful registered attempt');
    if (state.status === 'running' || state.attempts.at(-1) !== review.attemptId)
      throw new Error('Review requires the latest completed attempt');
    const required =
      review.phase === 'generation'
        ? ['subject', 'count', 'text', 'style', 'composition', 'artifacts']
        : ['card', 'detail', 'mobile', 'alt', 'annotations', 'focus'];
    if (review.decision === 'accept' && required.some((key) => review.checks[key] !== true))
      throw new Error(`All ${review.phase} checks must pass: ${required.join(', ')}`);
    if (review.decision === 'reject' && !review.reason.trim()) throw new Error('Rejected review needs a reason');
    if (review.decision === 'accept') {
      if (review.phase === 'generation') {
        checkDimensions(job, attempt.raw);
        if (
          review.artifacts[attempt.raw.file] !== attempt.raw.sha256 ||
          hashFile(within(root, attempt.raw.file)) !== attempt.raw.sha256
        )
          throw new Error('Generation review must bind the raw image hash');
      } else {
        if (
          state.status !== 'processed' ||
          !state.artifacts.length ||
          !state.contentHash ||
          review.contentHash !== state.contentHash
        )
          throw new Error('Display review requires current processed content');
        for (const artifact of state.artifacts)
          if (
            review.artifacts[artifact.file] !== artifact.sha256 ||
            hashFile(within(root, artifact.file)) !== artifact.sha256
          )
            throw new Error(`Display review hash mismatch: ${artifact.file}`);
        const contentFile = within(p.artifacts, `jobs/${job.id}/content.json`);
        if (!fs.existsSync(contentFile) || hashFile(contentFile) !== state.contentHash)
          throw new Error('Processed content changed after preparation');
        if (['alt', 'focalPoint', 'regions', 'processing'].some((key) => key in input))
          throw new Error('Update generation settings and prepare again before display review');
      }
    }
    const record = { ...review, reviewedAt: new Date().toISOString() };
    const hash = digest(JSON.stringify(record));
    writeJson(within(p.dir, `jobs/${jobId}/reviews/${hash}.json`), record);
    writeJson(within(p.dir, `jobs/${jobId}/review.json`), record);
    if (generationSettings(review)) {
      const { alt, focalPoint, regions, processing } = review;
      writeJson(within(p.dir, `jobs/${jobId}/settings.json`), { alt, focalPoint, regions, processing });
    }
    const generation = review.phase === 'generation';
    const updated: JobState = {
      ...state,
      selectedAttemptId: review.attemptId,
      reason: review.reason || null,
      status:
        review.decision === 'accept'
          ? generation
            ? 'accepted'
            : 'prepared'
          : generation
            ? usedAttempts(p, job) < 3
              ? 'pending'
              : 'needs_attention'
            : 'accepted',
      generationReview: generation ? (review.decision === 'accept' ? hash : null) : state.generationReview,
      displayReview: generation ? null : review.decision === 'accept' ? hash : null,
    };
    saveState(p, job, updated);
    return updated;
  });
}

function generationSettings(review: { phase: string; decision: string }) {
  return review.phase === 'generation' && review.decision === 'accept';
}
