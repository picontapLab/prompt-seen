import 'server-only';
import { builtLocales, config } from '@/config';
import { catalogTranslator } from '@/i18n/translator';
import { getDetailModel, getEntry, localeIndex } from '@/modules/content';
import { absoluteImageUrl } from '@/modules/media';
import { absoluteUrl, paths, withBasePath } from '@/modules/url';
import { pageSections } from '@/ui/navigation/sections';
import { createGeoDocuments, NO_MARKDOWN, type MarkdownKind } from './documents';
import { robotsTxt } from './robots';

// Machine-readable versions for AI tools and crawlers (design doc §9.10), for the route handlers:
// `index.md` of published detail pages, llms.txt and robots.txt. Server-only; the same documents
// come from `createGeoDocuments` in scripts (content:export).

// One formatter per locale: catalogs are read once per build worker, not once per document.
const translators = new Map<string, ReturnType<typeof catalogTranslator>>();
const translator = (code: string) => {
  if (!translators.has(code)) translators.set(code, catalogTranslator(process.cwd(), code));
  return translators.get(code)!;
};

export const geo = createGeoDocuments({
  siteName: config.siteName,
  defaultLocale: config.defaultLocale,
  locales: builtLocales,
  reader: { localeIndex, getEntry, getDetailModel },
  url: { absoluteUrl, paths },
  absoluteImageUrl,
  translator,
  sections: pageSections(),
});

/**
 * `generateStaticParams` of an index.md route: every published version in a public locale.
 * Route handlers are outside the [locale] layout, so each param carries its locale. Static
 * export rejects an empty list, so a build without any keeps one unused param; its route then
 * answers with an empty body and scripts/package.ts removes it (§9.10.4: drafts get no index.md).
 */
export function markdownParams(kind: MarkdownKind): { locale: string; slug: string }[] {
  const params = geo.markdownEntries(kind).map((e) => ({ locale: e.locale.pathPrefix, slug: e.slug }));
  return params.length ? params : [{ locale: builtLocales[0]!.pathPrefix, slug: NO_MARKDOWN }];
}

/** index.md of an entry, or null when it has none (draft, preview-only locale, unknown slug). */
export function markdownDocument(kind: MarkdownKind, prefix: string, slug: string): string | null {
  const entry = geo.markdownEntries(kind).find((e) => e.locale.pathPrefix === prefix && e.slug === slug);
  return entry ? geo.markdown(entry) : null;
}

/**
 * robots.txt (§9.10.2). At the root of a host it is the host's file; under a subpath crawlers never
 * read it, and the same rules go to deploy/generated/robots-snippet.txt for the host to merge
 * (robots.mode: snippet, §15.4.3). Either way the file only covers this site's addresses.
 */
export function robotsDocument(): string {
  const root = new URL(absoluteUrl(paths.siteRoot()));
  const scope = withBasePath('/');
  return robotsTxt({
    // At the root of a host this file is the host's robots.txt, whatever the configured mode.
    mode: scope === '/' ? 'standalone' : config.robots.mode,
    scope,
    aiTraining: config.robots.aiTraining,
    sitemapUrl: absoluteUrl(paths.sitemapIndex()),
    hostRobotsUrl: new URL('/robots.txt', root).href,
  });
}
