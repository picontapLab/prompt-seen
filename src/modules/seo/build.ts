import type { Metadata } from 'next';
import type { Alternate, ImageRef, ImageVariant } from '@/modules/content/types';

// Page metadata (design doc §9.3): title, description, self-referencing canonical, hreflang for
// published versions only, Open Graph and Twitter cards. Pure: every address is built by the
// functions in `SeoContext`, so the rules are tested without a build configuration. Pages call
// the wrappers in ./index.ts from generateMetadata, never assemble these fields themselves.

export type SeoLocale = { code: string; htmlLang: string };

export type SeoContext = {
  siteName: string;
  /** The default locale's code; its version is the x-default of an entry (§8.2). */
  defaultLocale: string;
  /** Registry entries of the locales built in this run. */
  locales: readonly SeoLocale[];
  /** Internal path → canonical URL (`@/modules/url`). */
  absoluteUrl: (path: string) => string;
  /** Image variant → URL on the canonical host (`@/modules/media`). */
  absoluteImageUrl: (variant: ImageVariant) => string;
};

export type PageSeo = {
  /** Internal path of this page in this locale. */
  path: string;
  locale: SeoLocale;
  /** Full document title, already formatted ("{title} · {kind} · {site}", §11.9). */
  documentTitle: string;
  /** Shorter title for share cards: the entry title alone. */
  title: string;
  description: string;
  /** Every built version of this page, this one included. Empty for pages in one locale only. */
  alternates: readonly Alternate[];
  /** Share image: the `og` variant is used (1200 × 630, cropped at the focal point, §9.7). */
  image?: ImageRef | null;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
};

/**
 * Open Graph locales are `language_TERRITORY` (ogp.me). BCP 47 tags in the registry carry a
 * region only where it matters (pt-BR); others get the territory their audience centres on.
 * Script subtags map to the conventional territory: zh-Hans → zh_CN, zh-Hant → zh_TW.
 */
const OG_TERRITORY: Record<string, string> = {
  en: 'en_US',
  'zh-Hans': 'zh_CN',
  'zh-Hant': 'zh_TW',
  es: 'es_ES',
  'pt-BR': 'pt_BR',
  ja: 'ja_JP',
  ko: 'ko_KR',
  de: 'de_DE',
  fr: 'fr_FR',
  ru: 'ru_RU',
  it: 'it_IT',
  id: 'id_ID',
  ar: 'ar_AR',
};

export function ogLocale(htmlLang: string): string {
  return OG_TERRITORY[htmlLang] ?? htmlLang.replace('-', '_');
}

export function buildPageMetadata(page: PageSeo, ctx: SeoContext): Metadata {
  const canonical = ctx.absoluteUrl(page.path);
  const byCode = new Map(ctx.locales.map((l) => [l.code, l]));

  // hreflang lists the versions this build publishes, this page included, so every version
  // points at every other one (§8.4, §9.3). Versions in locales outside this build are dropped.
  const versions = page.alternates
    .map((a) => ({ locale: byCode.get(a.locale), path: a.path }))
    .filter((a): a is { locale: SeoLocale; path: string } => !!a.locale);
  if (!versions.some((v) => v.locale.code === page.locale.code))
    versions.unshift({ locale: page.locale, path: page.path });
  const languages: Record<string, string> = {};
  for (const v of versions) languages[v.locale.htmlLang] = ctx.absoluteUrl(v.path);
  const fallback = versions.find((v) => v.locale.code === ctx.defaultLocale);
  if (versions.length > 1 && fallback) languages['x-default'] = ctx.absoluteUrl(fallback.path);

  const og = page.image?.variants.og;
  const images = og
    ? [{ url: ctx.absoluteImageUrl(og), width: og.width, height: og.height, alt: page.image!.alt }]
    : undefined;
  const type = page.type ?? 'website';

  return {
    title: { absolute: page.documentTitle },
    description: page.description,
    alternates: { canonical, languages },
    openGraph: {
      type,
      url: canonical,
      siteName: ctx.siteName,
      title: page.title,
      description: page.description,
      locale: ogLocale(page.locale.htmlLang),
      alternateLocale: versions
        .filter((v) => v.locale.code !== page.locale.code)
        .map((v) => ogLocale(v.locale.htmlLang)),
      ...(images && { images }),
      ...(type === 'article' && {
        ...(page.publishedTime && { publishedTime: page.publishedTime }),
        ...(page.modifiedTime && { modifiedTime: page.modifiedTime }),
      }),
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title: page.title,
      description: page.description,
      ...(images && { images: images.map((i) => ({ url: i.url, alt: i.alt })) }),
    },
  };
}
