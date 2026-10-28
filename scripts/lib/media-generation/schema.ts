import { z } from 'zod';
import { exampleRunSchema, localeText } from '../content/schemas';

const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const jobIdSchema = z.string().regex(/^a_\d{3,}$/);
export const jobSchema = z.object({
  id: jobIdSchema,
  slug: z.string(),
  promptId: z.string().nullable(),
  template: exampleRunSchema.shape.template,
  sourceExampleIds: z.array(z.string()),
  promptFile: z.string(),
  promptSha256: hash,
  targetAspectRatio: z.string().regex(/^\d+:\d+$/),
  inputRequirement: z.enum(['none', 'optional', 'required']),
  newAssetId: jobIdSchema,
  newExampleId: z.string().regex(/^x_\d{3,}$/),
  requiredAltLocales: z.array(z.string()),
  annotationCount: z.number().int().nonnegative(),
});
export type Job = z.infer<typeof jobSchema>;
export const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  migrationId: z.string(),
  revision: z.number().int().positive(),
  baseline: z.object({
    head: z.string().nullable(),
    createdAt: z.string(),
    timezone: z.literal('America/Los_Angeles'),
    files: z.record(z.string(), hash),
    visible: z.record(z.string(), z.array(z.string())),
  }),
  policy: z.object({
    transport: z.literal('builtin-imagegen'),
    concurrency: z.literal(1),
    maxAttempts: z.literal(3),
    pilot: z.array(jobIdSchema),
    batchSize: z.literal(10),
    processingVersion: z.literal(1),
  }),
  jobs: z.array(jobSchema),
  references: z.array(
    z.object({
      file: z.string(),
      field: z.enum(['coverAssetId', 'Figure']),
      assetId: jobIdSchema,
      line: z.number().optional(),
    }),
  ),
});
export type Manifest = z.infer<typeof manifestSchema>;
export const artifactSchema = z.object({
  file: z.string(),
  sha256: hash,
  bytes: z.number(),
  width: z.number(),
  height: z.number(),
  format: z.string(),
});
export type Artifact = z.infer<typeof artifactSchema>;
export const receiptSchema = z
  .object({
    outcome: z.enum(['success', 'failed', 'unknown']),
    sourcePath: z.string().optional(),
    toolCallId: z.string().nullable().default(null),
    model: z
      .object({ displayName: z.string().min(1).nullable(), providerModelId: z.string().min(1).nullable() })
      .default({ displayName: null, providerModelId: null }),
    parameters: exampleRunSchema.shape.parameters,
    usage: z.record(z.string(), z.number().nonnegative()).nullable().default(null),
    error: z
      .object({
        category: z.enum(['transient', 'quota', 'permission', 'content', 'unknown']),
        message: z.string().min(1),
      })
      .optional(),
  })
  .strict();
export type Receipt = z.input<typeof receiptSchema>;
export const attemptSchema = z.object({
  id: z.string().regex(/^\d{3}$/),
  claimToken: z.string(),
  promptSha256: hash,
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  receipt: receiptSchema.nullable(),
  raw: artifactSchema.nullable(),
  rejected: z.string().nullable(),
});
export type Attempt = z.infer<typeof attemptSchema>;
export const stateSchema = z.object({
  status: z.enum([
    'pending',
    'running',
    'generated',
    'accepted',
    'processed',
    'prepared',
    'applied',
    'needs_attention',
  ]),
  attempts: z.array(z.string()),
  selectedAttemptId: z.string().nullable(),
  reason: z.string().nullable(),
  artifacts: z.array(artifactSchema),
  contentHash: hash.nullable(),
  generationReview: hash.nullable(),
  displayReview: hash.nullable(),
});
export type JobState = z.infer<typeof stateSchema>;
export const initialState = (): JobState => ({
  status: 'pending',
  attempts: [],
  selectedAttemptId: null,
  reason: null,
  artifacts: [],
  contentHash: null,
  generationReview: null,
  displayReview: null,
});
export const checksSchema = z.record(z.string(), z.boolean());
export const reviewSchema = z
  .object({
    phase: z.enum(['generation', 'display']),
    reviewer: z.string().min(1),
    attemptId: z.string(),
    decision: z.enum(['accept', 'reject']),
    checks: checksSchema,
    reason: z.string().default(''),
    artifacts: z.record(z.string(), hash).default({}),
    contentHash: hash.optional(),
    alt: localeText.optional(),
    focalPoint: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional(),
    regions: z
      .array(
        z
          .object({
            x: z.number().min(0).max(1),
            y: z.number().min(0).max(1),
            w: z.number().positive().max(1),
            h: z.number().positive().max(1),
          })
          .refine((r) => r.x + r.w <= 1.0001 && r.y + r.h <= 1.0001),
      )
      .optional(),
    processing: z.unknown().optional(),
  })
  .strict();
export type Review = z.input<typeof reviewSchema>;
