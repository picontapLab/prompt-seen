import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_INDEX_DIR, detailFile, localeIndexFile, manifestFile } from './files';
import type { ContentManifest, DetailByKind, EntryKind, LocaleIndex, PromptSummary, TemplateSummary, CollectionSummary } from './types';

// Reads the content model written by content:build (design doc §7). Pages run on the server
// during the build, so this reads files; nothing here parses content/ (that is build-time code
// in scripts/). Files are cached and re-read when the manifest changes, so `npm run dev` picks
// up rebuilt content without a restart.

export class ContentNotBuiltError extends Error {
  constructor(dir: string) {
    super(`${dir} is missing: run \`npm run content:build\` (npm run dev and npm run build do it for you)`);
    this.name = 'ContentNotBuiltError';
  }
}

type Summary = PromptSummary | TemplateSummary | CollectionSummary;

export function createContentReader(dir: string) {
  let stamp = -1;
  const cache = new Map<string, unknown>();

  function read<T>(file: string): T | null {
    const manifest = path.join(dir, manifestFile());
    let mtime: number;
    try {
      mtime = fs.statSync(manifest).mtimeMs;
    } catch {
      throw new ContentNotBuiltError(dir);
    }
    if (mtime !== stamp) {
      cache.clear();
      stamp = mtime;
    }
    if (cache.has(file)) return cache.get(file) as T | null;
    const full = path.join(dir, file);
    const value = fs.existsSync(full) ? (JSON.parse(fs.readFileSync(full, 'utf8')) as T) : null;
    cache.set(file, value);
    return value;
  }

  const manifest = (): ContentManifest => read<ContentManifest>(manifestFile())!;

  /** Everything visible in one locale of this build; empty for locales that are not built. */
  const localeIndex = (locale: string): LocaleIndex =>
    read<LocaleIndex>(localeIndexFile(locale)) ?? {
      locale,
      prompts: [],
      templates: [],
      collections: [],
      topics: [],
      pages: [],
      terms: [],
    };

  /** The summary of a prompt, template or collection in a locale, or null when it is not shown there. */
  function getEntry(id: string, locale: string): Summary | null {
    const index = localeIndex(locale);
    return (
      index.prompts.find((e) => e.id === id) ??
      index.templates.find((e) => e.id === id) ??
      index.collections.find((e) => e.id === id) ??
      null
    );
  }

  type ListQuery = { locale: string; kind: 'prompt' | 'template' | 'collection' };
  function listEntries(q: ListQuery & { kind: 'prompt' }): PromptSummary[];
  function listEntries(q: ListQuery & { kind: 'template' }): TemplateSummary[];
  function listEntries(q: ListQuery & { kind: 'collection' }): CollectionSummary[];
  function listEntries({ locale, kind }: ListQuery): Summary[] {
    const index = localeIndex(locale);
    return kind === 'prompt' ? index.prompts : kind === 'template' ? index.templates : index.collections;
  }

  /**
   * The serializable detail model shared by the full page and the popup (§3.5). `key` is the ID
   * for prompts, templates and collections, the slug for pages and `{taxonomy}/{id}` for topics.
   */
  function getDetailModel<K extends EntryKind>(kind: K, key: string, locale: string): DetailByKind[K] | null {
    return read<DetailByKind[K]>(detailFile(locale, kind, key));
  }

  /** Looks up a prompt, template or collection by its slug in a locale. */
  function findBySlug(kind: 'prompt' | 'template' | 'collection', locale: string, slug: string): Summary | null {
    return listEntries({ locale, kind: kind as 'prompt' }).find((e) => e.slug === slug) ?? null;
  }

  return { manifest, localeIndex, getEntry, listEntries, getDetailModel, findBySlug };
}

export type ContentReader = ReturnType<typeof createContentReader>;

/** The reader for this build, rooted at the working directory of `next build` / `next dev`. */
export const defaultContentDir = () => path.join(process.cwd(), CONTENT_INDEX_DIR);
