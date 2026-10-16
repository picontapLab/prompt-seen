// Shared by Next.js code and the Node build scripts. In Next.js the
// NEXT_PUBLIC_* values are inlined at build time (see next.config.ts).
export const BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.BASE_PATH ?? '/prompt-seen';
export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? process.env.SITE_ORIGIN ?? 'https://example.com';
export const SITE_NAME = 'Prompt Seen';

export const LOCALES = [
  { code: 'en', prefix: 'en', htmlLang: 'en', name: 'English' },
  { code: 'zh-Hans', prefix: 'zh-hans', htmlLang: 'zh-Hans', name: '简体中文' },
];

export function localeByPrefix(prefix) {
  return LOCALES.find((l) => l.prefix === prefix);
}

/** Internal path (no basePath) -> path a plain <a>, fetch or pushState must use. */
export function withBasePath(path) {
  return BASE_PATH + path;
}

/** Strip basePath from location.pathname. */
export function stripBasePath(pathname) {
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH) return '/';
  return pathname.startsWith(BASE_PATH + '/') ? pathname.slice(BASE_PATH.length) : pathname;
}

/** Absolute public URL for canonical / hreflang / sitemap / JSON-LD. */
export function absUrl(path) {
  return SITE_ORIGIN + BASE_PATH + path;
}

export const listPath = (prefix) => `/${prefix}/prompts/`;
export const detailPath = (prefix, slug) => `/${prefix}/prompts/${slug}/`;
export const markdownPath = (prefix, slug) => `/${prefix}/prompts/${slug}/index.md`;
export const templatesPath = (prefix) => `/${prefix}/templates/`;
export const popupJsonPath = (prefix, slug) => `/generated/${prefix}/prompts/${slug}.json`;

const DETAIL_RE = /^\/([a-z-]+)\/prompts\/([a-z0-9-]+)\/?$/;

/** Parse an internal path; returns { prefix, slug } for detail URLs. */
export function matchDetailPath(path) {
  const m = DETAIL_RE.exec(path);
  return m && m[2] !== 'page' ? { prefix: m[1], slug: m[2] } : null;
}
