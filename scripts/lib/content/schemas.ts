import { z } from 'zod';
import { FIELD_NAME_PATTERN, type FieldSpec } from '../../../src/modules/template/types';

// Schemas for the files under content/ (design doc §4, §5, §6). Unknown keys are errors, so a
// misspelt key is reported instead of silently ignored. Locale keys in label maps are checked
// against the registry by the index builder, which knows the registry.

export const ID_PREFIX = { prompt: 'p', template: 't', example: 'x', asset: 'a', collection: 'c' } as const;
export type IdKind = keyof typeof ID_PREFIX;

const idOf = (kind: IdKind) =>
  z.string().regex(new RegExp(`^${ID_PREFIX[kind]}_\\d{3,}$`), `${kind} IDs look like "${ID_PREFIX[kind]}_001"`);

export const promptId = idOf('prompt');
export const templateId = idOf('template');
export const exampleId = idOf('example');
export const assetId = idOf('asset');
export const collectionId = idOf('collection');

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slug = z
  .string()
  .regex(SLUG_PATTERN, 'use lowercase letters, digits and single hyphens, e.g. "ink-portrait"');
/** Taxonomy and field-group IDs double as topic slugs (§9.1). */
export const termId = slug;
export const versionId = z.string().regex(/^v\d+$/, 'versions are named v1, v2, …');

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'dates are written YYYY-MM-DD')
  .refine(
    (v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v),
    {
      message: 'not a real calendar date',
    },
  );

/** Text per locale code, e.g. `{ en: …, zh-Hans: … }`. */
export const localeText = z.record(z.string(), z.string().trim().min(1, 'text must not be empty'));

const text = z.string().trim().min(1);
const optionalText = text.nullable().default(null);
const httpUrl = z.url({ protocol: /^https?$/ });
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'colours are written #RRGGBB');
const unit = z.number().min(0).max(1);

const fieldValue = z.union([z.string(), z.array(z.string())]);
export const fieldValues = z.record(
  z.string().regex(FIELD_NAME_PATTERN, 'field names look like "productName"'),
  fieldValue,
);

// ---------------------------------------------------------------------------------------------
// Prompts (§5.2)

const region = z
  .object({ x: unit, y: unit, w: unit.positive(), h: unit.positive() })
  .strict()
  .refine((r) => r.x + r.w <= 1.0001 && r.y + r.h <= 1.0001, {
    message: 'the region must stay inside the image (x + w ≤ 1, y + h ≤ 1)',
  });

export const annotationSchema = z
  .object({
    /** Must appear verbatim in the prompt (§5.2). */
    phrase: text,
    region,
    note: localeText,
  })
  .strict();

const model = z
  .object({ displayName: optionalText, providerModelId: optionalText })
  .strict()
  .default({ displayName: null, providerModelId: null });

export const inputRequirementsSchema = z
  .object({
    referenceImage: z.enum(['none', 'optional', 'required']).default('none'),
    instructions: localeText.default({}),
    slots: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z][A-Za-z0-9]*$/),
            labels: localeText,
            min: z.number().int().nonnegative(),
            max: z.number().int().positive(),
          })
          .strict()
          .refine((s) => s.min <= s.max, 'slot minimum exceeds maximum'),
      )
      .default([]),
  })
  .strict()
  .superRefine((input, ctx) => {
    const ids = input.slots.map((s) => s.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'duplicate reference slot' });
    if (input.slots.length && input.referenceImage !== (input.slots.some((s) => s.min > 0) ? 'required' : 'optional'))
      ctx.addIssue({ code: 'custom', message: 'reference requirement contradicts slots' });
  });

export type InputRequirementsSource = z.infer<typeof inputRequirementsSchema>;

/** Evidence belongs to the source post, never to the independently generated output. */
export const inspirationSourceSchema = z
  .object({
    candidateId: z.string().min(1),
    platform: z.string().min(1),
    author: optionalText,
    url: httpUrl,
    publishedAt: optionalText,
    metricObjectUrl: httpUrl,
    metricObjectPublishedAt: optionalText,
    metricScope: localeText,
    observedAt: z.string().min(1),
    cacheTimestampKnown: z.boolean(),
    evidenceMethod: localeText,
    evidenceUrl: httpUrl,
    sourcePromptStatus: localeText,
    metrics: z.array(z.object({ key: z.string().min(1), value: z.number().nullable(), labels: localeText }).strict()),
  })
  .strict();

export const promptEntrySchema = z
  .object({
    id: promptId,
    slug,
    createdAt: isoDate,
    updatedAt: isoDate,
    promptSource: z.discriminatedUnion('type', [
      z
        .object({
          type: z.literal('literal'),
          file: z.literal('prompt.txt').default('prompt.txt'),
          /** Language of the prompt text, shown as "Prompt · English" (§11.8.3). */
          language: z.string().min(2),
        })
        .strict(),
      z
        .object({
          type: z.literal('template'),
          templateId,
          version: versionId,
          values: fieldValues,
        })
        .strict(),
    ]),
    categoryId: termId,
    styleIds: z.array(termId).default([]),
    useCaseIds: z.array(termId).default([]),
    coverAssetId: assetId.nullable(),
    relatedTemplateIds: z.array(templateId).default([]),
    model: z
      .object({
        displayName: optionalText,
        providerModelId: optionalText,
        verification: z.enum(['verified', 'unverified', 'unknown']).default('unknown'),
      })
      .strict()
      .default({ displayName: null, providerModelId: null, verification: 'unknown' }),
    inputRequirements: inputRequirementsSchema.prefault({}),
    showcaseExampleId: exampleId.nullable().default(null),
    promptProvenance: z.enum(['unknown', 'original', 'independent-adaptation', 'source-prompt']).default('unknown'),
    inspirationSources: z.array(inspirationSourceSchema).default([]),
    source: z
      .object({ author: optionalText, url: httpUrl.nullable().default(null), license: optionalText })
      .strict()
      .default({ author: null, url: null, license: null }),
    annotations: z.array(annotationSchema).max(5, 'at most five annotations per prompt (§11.1.9)').default([]),
  })
  .strict();
export type PromptEntrySource = z.infer<typeof promptEntrySchema>;

// ---------------------------------------------------------------------------------------------
// Templates (§6)

const fieldBase = {
  name: z.string().regex(FIELD_NAME_PATTERN, 'field names start with a lowercase letter, then letters or digits'),
  required: z.boolean().default(false),
  group: termId.nullable().default(null),
  labels: localeText,
  help: localeText.default({}),
};
const count = z.number().int().nonnegative().nullable().default(null);
const positive = z.number().int().positive().nullable().default(null);

const stringField = z
  .object({
    ...fieldBase,
    type: z.literal('string'),
    default: z.string().nullable().default(null),
    minLength: count,
    maxLength: positive,
    multiline: z.boolean().default(false),
  })
  .strict();
const listField = z
  .object({
    ...fieldBase,
    type: z.literal('string-list'),
    default: z.array(z.string()).nullable().default(null),
    minItems: count,
    maxItems: positive,
    itemMaxLength: positive,
    separator: z.string().min(1).default(', '),
  })
  .strict();
const enumField = z
  .object({
    ...fieldBase,
    type: z.literal('enum'),
    default: z.string().nullable().default(null),
    options: z
      .array(
        z
          .object({
            value: text,
            swatch: z.array(hexColor).min(1).nullable().default(null),
            labels: localeText,
          })
          .strict(),
      )
      .min(2, 'an enum needs at least two options'),
  })
  .strict();

export const fieldSchema = z.discriminatedUnion('type', [stringField, listField, enumField]);
export type FieldSource = z.infer<typeof fieldSchema>;

// The renderer's FieldSpec must be exactly the source field minus its labels.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type StripLabels<F> = F extends unknown ? Omit<F, 'labels' | 'help' | 'options'> : never;
const _fieldsMatch: Same<StripLabels<FieldSource>, StripLabels<FieldSpec>> = true;
void _fieldsMatch;

export const fieldsFileSchema = z.object({ fields: z.array(fieldSchema).min(1) }).strict();
export const sampleSchema = fieldValues;

export const promptAnnotationsSchema = z.object({
  annotations: z.array(z.object({ sourcePhrase: text, phrase: text }).strict()).default([]),
}).strict();
export const promptVariantSchema = promptAnnotationsSchema.extend({ values: fieldValues }).strict();
export const templateVariantSchema = z.object({
  defaults: fieldValues.default({}),
  enumText: z.record(z.string(), z.union([z.literal('source'), z.record(z.string(), text)])).default({}),
  separators: z.record(z.string(), z.string().min(1)).default({}),
  samples: z.record(z.string(), fieldValues),
}).strict();
export type PromptAnnotationsSource = z.infer<typeof promptAnnotationsSchema>['annotations'];
export type TemplateVariantSource = z.infer<typeof templateVariantSchema>;

export const templateEntrySchema = z
  .object({
    id: templateId,
    slug,
    createdAt: isoDate,
    updatedAt: isoDate,
    /** The recommended version (§6.4). */
    currentVersion: versionId,
    /** Language of the template body, shown as "Prompt · English". */
    promptLanguage: z.string().min(2),
    categoryId: termId.nullable().default(null),
    styleIds: z.array(termId).default([]),
    useCaseIds: z.array(termId).default([]),
  })
  .strict();
export type TemplateEntrySource = z.infer<typeof templateEntrySchema>;

// ---------------------------------------------------------------------------------------------
// Example runs (§5.5)

const parameterValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const exampleRunSchema = z
  .object({
    promptLanguage: z.string().min(2).optional(),
    id: exampleId,
    promptId: promptId.nullable().default(null),
    template: z
      .object({
        id: templateId,
        version: versionId,
        /** The sample the values came from, e.g. "default"; its values must match (§6.4). */
        sample: z.string().nullable().default(null),
        values: fieldValues,
        contractHash: z
          .string()
          .regex(/^[0-9a-f]{64}$/)
          .optional(),
        variantHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
      })
      .strict()
      .nullable()
      .default(null),
    /** SHA-256 of prompt.txt, the exact text sent to the generator. */
    promptSha256: z.string().regex(/^[0-9a-f]{64}$/, 'a lowercase hexadecimal SHA-256 (64 characters)'),
    referenceAssetIds: z.array(assetId).default([]),
    referenceBindings: z
      .array(z.object({ slotId: text, referenceIndex: z.number().int().nonnegative() }).strict())
      .default([]),
    outputAssetIds: z.array(assetId).min(1, 'a run records at least one output image'),
    provider: optionalText,
    model,
    recordedAt: isoDate,
    /** Known generation parameters, shown as a table (§9.2). Unknown ones are left out. */
    parameters: z.record(z.string(), parameterValue).default({}),
    /** Human observations per locale (§5.5). */
    notes: localeText.default({}),
  })
  .strict()
  .refine((r) => r.promptId !== null || r.template !== null, {
    message: 'a run belongs to a prompt (promptId), a template (template), or both',
  });
export type ExampleRunSource = z.infer<typeof exampleRunSchema>;

// ---------------------------------------------------------------------------------------------
// Media (§5.4, §10)

export const MEDIA_KEY_PATTERN = /^media\/a_\d{3,}\/[a-z0-9-]+\.(?:jpg|png|webp|avif|gif)$/;
const mediaKey = z.string().regex(MEDIA_KEY_PATTERN, 'keys look like "media/a_001/slug-detail-<hash>.webp"');
const mimeType = z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const dimension = z.number().int().positive();
const variant = z.object({ key: mediaKey, width: dimension, height: dimension, mimeType }).strict();

/** IPTC Digital Source Type codes (cv.iptc.org/newscodes/digitalsourcetype). */
export const DIGITAL_SOURCE_TYPES = [
  'digitalCapture',
  'computationalCapture',
  'negativeFilm',
  'positiveFilm',
  'print',
  'humanEdits',
  'compositeCapture',
  'algorithmicallyEnhanced',
  'digitalCreation',
  'dataDrivenMedia',
  'trainedAlgorithmicMedia',
  'compositeWithTrainedAlgorithmicMedia',
  'algorithmicMedia',
  'compositeSynthetic',
  'screenCapture',
  'virtualRecording',
  'composite',
] as const;

const webpProcessing = z.object({ quality: z.number().int().min(1).max(100), lossless: z.boolean() }).strict();
export const processingSchema = z
  .object({
    version: z.literal(1),
    thumbnail: webpProcessing,
    card: webpProcessing,
    detail: webpProcessing,
    og: z.object({ quality: z.number().int().min(1).max(100) }).strict(),
  })
  .strict();

export const mediaSchema = z
  .object({
    id: assetId,
    contentHash: z.string().regex(/^sha256:[0-9a-f]{64}$/, 'written by media:import as "sha256:<64 hex digits>"'),
    mimeType,
    byteSize: z.number().int().positive().optional(),
    animation: z.object({
      frameCount: z.number().int().min(2),
      durationMs: z.number().int().nonnegative(),
      /** Zero means infinite; null means the file does not specify a loop count. */
      loopCount: z.number().int().nonnegative().nullable(),
    }).strict().optional(),
    width: dimension,
    height: dimension,
    original: z.object({ key: mediaKey }).strict(),
    variants: z.object({ thumbnail: variant, card: variant, detail: variant, og: variant }).strict(),
    /** Persist reviewed encoding choices so media:import --refresh preserves them. */
    processing: processingSchema.optional(),
    /** Only crops the Open Graph image (§5.4); everything on the site shows the full image. */
    focalPoint: z.object({ x: unit, y: unit }).strict().default({ x: 0.5, y: 0.5 }),
    placeholder: z.object({ color: hexColor }).strict(),
    alt: localeText.default({}),
    caption: localeText.default({}),
    credit: z
      .object({
        creator: optionalText,
        creditText: optionalText,
        /** IPTC Copyright Notice (§9.7), e.g. "© 2026 Jane Doe". */
        copyrightNotice: optionalText,
        sourceUrl: httpUrl.nullable().default(null),
        license: optionalText,
        licenseUrl: httpUrl.nullable().default(null),
        acquireLicenseUrl: httpUrl.nullable().default(null),
      })
      .strict()
      .default({
        creator: null,
        creditText: null,
        copyrightNotice: null,
        sourceUrl: null,
        license: null,
        licenseUrl: null,
        acquireLicenseUrl: null,
      }),
    provenance: z
      .object({
        digitalSourceType: z.enum(DIGITAL_SOURCE_TYPES).default('trainedAlgorithmicMedia'),
        contentCredentials: z.enum(['present', 'absent', 'unknown']).default('unknown'),
      })
      .strict()
      .default({ digitalSourceType: 'trainedAlgorithmicMedia', contentCredentials: 'unknown' }),
  })
  .strict();
export type MediaSource = z.infer<typeof mediaSchema>;

// ---------------------------------------------------------------------------------------------
// Collections, taxonomy, redirects

export const collectionEntrySchema = z
  .object({
    id: collectionId,
    slug,
    createdAt: isoDate,
    updatedAt: isoDate,
    coverAssetId: assetId,
    /** Prompts and templates in editorial order. */
    items: z.array(z.union([promptId, templateId])).min(1),
  })
  .strict();
export type CollectionEntrySource = z.infer<typeof collectionEntrySchema>;

/** Other words that find a term in search, per locale: synonyms and common queries (§13.2). */
const localeWords = z.record(z.string(), z.array(z.string().trim().min(1, 'aliases must not be empty')));
export const termSchema = z.object({ id: termId, labels: localeText, aliases: localeWords.default({}) }).strict();
export const taxonomyFileSchema = z.array(termSchema);
export type TermSource = z.infer<typeof termSchema>;

const internalPath = z
  .string()
  .regex(/^\/(?:[a-z0-9-]+\/)*$/, 'internal paths start and end with "/", e.g. "/zh/" (no base path, no domain)');
const redirectKind = z.enum(['prompt', 'template', 'collection']);

export const redirectsFileSchema = z
  .object({
    redirects: z
      .array(
        z.union([
          // A slug change or a merge: the old slug now answers with the entry's current address.
          z.object({ kind: redirectKind, from: slug, to: z.union([promptId, templateId, collectionId]) }).strict(),
          // A fixed path, e.g. the earlier "/zh/" prefix (§8.2).
          z.object({ from: internalPath, to: internalPath }).strict(),
        ]),
      )
      .default([]),
    /** Removed without a replacement: 410 (§9.5). */
    gone: z.array(z.object({ kind: redirectKind, slug, reason: z.enum(['removed', 'license']) }).strict()).default([]),
  })
  .strict();
export type RedirectsSource = z.infer<typeof redirectsFileSchema>;

// ---------------------------------------------------------------------------------------------
// Locale files: frontmatter of locales/{code}.mdx (§5.3, §8.4)

export const SOURCE_HASH_PATTERN = /^sha256:[0-9a-f]{16}$/;

const localizedBase = {
  title: text,
  /** The one-sentence summary; also the meta description (§9.2, §9.3). Required to publish. */
  description: z.string().trim().default(''),
  status: z.enum(['draft', 'published', 'archived']),
  updatedAt: isoDate,
  translation: z
    .object({
      sourceLocale: z.string(),
      /** content:validate prints the current value when the source changes (§8.5). */
      sourceHash: z.string().regex(SOURCE_HASH_PATTERN, 'written as "sha256:" plus 16 hexadecimal digits'),
      reviewStatus: z.enum(['machine-draft', 'reviewed', 'outdated']),
    })
    .strict()
    .optional(),
  seoTitle: text.optional(),
  seoDescription: text.optional(),
};

export const localizedSchema = z.object(localizedBase).strict();
export const collectionLocalizedSchema = z
  .object({
    ...localizedBase,
    /** Why each item is in the collection, 2–3 lines (§11.8.5). Keys are item IDs. */
    reasons: z.record(z.union([promptId, templateId]), text).default({}),
  })
  .strict();
/** Frontmatter of any locale file; `reasons` only exists in collections. */
export type LocalizedSource = z.infer<typeof localizedSchema> & { reasons?: Record<string, string> };
