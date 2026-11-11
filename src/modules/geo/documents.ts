import type { LocaleEntry } from '@/config/schema';
import type { ContentReader } from '@/modules/content/reader';
import type { EntryKind, ImageVariant, LocalizationState, PromptDetail, TemplateDetail } from '@/modules/content/types';
import { isIndexable, type PageSections } from '@/modules/seo/indexing';
import type { createUrlModule } from '@/modules/url/create';
import { languageName } from '@/ui/prompt-detail/language';
import { llmsTxt, type LlmsLink } from './llms';
import { promptMarkdown, templateMarkdown, type MarkdownContext, type Translate } from './markdown';

// The machine-readable documents of a build (design doc §9.10.4): Markdown versions of published
// detail pages and llms.txt. Built from explicit sources rather than app modules, so the route
// handlers (./index.ts) and `npm run content:export` (Node, outside Next.js) produce the same text.

type UrlModule = ReturnType<typeof createUrlModule>;

export type GeoSources = {
  buildMode: 'production' | 'preview';
  /** Addresses already accepted by the same aggregate rules as HTML/sitemap. */
  languageEntry?: (locale: LocaleEntry) => string | null;
  siteName: string;
  defaultLocale: string;
  /** Locales built in this run, in registry order. */
  locales: readonly LocaleEntry[];
  reader: Pick<ContentReader, 'localeIndex' | 'getEntry' | 'getDetailModel'>;
  url: Pick<UrlModule, 'absoluteUrl' | 'paths'>;
  absoluteImageUrl: (variant: ImageVariant) => string;
  /** Messages of a locale (every namespace; keys include the namespace). */
  translator: (code: string) => Translate;
  /** Kinds of page this build has; links go only to those. */
  sections: PageSections;
};

export type MarkdownKind = Extract<EntryKind, 'prompt' | 'template'>;

/**
 * Slug of the one param an index.md route exports when a build has no published entry of its
 * kind: static export rejects an empty param list. scripts/package.ts removes its output.
 */
export const NO_MARKDOWN = '_none';

/** A published version that has a Markdown twin. */
export type MarkdownEntry = {
  kind: MarkdownKind;
  locale: LocaleEntry;
  id: string;
  slug: string;
  title: string;
  description: string;
  updatedAt: string;
  /** Internal path of the HTML page. */
  path: string;
  /** Internal path of index.md. */
  markdownPath: string;
};

export function createGeoDocuments(src: GeoSources) {
  const { absoluteUrl, paths } = src.url;
  const byCode = new Map(src.locales.map((l) => [l.code, l]));
  const markdownPath = (kind: MarkdownKind, prefix: string, slug: string) =>
    kind === 'prompt' ? paths.promptMarkdown(prefix, slug) : paths.templateMarkdown(prefix, slug);

  /** Every published version of a kind in the public locales (§9.10.4: drafts never get one). */
  function markdownEntries(kind: MarkdownKind): MarkdownEntry[] {
    if (src.buildMode !== 'production') return [];
    return src.locales
      .filter((l) => l.enabled)
      .flatMap((locale) => {
        const index = src.reader.localeIndex(locale.code);
        return (kind === 'prompt' ? index.prompts : index.templates)
          .filter((e) => isIndexable(locale, e.localization))
          .map((e) => ({
            kind,
            locale,
            id: e.id,
            slug: e.slug,
            title: e.title,
            description: e.description,
            updatedAt: e.updatedAt,
            path: e.path,
            markdownPath: markdownPath(kind, locale.pathPrefix, e.slug),
          }));
      });
  }

  function context(kind: MarkdownKind, detail: PromptDetail | TemplateDetail, locale: LocaleEntry): MarkdownContext {
    const otherVersions = detail.alternates.flatMap((a) => {
      const other = byCode.get(a.locale);
      const entry = other && a.locale !== locale.code ? src.reader.getEntry(detail.id, a.locale) : null;
      return other && entry && isIndexable(other, entry.localization)
        ? [{ name: other.nativeName, url: absoluteUrl(markdownPath(kind, other.pathPrefix, entry.slug)) }]
        : [];
    });
    return {
      absoluteUrl,
      absoluteImageUrl: src.absoluteImageUrl,
      t: src.translator(locale.code),
      languageName: (tag) => languageName(tag, locale.htmlLang),
      otherVersions,
    };
  }

  /** The Markdown version of a published entry, or null when it has none. */
  function markdown(entry: Pick<MarkdownEntry, 'kind' | 'locale' | 'id'>): string | null {
    if (src.buildMode !== 'production') return null;
    const { kind, locale, id } = entry;
    if (kind === 'prompt') {
      const detail = src.reader.getDetailModel('prompt', id, locale.code);
      return detail && isIndexable(locale, detail.localization)
        ? promptMarkdown(detail, context(kind, detail, locale))
        : null;
    }
    const detail = src.reader.getDetailModel('template', id, locale.code);
    return detail && isIndexable(locale, detail.localization)
      ? templateMarkdown(detail, context(kind, detail, locale))
      : null;
  }

  /** llms.txt: the site in the default locale, with links to every language and Markdown version. */
  function llms(): string {
    if (src.buildMode !== 'production') return '';
    const def = byCode.get(src.defaultLocale);
    if (!def) throw new Error(`default locale ${src.defaultLocale} is not built`);
    const t = src.translator(def.code);
    const index = src.reader.localeIndex(def.code);
    const published = <T extends { localization: LocalizationState }>(xs: readonly T[]) =>
      xs.filter((x) => isIndexable(def, x.localization));
    const toMarkdown = (kind: MarkdownKind) =>
      markdownEntries(kind)
        .filter((e) => e.locale.code === def.code)
        .map((e): LlmsLink => ({ title: e.title, url: absoluteUrl(e.markdownPath), note: e.description }));
    const pages = (xs: readonly { title: string; path: string; description: string }[]): LlmsLink[] =>
      xs.map((x) => ({ title: x.title, url: absoluteUrl(x.path), note: x.description }));

    return llmsTxt({
      title: src.siteName,
      summary: t('geo.llms.summary'),
      details: [t('geo.llms.details')],
      sections: [
        {
          heading: t('geo.llms.languages'),
          links: src.locales
            .filter((l) => l.enabled)
            .flatMap((l) => {
              const path = src.languageEntry?.(l);
              return path ? [{ title: l.nativeName, url: absoluteUrl(path) }] : [];
            }),
        },
        { heading: t('geo.llms.templates'), links: toMarkdown('template') },
        { heading: t('geo.llms.prompts'), links: toMarkdown('prompt') },
        {
          heading: t('geo.llms.collections'),
          links: src.sections.collections ? pages(published(index.collections)) : [],
        },
        { heading: t('geo.llms.topics'), links: src.sections.topics ? pages(published(index.topics)) : [] },
        {
          // "Optional" is the llms.txt name for links a tool may skip with a short context.
          heading: 'Optional',
          links: [
            ...(src.sections.pages ? pages(published(index.pages)) : []),
            { title: t('geo.llms.sitemap'), url: absoluteUrl(paths.sitemapIndex()) },
          ],
        },
      ],
    });
  }

  return { markdownEntries, markdown, llms };
}

export type GeoDocuments = ReturnType<typeof createGeoDocuments>;
