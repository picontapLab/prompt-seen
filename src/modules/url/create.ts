import type { ResolvedConfig } from '@/config/schema';

// The only place that turns paths into addresses (design doc §4.1, §9.3, §15.4.3).
//
// Three kinds of address:
// - internal path: relative to the base path, e.g. "/en/prompts/ink-portrait/". Use it with
//   next/link and the router, which add the base path themselves.
// - withBasePath(path): for anything Next.js does not prefix: plain <a>, fetch, pushState,
//   Workers, files under public/.
// - absoluteUrl(path): the public URL on the canonical host, following urlPattern. Use it for
//   canonical, hreflang, Open Graph, sitemaps and structured data.
//
// Pages end with "/" (trailingSlash: true); files such as index.md or sitemap.xml do not.

/**
 * First path segments under a locale that the site's own routes use (src/app/[locale]/(public)/).
 * Content pages (about, license) are served at /{locale}/{slug}/, so their slugs must avoid
 * these; content:validate checks it.
 */
export const RESERVED_PAGE_SEGMENTS: readonly string[] = [
  'prompts',
  'templates',
  'collections',
  'categories',
  'styles',
  'use-cases',
  'search',
  'explore',
  'favorites',
  'translation-missing',
  '404',
  '410',
  'sitemap-pages.xml',
];

/**
 * The one param a page route exports for a locale with nothing to show there (e.g. a locale
 * without collections): static export rejects an empty param list. The page renders nothing for
 * it and scripts/package.ts removes its output, so the address answers 404.
 */
export const EMPTY_PARAM = '_none';

export type UrlConfig = {
  origin: string;
  basePath: string;
  urlPattern: string;
  /** Every registered URL prefix, used to recognise the locale segment of a path. */
  localePrefixes: readonly string[];
  /** CDN address of the media storage (site.yaml `media.baseUrl`); null: images are files of the build. */
  mediaBaseUrl?: string | null;
};

/** The url module's settings from a resolved configuration (scripts and the app use the same). */
export function urlConfigOf(
  config: Pick<ResolvedConfig, 'origin' | 'basePath' | 'urlPattern' | 'locales' | 'media'>,
): UrlConfig {
  return {
    origin: config.origin,
    basePath: config.basePath,
    urlPattern: config.urlPattern,
    localePrefixes: config.locales.map((l) => l.pathPrefix),
    mediaBaseUrl: config.media.baseUrl,
  };
}

const collapseSlashes = (path: string) => path.replace(/\/{2,}/g, '/');

export function createUrlModule(cfg: UrlConfig) {
  const prefixes = new Set(cfg.localePrefixes);

  function assertInternal(path: string) {
    if (!path.startsWith('/')) throw new Error(`internal paths start with "/": ${path}`);
  }

  function withBasePath(path: string): string {
    assertInternal(path);
    return cfg.basePath + path;
  }

  /** Inverse of withBasePath, e.g. for location.pathname. Returns null outside the base path. */
  function stripBasePath(pathname: string): string | null {
    if (!cfg.basePath) return pathname;
    if (pathname === cfg.basePath) return '/';
    return pathname.startsWith(cfg.basePath + '/') ? pathname.slice(cfg.basePath.length) : null;
  }

  function absoluteUrl(path: string): string {
    assertInternal(path);
    const [, first = '', ...rest] = path.split('/');
    const hasLocale = prefixes.has(first);
    const locale = hasLocale ? first : '';
    const remainder = hasLocale ? rest.join('/') : path.slice(1);
    const publicPath = cfg.urlPattern
      .replace('{basePath}', cfg.basePath)
      .replace('{locale}', locale)
      .replace('{path}', remainder);
    return cfg.origin + collapseSlashes(publicPath.startsWith('/') ? publicPath : `/${publicPath}`);
  }

  /**
   * Address of a stored image (§10.1): on the CDN when one is configured, otherwise the file the
   * local driver put in public/ under the base path. Use it for <img>, srcset and fetches.
   */
  function mediaUrl(key: string): string {
    const file = key.replace(/^\/+/, '');
    return cfg.mediaBaseUrl ? `${cfg.mediaBaseUrl}/${file}` : withBasePath(paths.media(file));
  }

  /** Public address of a stored image, for Open Graph, sitemaps, structured data and exports. */
  function absoluteMediaUrl(key: string): string {
    const file = key.replace(/^\/+/, '');
    return cfg.mediaBaseUrl ? `${cfg.mediaBaseUrl}/${file}` : absoluteUrl(paths.media(file));
  }

  /** Internal paths. New address types are added here, never assembled in pages (§17.4). */
  const paths = {
    /** Language entry at the base path itself; also the x-default (§8.2). */
    languageEntry: () => '/',
    home: (locale: string) => `/${locale}/`,
    prompts: (locale: string) => `/${locale}/prompts/`,
    /** The list with filter conditions; `fragment` comes from the feed's formatQuery ("#use=poster"). */
    promptsFiltered: (locale: string, fragment: string) => `/${locale}/prompts/${fragment}`,
    /** Page 1 is the list itself (§9.4). */
    promptsPage: (locale: string, page: number) =>
      page <= 1 ? `/${locale}/prompts/` : `/${locale}/prompts/page/${page}/`,
    /** Every filter at once (§9.4, §11.7); conditions in the fragment, as on the list ("#use=poster"). noindex. */
    explore: (locale: string, fragment = '') => `/${locale}/explore/${fragment}`,
    /** Works saved on this device (§11.5). noindex. */
    favorites: (locale: string) => `/${locale}/favorites/`,
    prompt: (locale: string, slug: string) => `/${locale}/prompts/${slug}/`,
    promptMarkdown: (locale: string, slug: string) => `/${locale}/prompts/${slug}/index.md`,
    templates: (locale: string) => `/${locale}/templates/`,
    template: (locale: string, slug: string) => `/${locale}/templates/${slug}/`,
    /** The template's editor filled in with values; `fragment` comes from the editor's encodeShare (§11.8.4). */
    templateFilled: (locale: string, slug: string, fragment: string) => `/${locale}/templates/${slug}/#${fragment}`,
    templateMarkdown: (locale: string, slug: string) => `/${locale}/templates/${slug}/index.md`,
    /** Index of the editorial collections (§9.1). */
    collections: (locale: string) => `/${locale}/collections/`,
    collection: (locale: string, slug: string) => `/${locale}/collections/${slug}/`,
    /** Category, style and use-case topic pages (§9.1); `segment` is categories, styles or use-cases. */
    topic: (locale: string, segment: 'categories' | 'styles' | 'use-cases', slug: string) =>
      `/${locale}/${segment}/${slug}/`,
    /** Content pages such as about and license (§9.1). */
    page: (locale: string, slug: string) => `/${locale}/${slug}/`,
    /** The search page (§11.8.6); `query` prefills it (`?q=`, §11.6.1). noindex. */
    search: (locale: string, query?: string) =>
      query?.trim() ? `/${locale}/search/?q=${encodeURIComponent(query.trim())}` : `/${locale}/search/`,
    /**
     * Images kept by the local media driver under public/ (§10.1); keys start with "media/".
     * Pages use mediaUrl / absoluteMediaUrl, which switch to the CDN when one is configured.
     */
    media: (key: string) => `/${key.replace(/^\/+/, '')}`,
    /** Per-locale error pages, referenced by host error_page rules (§4.1). */
    notFound: (locale: string) => `/${locale}/404/`,
    gone: (locale: string) => `/${locale}/410/`,
    /**
     * Shown when the language menu asks for a version that does not exist (§11.8.7). `fragment`
     * names the page and the languages that have it; see `missingTranslationFragment`. noindex.
     */
    missingTranslation: (locale: string, fragment = '') => `/${locale}/translation-missing/${fragment}`,
    /** Files written by content:build into public/generated/. */
    generated: (file: string) => `/generated/${file.replace(/^\/+/, '')}`,
    /** Site icon (src/app/icon.svg), also the Organization logo in structured data (§9.6). */
    siteIcon: () => '/icon.svg',
    /** Sitemap index at the base path: one sitemap per indexable locale (§9.3). */
    sitemapIndex: () => '/sitemap.xml',
    /** A locale's sitemap. Not "sitemap.xml": Next.js reserves that name below the root for metadata routes. */
    sitemap: (locale: string) => `/${locale}/sitemap-pages.xml`,
    /** At the host root only when the site is deployed there; see robots.mode (§15.4.3). */
    robots: () => '/robots.txt',
    /** Site summary for AI tools (§9.10.4). */
    llms: () => '/llms.txt',
  };

  return { withBasePath, stripBasePath, absoluteUrl, mediaUrl, absoluteMediaUrl, paths };
}
