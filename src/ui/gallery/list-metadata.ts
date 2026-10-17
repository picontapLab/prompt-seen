import 'server-only';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { builtLocales, type LocaleEntry } from '@/config';
import { feedIndex, feedPage } from '@/modules/feed';
import { collectionStructuredData, pageMetadata } from '@/modules/seo';
import { listPageWorks } from '@/modules/seo/sitemaps';
import { paths } from '@/modules/url';

/**
 * Metadata of list page n (design doc §9.3, §9.4): its own canonical, never page 1's, and
 * hreflang for the locales whose list has that page too.
 */
export async function listMetadata(locale: LocaleEntry, page: number): Promise<Metadata> {
  const t = await getTranslations({ locale: locale.code, namespace: 'feed' });
  return pageMetadata({
    path: paths.promptsPage(locale.pathPrefix, page),
    locale,
    title: page > 1 ? t('documentTitlePage', { page }) : t('documentTitle'),
    description: t('description'),
    alternates: builtLocales
      .filter((l) => feedIndex(l.code).pageCount >= page)
      .map((l) => ({ locale: l.code, path: paths.promptsPage(l.pathPrefix, page) })),
  });
}

/**
 * Structured data of list page n (§9.6): CollectionPage with this page's works as an ItemList,
 * in the order the page shows them and numbered across pages. The list has no breadcrumb.
 */
export async function listStructuredData(locale: LocaleEntry, page: number) {
  const t = await getTranslations({ locale: locale.code, namespace: 'feed' });
  const data = feedPage(locale.code, page);
  return collectionStructuredData({
    path: paths.promptsPage(locale.pathPrefix, page),
    locale,
    name: t('title'),
    description: t('description'),
    items: listPageWorks(data).map((w) => ({ path: w.path, name: w.title })),
    offset: data.offset,
  });
}
