import 'server-only';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { builtLocales, config, type LocaleEntry } from '@/config';
import type { Alternate, PromptDetail, TemplateDetail } from '@/modules/content/types';
import { absoluteImageUrl } from '@/modules/media';
import { absoluteUrl } from '@/modules/url';
import { buildPageMetadata, type PageSeo, type SeoContext } from './build';

// How pages get their metadata (design doc §9.3, §17.3 step 2). Every page's generateMetadata
// returns one of these; none sets title, canonical, hreflang or Open Graph itself:
//
//   export async function generateMetadata({ params }: Props): Promise<Metadata> {
//     const { locale, slug } = await params;
//     const { entry, detail } = loadPrompt(locale, slug);
//     return promptMetadata(detail, entry);
//   }
//
// Step 3b adds structured data and sitemaps next to these (§9.6, §9.7).

export { buildPageMetadata, ogLocale } from './build';
export type { PageSeo, SeoContext } from './build';

const context: SeoContext = {
  siteName: config.siteName,
  defaultLocale: config.defaultLocale,
  locales: builtLocales,
  absoluteUrl,
  absoluteImageUrl,
};

async function documentTitle(locale: LocaleEntry, title: string, kind: 'prompt' | 'template') {
  const t = await getTranslations({ locale: locale.code, namespace: 'detail' });
  return t('documentTitle', { title, kind: t(`kinds.${kind}`), siteName: config.siteName });
}

/** A Prompt detail page: the full page and the popup share it (§9.2, §11.3). */
export async function promptMetadata(detail: PromptDetail, locale: LocaleEntry): Promise<Metadata> {
  return buildPageMetadata(
    {
      path: detail.path,
      locale,
      documentTitle: await documentTitle(locale, detail.seo.title, 'prompt'),
      title: detail.seo.title,
      description: detail.seo.description,
      alternates: detail.alternates,
      image: detail.cover,
      type: 'article',
      publishedTime: detail.createdAt,
      modifiedTime: detail.updatedAt,
    },
    context,
  );
}

/** A template detail page; its share image is the default sample's result (§9.7). */
export async function templateMetadata(detail: TemplateDetail, locale: LocaleEntry): Promise<Metadata> {
  return buildPageMetadata(
    {
      path: detail.path,
      locale,
      documentTitle: await documentTitle(locale, detail.seo.title, 'template'),
      title: detail.seo.title,
      description: detail.seo.description,
      alternates: detail.alternates,
      image: detail.cover,
      type: 'article',
      publishedTime: detail.createdAt,
      modifiedTime: detail.updatedAt,
    },
    context,
  );
}

/** Any other page: `title` is used as is, followed by the site name. */
export function pageMetadata(page: {
  path: string;
  locale: LocaleEntry;
  title: string;
  description: string;
  alternates: readonly Alternate[];
}): Metadata {
  return buildPageMetadata(
    {
      ...page,
      documentTitle: page.title.includes(config.siteName) ? page.title : `${page.title} · ${config.siteName}`,
    } satisfies PageSeo,
    context,
  );
}
