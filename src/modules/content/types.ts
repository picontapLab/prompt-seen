// The built content model: what content:build writes to .generated/content/ and what pages,
// the detail popup and later emitters read (design doc §3.5, §7). Every type here is plain,
// serializable data: the same detail model renders the full page and the popup (step 4a).
// Locale fields hold registry codes (`zh-Hans`); `path` fields are internal paths
// ("/zh-hans/prompts/ink-portrait/"), turned into addresses by `@/modules/url`.

import type { FieldSpec, FieldValues } from '@/modules/template/types';

export type EntryKind = 'prompt' | 'template' | 'collection' | 'page' | 'topic';
export type TaxonomyKind = 'category' | 'style' | 'useCase';

/** draft: visible only in preview builds; published: passes every publishing rule (§8.4). */
export type Visibility = 'published' | 'draft';
export type ReviewStatus = 'source' | 'machine-draft' | 'reviewed' | 'outdated';

// ---------------------------------------------------------------------------------------------
// Rich text: MDX compiled at build time into a restricted, serializable tree (§3.5, §5.3).
// The browser never compiles MDX. Links to content use internal paths; external links are
// absolute http(s) or mailto addresses.

export type RichInline =
  | { t: 'text'; v: string }
  | { t: 'strong' | 'em' | 'del'; c: RichInline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; internal: boolean; c: RichInline[] }
  | { t: 'br' };

export type RichBlock =
  | { t: 'p'; c: RichInline[] }
  | { t: 'h2' | 'h3' | 'h4'; id: string; c: RichInline[] }
  | { t: 'ul' | 'ol'; start: number | null; tight: boolean; items: RichBlock[][] }
  | { t: 'blockquote'; c: RichBlock[] }
  | { t: 'pre'; lang: string | null; v: string }
  | { t: 'hr' }
  | { t: 'table'; align: ('left' | 'right' | 'center' | null)[]; head: RichInline[][]; rows: RichInline[][][] }
  /** `<Figure asset="a_012" caption="…" />`: an image shown at its original ratio. */
  | { t: 'figure'; image: ImageRef; caption: string | null }
  /** `<Callout>…</Callout>`: a highlighted note. */
  | { t: 'callout'; c: RichBlock[] };

export type TocItem = { id: string; text: string };

// ---------------------------------------------------------------------------------------------
// Images (§5.4, §10.2). Keys are object-store keys; `@/modules/media` turns them into URLs.

export type ImageVariantName = 'thumbnail' | 'card' | 'detail' | 'og' | 'original';
export type ImageVariant = { key: string; width: number; height: number; mimeType: string };

export type ImageCredit = {
  creator: string | null;
  creditText: string | null;
  copyrightNotice: string | null;
  sourceUrl: string | null;
  license: string | null;
  licenseUrl: string | null;
  acquireLicenseUrl: string | null;
};

export type ImageRef = {
  assetId: string;
  width: number;
  height: number;
  /** width / height. */
  ratio: number;
  /** Wider than 2:1 or taller than 1:2: shown in feature rows, not justified rows (§11.1.4). */
  extreme: boolean;
  /** Dominant colour, the frame background before the image loads (§11.9). */
  placeholder: string;
  /** In the page's locale; empty only in preview builds of unpublished pages. */
  alt: string;
  caption: string | null;
  variants: Partial<Record<ImageVariantName, ImageVariant>>;
  credit: ImageCredit;
  digitalSourceType: string;
};

// ---------------------------------------------------------------------------------------------
// Shared pieces

export type Alternate = { locale: string; path: string };

export type TranslationInfo = {
  /** The locale this entry was written in (§8.4: declared per entry). */
  sourceLocale: string;
  reviewStatus: ReviewStatus;
};

export type TermRef = { kind: TaxonomyKind; id: string; label: string; path: string | null };

export type ModelInfo = { displayName: string | null; providerModelId: string | null };

export type SeoText = { title: string; description: string };

type Localized = {
  id: string;
  slug: string;
  locale: string;
  path: string;
  title: string;
  description: string;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------------------------
// Summaries: the small records lists, feeds, search and related links use (§3.5: the browser
// gets title, cover, taxonomy, summary and address, never the full prompt).

export type PromptSummary = Localized & {
  kind: 'prompt';
  /** Four-digit frame number from the stable ID, e.g. "0127" (§11.1.9). */
  frameNumber: string;
  cover: ImageRef;
  categoryId: string;
  styleIds: string[];
  useCaseIds: string[];
  model: ModelInfo;
  verification: 'verified' | 'unverified' | 'unknown';
  /** Date of the latest ExampleRun, or null when never tested (§9.8). */
  lastTestedAt: string | null;
  promptLanguage: string;
  /** First sentence of the prompt, for the card hover line (§11.8.2). */
  promptOpening: string;
  annotated: boolean;
};

export type TemplateSummary = Localized & {
  kind: 'template';
  cover: ImageRef | null;
  currentVersion: string;
  fieldCount: number;
  promptLanguage: string;
  /** The opening of the body with placeholders, for template cards (§11.8.1). */
  bodyExcerpt: string;
};

export type CollectionSummary = Localized & {
  kind: 'collection';
  cover: ImageRef;
  itemCount: number;
};

export type PageSummary = Localized & { kind: 'page' };

export type TopicSummary = Localized & {
  kind: 'topic';
  taxonomy: TaxonomyKind;
  cover: ImageRef | null;
  promptCount: number;
};

export type Term = {
  kind: TaxonomyKind;
  id: string;
  label: string;
  /**
   * Other words that find this term in search (§13.2): its aliases in this locale, then its
   * labels and aliases in every other locale, so "poster" also finds 海报.
   */
  aliases: string[];
  /** Visible prompts in this locale. */
  count: number;
  /** Topic page address when the topic is published in this locale (§9.1), else null. */
  path: string | null;
};

// ---------------------------------------------------------------------------------------------
// Detail models

export type Annotation = {
  /** A, B, C… in order of appearance in the prompt (§11.1.9); at most five. */
  letter: string;
  phrase: string;
  /** UTF-16 offsets of the phrase in `prompt.text`. */
  start: number;
  end: number;
  /** Relative to the original image: 0–1 (§5.2). */
  region: { x: number; y: number; w: number; h: number };
  note: string;
};

export type ExampleRunView = {
  id: string;
  recordedAt: string;
  provider: string | null;
  model: ModelInfo;
  template: { id: string; version: string; sample: string | null; values: FieldValues } | null;
  /** The exact prompt that produced the outputs (§5.5); never changes. */
  prompt: string;
  promptSha256: string;
  parameters: { name: string; value: string | number | boolean | null }[];
  references: ImageRef[];
  outputs: ImageRef[];
  notes: string | null;
};

export type SourceInfo = { author: string | null; url: string | null; license: string | null };

export type PromptDetail = PromptSummary & {
  seo: SeoText;
  body: RichBlock[];
  toc: TocItem[];
  prompt: { text: string; language: string; characters: number; lines: number };
  annotations: Annotation[];
  test: {
    model: ModelInfo;
    verification: PromptSummary['verification'];
    lastTestedAt: string | null;
    /** Of the cover image, e.g. "4:5". */
    aspectRatio: string;
    referenceImage: 'none' | 'optional' | 'required';
  };
  examples: ExampleRunView[];
  source: SourceInfo;
  template: { id: string; version: string; values: FieldValues } | null;
  taxonomy: { category: TermRef; styles: TermRef[]; useCases: TermRef[] };
  relatedTemplates: TemplateSummary[];
  similar: PromptSummary[];
  collections: CollectionSummary[];
  alternates: Alternate[];
  translation: TranslationInfo;
};

/** A template field with labels in the page's locale (§8.5, §11.8.4). */
export type LocalizedField = FieldSpec & {
  label: string;
  help: string | null;
  groupLabel: string | null;
  optionLabels: Record<string, string>;
};

export type TemplateSample = { name: string; values: FieldValues };

export type TemplateDetail = TemplateSummary & {
  seo: SeoText;
  body: RichBlock[];
  toc: TocItem[];
  version: {
    id: string;
    body: string;
    fields: LocalizedField[];
    /** `default` first, then the others in file-name order (§6.2, §11.4). */
    samples: TemplateSample[];
    /** Rendered from the default sample; also in the initial HTML (§3.2). */
    defaultPrompt: string;
  };
  versions: string[];
  examples: ExampleRunView[];
  relatedPrompts: PromptSummary[];
  taxonomy: { category: TermRef | null; styles: TermRef[]; useCases: TermRef[] };
  alternates: Alternate[];
  translation: TranslationInfo;
};

export type CollectionItem =
  | { kind: 'prompt'; entry: PromptSummary; reason: string | null }
  | { kind: 'template'; entry: TemplateSummary; reason: string | null };

export type CollectionDetail = CollectionSummary & {
  seo: SeoText;
  body: RichBlock[];
  toc: TocItem[];
  /** In editorial order; entries not visible in this locale are left out. */
  items: CollectionItem[];
  alternates: Alternate[];
  translation: TranslationInfo;
};

export type TopicDetail = TopicSummary & {
  seo: SeoText;
  body: RichBlock[];
  toc: TocItem[];
  prompts: PromptSummary[];
  alternates: Alternate[];
  translation: TranslationInfo;
};

export type PageDetail = PageSummary & {
  seo: SeoText;
  body: RichBlock[];
  toc: TocItem[];
  alternates: Alternate[];
  translation: TranslationInfo;
};

// ---------------------------------------------------------------------------------------------
// Files in .generated/content/

/** manifest.json: the build, its locales and the address changes for host configuration. */
export type ContentManifest = {
  buildId: string;
  buildMode: 'production' | 'preview';
  locales: string[];
  /** Internal paths, in every built locale where the target is visible (§9.5). */
  redirects: { from: string; to: string }[];
  /** Addresses that answer 410: removed entries and archived locale versions (§9.5). */
  gone: { path: string; locale: string; reason: GoneReason }[];
  counts: Record<string, Record<EntryKind, number>>;
};

export type GoneReason = 'removed' | 'license' | 'archived';

/** {locale}/index.json: every summary visible in one locale. Prompts newest first. */
export type LocaleIndex = {
  locale: string;
  prompts: PromptSummary[];
  templates: TemplateSummary[];
  collections: CollectionSummary[];
  topics: TopicSummary[];
  pages: PageSummary[];
  terms: Term[];
};

export type DetailByKind = {
  prompt: PromptDetail;
  template: TemplateDetail;
  collection: CollectionDetail;
  topic: TopicDetail;
  page: PageDetail;
};
