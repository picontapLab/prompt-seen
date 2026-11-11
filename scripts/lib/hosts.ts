// Address changes as host configuration (design doc §9.5; subpath memo §3.3, §7.3). The content
// build resolves redirects.yaml, the deleted-entry list, archived locale versions and the first
// list page into internal paths (manifest.json); this module turns them into rules for each kind
// of host. Pure: the emitters pass in the manifest and the url module, tests pass in fixtures.

import type { ContentManifest, GoneReason } from '../../src/modules/content/types';

type Url = {
  withBasePath: (path: string) => string;
  absoluteUrl: (path: string) => string;
  paths: { gone: (prefix: string) => string; notFound: (prefix: string) => string };
};
type Locale = { code: string; pathPrefix: string };

/** Public paths (with the base path). Every `from` and `path` is a page address ending in "/". */
export type HostRules = {
  redirects: { from: string; to: string }[];
  gone: { path: string; reason: GoneReason; /** this locale's 410 page */ page: string }[];
};

export function hostRules(
  manifest: Pick<ContentManifest, 'redirects' | 'gone'>,
  url: Url,
  locales: readonly Locale[],
): HostRules {
  const prefixOf = new Map(locales.map((l) => [l.code, l.pathPrefix]));
  return {
    redirects: manifest.redirects.map((r) => ({ from: url.withBasePath(r.from), to: url.withBasePath(r.to) })),
    gone: manifest.gone.flatMap((g) => {
      const prefix = prefixOf.get(g.locale);
      return prefix
        ? [{ path: url.withBasePath(g.path), reason: g.reason, page: url.withBasePath(url.paths.gone(prefix)) }]
        : [];
    }),
  };
}

/** A page address and its form without the trailing slash: hosts see both (§9.5). */
const bothForms = (path: string): string[] =>
  path.endsWith('/') && path.length > 1 ? [path, path.slice(0, -1)] : [path];

/**
 * nginx (the reference host): one exact `location =` per address and form, so these win over
 * the prefix locations of the include. `return 301 /…` with `absolute_redirect off` gives a
 * relative Location carrying the base path (memo §7.4 item 3). A gone address answers 410 with
 * its locale's 410 page, which stays internal.
 */
export function nginxRules(rules: HostRules): string[] {
  return [
    `# 301 from content/redirects.yaml and the list's first page (${rules.redirects.length}; both slash forms).`,
    ...rules.redirects.flatMap((r) => bothForms(r.from).map((from) => `location = ${from} { return 301 ${r.to}; }`)),
    '',
    `# 410 for removed entries and archived language versions (${rules.gone.length}).`,
    ...rules.gone.flatMap((g) =>
      bothForms(g.path).map((path) => `location = ${path} { error_page 410 ${g.page}index.html; return 410; }`),
    ),
  ];
}

/** Cloudflare Pages allows 2,000 static redirects per project; later ones are ignored. */
export const CLOUDFLARE_REDIRECT_LIMIT = 2000;

/** Original full RSC URLs after upload preparation removes their byte-identical copies. */
export function cloudflarePayloadProxies(url: Pick<Url, 'withBasePath'>): readonly [string, string] {
  return [
    `${url.withBasePath('/__next._full.txt')} ${url.withBasePath('/index.txt')} 200`,
    `${url.withBasePath('/')}*/__next._full.txt ${url.withBasePath('/')}:splat/index.txt 200`,
  ];
}

/**
 * Cloudflare Pages `_redirects`. Pages cannot answer 410, so gone addresses fall back to the
 * nearest 404 page (the locale's, see scripts/deploy-cloudflare.ts); Google treats both alike.
 */
export function cloudflareRedirects(rules: HostRules): string[] {
  return rules.redirects.flatMap((r) => bothForms(r.from).map((from) => `${from} ${r.to} 301`));
}

/**
 * Netlify `_redirects`: 301s, gone addresses rewritten to their locale's 410 page with status 404
 * (Netlify documents custom 404 rewrites, not 410), and per-locale 404 pages. Netlify applies a
 * rule only where no file exists, so the catch-alls never hide a page.
 */
export function netlifyRedirects(rules: HostRules, url: Url, locales: readonly Locale[]): string[] {
  return [
    ...rules.redirects.flatMap((r) => bothForms(r.from).map((from) => `${from} ${r.to} 301`)),
    ...rules.gone.flatMap((g) => bothForms(g.path).map((path) => `${path} ${g.page} 404`)),
    ...locales.map(
      (l) => `${url.withBasePath(`/${l.pathPrefix}/`)}* ${url.withBasePath(url.paths.notFound(l.pathPrefix))} 404`,
    ),
    `${url.withBasePath('/')}* ${url.withBasePath('/404.html')} 404`,
  ];
}

/**
 * Vercel `vercel.json`: `trailingSlash` sends the form without a slash to the slash form, then the
 * redirects apply. Vercel has no 410 for static files: gone addresses answer its 404.
 */
export function vercelConfig(rules: HostRules): string {
  return `${JSON.stringify(
    {
      $schema: 'https://openapi.vercel.sh/vercel.json',
      trailingSlash: true,
      redirects: rules.redirects.map((r) => ({ source: r.from, destination: r.to, statusCode: 301 })),
    },
    null,
    2,
  )}\n`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * For hosts without redirect configuration (GitHub Pages, a bare bucket): a page at the old
 * address that moves on at once. Google reads an instant meta refresh as a permanent redirect,
 * though a server redirect is preferred (§9.5); the canonical points at the new address.
 */
export function metaRefreshPage(to: string, canonical: string): string {
  const href = escapeHtml(to);
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${href}</title>`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<meta http-equiv="refresh" content="0; url=${href}">`,
    '</head>',
    `<body><p><a href="${href}">${href}</a></p></body>`,
    '</html>',
    '',
  ].join('\n');
}
