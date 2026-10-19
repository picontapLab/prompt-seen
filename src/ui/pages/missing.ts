// The missing-translation page's address fragment (design doc §11.8.7): which page the visitor
// came from and which languages have it. Shared by the language menu, which writes it, and the
// page, which reads it. No 'use client': plain functions for both sides.

export type MissingInfo = {
  /** Internal path of the page the visitor came from, e.g. "/en/prompts/ink-portrait/". */
  from: string;
  /** Registry codes of the locales with a version of that page. */
  have: string[];
};

/** "#from=/en/prompts/x/&have=en,zh-Hans" */
export function missingTranslationFragment(info: MissingInfo): string {
  const params = new URLSearchParams({ from: info.from, have: info.have.join(',') });
  return `#${params.toString()}`;
}

/**
 * Reads the fragment; returns null unless `from` is an internal path of this site with a known
 * locale prefix, so the page never links anywhere else (no open redirect).
 */
export function parseMissingFragment(
  hash: string,
  locales: readonly { code: string; pathPrefix: string }[],
): MissingInfo | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const from = params.get('from') ?? '';
  if (!/^\/[a-z0-9-]+\/[A-Za-z0-9\-._~/%]*$/.test(from) || from.includes('//') || from.includes('..')) return null;
  const prefix = from.split('/')[1];
  if (!locales.some((l) => l.pathPrefix === prefix)) return null;
  const codes = new Set(locales.map((l) => l.code));
  const have = [...new Set((params.get('have') ?? '').split(',').filter((c) => codes.has(c)))];
  return { from, have };
}

/** The same page under another locale's prefix. */
export function pathInLocale(from: string, prefix: string): string {
  const [, , ...rest] = from.split('/');
  return `/${[prefix, ...rest].join('/')}`;
}
