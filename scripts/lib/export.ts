import type { LocaleEntry } from '../../src/config/schema';
import type { ContentReader } from '../../src/modules/content/reader';
import type { DetailByKind, EntryKind, ImageRef, LocaleIndex } from '../../src/modules/content/types';
import { createGeoDocuments, type GeoSources, type MarkdownEntry } from '../../src/modules/geo/documents';
import { licenseUrl } from '../../src/modules/seo/structured-data';
import type { BuiltContent } from './content/build-index';

// content:export (design doc §14.1, §9.10.4): the published content of a build as JSON or as the
// same Markdown documents the site serves at index.md. Only what a public page shows: versions
// that pass every publishing rule in enabled locales. Each record carries its licence, and the
// file a format version, so downstream tools can rely on the shape (§19.1).

/** Bumped when a field changes meaning or is removed; new fields keep the version. */
export const EXPORT_VERSION = 2;

/** A content reader over an in-memory build, so exports never read stale generated files. */
export function builtReader(built: BuiltContent): GeoSources['reader'] {
  const details = new Map(built.details.map((d) => [`${d.locale}/${d.kind}/${d.key}`, d.model]));
  const localeIndex = (code: string): LocaleIndex =>
    built.locales.get(code) ?? {
      locale: code,
      prompts: [],
      templates: [],
      collections: [],
      topics: [],
      pages: [],
      terms: [],
    };
  const getEntry = (id: string, code: string) => {
    const index = localeIndex(code);
    return (
      index.prompts.find((e) => e.id === id) ??
      index.templates.find((e) => e.id === id) ??
      index.collections.find((e) => e.id === id) ??
      null
    );
  };
  const getDetailModel = <K extends EntryKind>(kind: K, key: string, code: string) =>
    (details.get(`${code}/${kind}/${key}`) as DetailByKind[K] | undefined) ?? null;
  return { localeIndex, getEntry, getDetailModel } as Pick<
    ContentReader,
    'localeIndex' | 'getEntry' | 'getDetailModel'
  >;
}

type Abs = {
  absoluteUrl: (path: string) => string;
  absoluteImageUrl: (variant: NonNullable<ImageRef['variants']['detail']>) => string;
};

function exportImage(image: ImageRef | null, abs: Abs) {
  const variant = image && (image.variants.detail ?? image.variants.original ?? image.variants.card);
  if (!image || !variant) return null;
  const { credit } = image;
  return {
    url: abs.absoluteImageUrl(variant),
    width: variant.width,
    height: variant.height,
    alt: image.alt,
    caption: image.caption,
    digitalSourceType: image.digitalSourceType,
    credit: { ...credit, licenseUrl: credit.licenseUrl ?? licenseUrl(credit.license) },
  };
}

/** One record per published version, in the shape of the JSON export. */
export function exportRecord(entry: MarkdownEntry, reader: GeoSources['reader'], abs: Abs) {
  const base = {
    id: entry.id,
    slug: entry.slug,
    locale: entry.locale.code,
    url: abs.absoluteUrl(entry.path),
    markdownUrl: abs.absoluteUrl(entry.markdownPath),
  };
  if (entry.kind === 'prompt') {
    const d = reader.getDetailModel('prompt', entry.id, entry.locale.code)!;
    return {
      ...base,
      kind: 'prompt' as const,
      title: d.title,
      description: d.description,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      prompt: { text: d.prompt.text, language: d.prompt.language },
      test: d.test,
      taxonomy: {
        category: d.taxonomy.category.label,
        styles: d.taxonomy.styles.map((s) => s.label),
        useCases: d.taxonomy.useCases.map((u) => u.label),
      },
      annotations: d.annotations.map(({ letter, phrase, note, region }) => ({ letter, phrase, note, region })),
      template: d.template,
      source: { ...d.source, licenseUrl: licenseUrl(d.source.license) },
      image: exportImage(d.cover, abs),
    };
  }
  const d = reader.getDetailModel('template', entry.id, entry.locale.code)!;
  return {
    ...base,
    kind: 'template' as const,
    title: d.title,
    description: d.description,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    promptLanguage: d.promptLanguage,
    version: d.version.id,
    versions: d.versions,
    body: d.version.body,
    fields: d.version.fields,
    samples: d.version.samples,
    defaultPrompt: d.version.defaultPrompt,
    image: exportImage(d.cover, abs),
  };
}

/** The JSON export of one locale: its published prompts and templates. */
export function exportJson(
  sources: GeoSources,
  buildId: string,
  locale: LocaleEntry,
  kinds: readonly ('prompt' | 'template')[],
) {
  const geo = createGeoDocuments(sources);
  const abs = { absoluteUrl: sources.url.absoluteUrl, absoluteImageUrl: sources.absoluteImageUrl };
  const entries = kinds.flatMap((kind) => geo.markdownEntries(kind)).filter((e) => e.locale.code === locale.code);
  return {
    format: 'prompt-seen/content-export',
    version: EXPORT_VERSION,
    buildId,
    site: { name: sources.siteName, url: sources.url.absoluteUrl(sources.url.paths.home(locale.pathPrefix)) },
    locale: locale.code,
    prompts: entries.filter((e) => e.kind === 'prompt').map((e) => exportRecord(e, sources.reader, abs)),
    templates: entries.filter((e) => e.kind === 'template').map((e) => exportRecord(e, sources.reader, abs)),
  };
}
