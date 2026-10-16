import type { MetadataRoute } from 'next';
import { allDetails } from '@/lib/content';
import { LOCALES, absUrl, detailPath, listPath } from '@/lib/site.mjs';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const lists = LOCALES.map((l) => ({
    url: absUrl(listPath(l.prefix)),
    alternates: { languages: Object.fromEntries(LOCALES.map((a) => [a.htmlLang, absUrl(listPath(a.prefix))])) },
  }));
  const details = allDetails().map((d) => ({
    url: absUrl(d.path),
    alternates: {
      languages: Object.fromEntries(LOCALES.map((a) => [a.htmlLang, absUrl(detailPath(a.prefix, d.slug))])),
    },
  }));
  return [{ url: absUrl('/') }, ...lists, ...details];
}
