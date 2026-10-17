import 'server-only';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { builtLocales, type LocaleEntry } from '@/config';
import { feedIndex } from '@/modules/feed';
import { pageMetadata } from '@/modules/seo';
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
