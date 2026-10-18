// Sitemap XML (design doc §9.3, §9.7; sitemaps.org protocol and Google's image extension).
// Pure: callers pass absolute URLs. The sitemap index at the base path lists one sitemap per
// indexable locale; each lists that locale's published pages, with the main image of a page
// in <image:image> (Google reads only <image:loc>; title and caption were retired).

export type SitemapUrl = {
  loc: string;
  /** YYYY-MM-DD: when the content last changed, never the build time (§9.3). */
  lastmod?: string | null;
  /** Absolute URLs of the page's main images. */
  images?: readonly string[];
};

export type SitemapRef = { loc: string; lastmod?: string | null };

/** Google's per-file limit; a locale beyond it needs split sitemaps (§19.4). */
export const SITEMAP_URL_LIMIT = 50_000;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const HEAD = '<?xml version="1.0" encoding="UTF-8"?>';

export function urlsetXml(urls: readonly SitemapUrl[]): string {
  if (urls.length > SITEMAP_URL_LIMIT) throw new Error(`a sitemap holds at most ${SITEMAP_URL_LIMIT} URLs`);
  const withImages = urls.some((u) => u.images?.length);
  const lines = [
    HEAD,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${
      withImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ''
    }>`,
  ];
  for (const u of urls) {
    lines.push('  <url>', `    <loc>${escapeXml(u.loc)}</loc>`);
    if (u.lastmod) lines.push(`    <lastmod>${escapeXml(u.lastmod)}</lastmod>`);
    for (const image of u.images ?? [])
      lines.push('    <image:image>', `      <image:loc>${escapeXml(image)}</image:loc>`, '    </image:image>');
    lines.push('  </url>');
  }
  lines.push('</urlset>', '');
  return lines.join('\n');
}

export function sitemapIndexXml(sitemaps: readonly SitemapRef[]): string {
  const lines = [HEAD, '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const s of sitemaps) {
    lines.push('  <sitemap>', `    <loc>${escapeXml(s.loc)}</loc>`);
    if (s.lastmod) lines.push(`    <lastmod>${escapeXml(s.lastmod)}</lastmod>`);
    lines.push('  </sitemap>');
  }
  lines.push('</sitemapindex>', '');
  return lines.join('\n');
}

/** The latest of some YYYY-MM-DD dates, or null when there are none. */
export function latest(dates: Iterable<string | null | undefined>): string | null {
  let max: string | null = null;
  for (const d of dates) if (d && (!max || d > max)) max = d;
  return max;
}
