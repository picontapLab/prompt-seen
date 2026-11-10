import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const keySchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const definitionSchema = z
  .object({
    key: keySchema,
    candidateId: z.string().min(1),
    prompt: z.string().trim().min(1),
    references: z.array(z.object({ slotId: z.string().min(1), path: z.string().min(1) }).strict()),
    targetAspectRatio: z
      .string()
      .regex(/^\d+:[1-9]\d*$/)
      .nullable(),
  })
  .strict();
const fileSchema = z.object({ path: z.string(), sha256: z.string() });
const failureSchema = z
  .object({ provider: z.string().min(1), message: z.string().min(1), requestId: z.string().nullable() })
  .strict();
const stateSchema = z
  .object({
    definition: definitionSchema,
    fingerprint: z.string(),
    references: z.array(fileSchema.extend({ slotId: z.string() })),
    status: z.enum(['planned', 'running', 'generated', 'accepted', 'needs_attention']),
    claimedAt: z.string().nullable(),
    failure: failureSchema.extend({ recordedAt: z.string() }).optional(),
    receipt: z
      .object({
        output: fileSchema,
        provider: z.string().min(1),
        model: z.string().nullable(),
        recordedAt: z.string(),
      })
      .nullable(),
    review: z
      .object({ accepted: z.boolean(), notes: z.string().min(1), reviewer: z.string().min(1), reviewedAt: z.string() })
      .nullable(),
  })
  .strict();
export type JobDefinition = z.infer<typeof definitionSchema>;
export type ProductionJob = z.infer<typeof stateSchema>;
const hash = (bytes: string | Buffer) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileHash = (file: string) => hash(fs.readFileSync(file));
function directory(root: string, key: string) {
  return path.join(root, keySchema.parse(key));
}
function save(root: string, job: ProductionJob) {
  const dir = directory(root, job.definition.key);
  const target = path.join(dir, 'job.json');
  const temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(stateSchema.parse(job), null, 2) + '\n');
  fs.renameSync(temp, target);
}
function locked<T>(root: string, key: string, operation: () => T): T {
  const dir = directory(root, key);
  fs.mkdirSync(dir, { recursive: true });
  const lock = path.join(dir, '.lock');
  const fd = fs.openSync(lock, 'wx');
  try {
    return operation();
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(lock);
  }
}
function verifyReferences(job: ProductionJob) {
  for (const input of job.references)
    if (!fs.existsSync(input.path) || fileHash(input.path) !== input.sha256)
      throw new Error(`Reference changed: ${input.path}`);
}
export function jobStatus(root: string, key: string): ProductionJob {
  return stateSchema.parse(JSON.parse(fs.readFileSync(path.join(directory(root, key), 'job.json'), 'utf8')));
}
/** Freeze exact text and ordered input bytes. Calling again never resets a running attempt. */
export function planJob(root: string, input: JobDefinition): ProductionJob {
  const definition = definitionSchema.parse(input);
  return locked(root, definition.key, () => {
    const references = definition.references.map((r) => ({
      ...r,
      path: path.resolve(r.path),
      sha256: fileHash(r.path),
    }));
    const fingerprint = hash(
      JSON.stringify({
        candidateId: definition.candidateId,
        prompt: definition.prompt,
        references: references.map(({ slotId, sha256 }) => ({ slotId, sha256 })),
        targetAspectRatio: definition.targetAspectRatio,
      }),
    );
    if (fs.existsSync(path.join(directory(root, definition.key), 'job.json'))) {
      const old = jobStatus(root, definition.key);
      if (old.fingerprint !== fingerprint)
        throw new Error('Job definition changed; preserve this attempt and plan a new key');
      return old;
    }
    const job: ProductionJob = {
      definition,
      fingerprint,
      references,
      status: 'planned',
      claimedAt: null,
      receipt: null,
      review: null,
    };
    save(root, job);
    return job;
  });
}
export function claimJob(root: string, key: string) {
  return locked(root, key, () => {
    const job = jobStatus(root, key);
    if (job.status !== 'planned') throw new Error(`Job already ${job.status}; reconcile this attempt before retrying`);
    verifyReferences(job);
    job.status = 'running';
    job.claimedAt = new Date().toISOString();
    save(root, job);
    return {
      key,
      fingerprint: job.fingerprint,
      prompt: job.definition.prompt,
      references: job.references,
      targetAspectRatio: job.definition.targetAspectRatio,
    };
  });
}
/** Record an actual returned image; no model ID or generation setting is inferred. */
export function recordJob(
  root: string,
  key: string,
  receipt: { outputPath: string; provider: string; model: string | null },
) {
  return locked(root, key, () => {
    const job = jobStatus(root, key);
    if (job.status !== 'running') throw new Error('A result can only be recorded for a running job');
    verifyReferences(job);
    const bytes = fs.readFileSync(receipt.outputPath);
    const output = path.join(directory(root, key), `output-${hash(bytes)}${path.extname(receipt.outputPath)}`);
    if (!fs.existsSync(output)) fs.writeFileSync(output, bytes, { flag: 'wx' });
    job.receipt = {
      output: { path: output, sha256: hash(bytes) },
      provider: receipt.provider,
      model: receipt.model,
      recordedAt: new Date().toISOString(),
    };
    job.status = 'generated';
    save(root, job);
    return job;
  });
}
/** Reconcile a provider failure that returned no image, without inventing a receipt. */
export function failJob(root: string, key: string, input: z.infer<typeof failureSchema>) {
  const failure = failureSchema.parse(input);
  return locked(root, key, () => {
    const job = jobStatus(root, key);
    if (job.status !== 'running' || job.receipt) throw new Error('Failure requires a running job without a result');
    job.failure = { ...failure, recordedAt: new Date().toISOString() };
    job.status = 'needs_attention';
    save(root, job);
    return job;
  });
}
export function reviewJob(root: string, key: string, review: { accepted: boolean; notes: string; reviewer: string }) {
  return locked(root, key, () => {
    const job = jobStatus(root, key);
    if (job.status !== 'generated' || !job.receipt) throw new Error('Review requires a generated result');
    verifyReferences(job);
    if (fileHash(job.receipt.output.path) !== job.receipt.output.sha256)
      throw new Error('Output changed since recording');
    job.review = { ...review, reviewedAt: new Date().toISOString() };
    job.status = review.accepted ? 'accepted' : 'needs_attention';
    save(root, job);
    return job;
  });
}
