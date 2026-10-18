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

export type UrlConfig = {
  origin: string;
  basePath: string;
  urlPattern: string;
  /** Every registered URL prefix, used to recognise the locale segment of a path. */
  localePrefixes: readonly string[];
};

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

  /** Internal paths. New address types are added here, never assembled in pages (§17.4). */
  const paths = {
    /** Language entry at the base path itself; also the x-default (§8.2). */
    languageEntry: () => '/',
    home: (locale: string) => `/${locale}/`,
    prompts: (locale: string) => `/${locale}/prompts/`,
    /** Page 1 is the list itself (§9.4). */
    promptsPage: (locale: string, page: number) =>
      page <= 1 ? `/${locale}/prompts/` : `/${locale}/prompts/page/${page}/`,
    prompt: (locale: string, slug: string) => `/${locale}/prompts/${slug}/`,
    promptMarkdown: (locale: string, slug: string) => `/${locale}/prompts/${slug}/index.md`,
    templates: (locale: string) => `/${locale}/templates/`,
    template: (locale: string, slug: string) => `/${locale}/templates/${slug}/`,
    /** The template's editor filled in with values; `fragment` comes from the editor's encodeShare (§11.8.4). */
    templateFilled: (locale: string, slug: string, fragment: string) => `/${locale}/templates/${slug}/#${fragment}`,
    templateMarkdown: (locale: string, slug: string) => `/${locale}/templates/${slug}/index.md`,
    collection: (locale: string, slug: string) => `/${locale}/collections/${slug}/`,
    /** Category, style and use-case topic pages (§9.1); `segment` is categories, styles or use-cases. */
    topic: (locale: string, segment: 'categories' | 'styles' | 'use-cases', slug: string) =>
      `/${locale}/${segment}/${slug}/`,
    /** Content pages such as about and license (§9.1). */
    page: (locale: string, slug: string) => `/${locale}/${slug}/`,
    /** Images kept by the local media driver under public/ (§10.1); keys start with "media/". */
    media: (key: string) => `/${key.replace(/^\/+/, '')}`,
    /** Per-locale error pages, referenced by host error_page rules (§4.1). */
    notFound: (locale: string) => `/${locale}/404/`,
    gone: (locale: string) => `/${locale}/410/`,
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

  return { withBasePath, stripBasePath, absoluteUrl, paths };
}
