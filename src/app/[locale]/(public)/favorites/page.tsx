import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { builtLocales, localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { pageMetadata } from '@/modules/seo';
import { paths } from '@/modules/url';
import { FavoritesBody } from '@/ui/favorites/FavoritesBody';

// Works saved on this device (design doc §9.1, §11.5): noindex and outside the sitemaps; one
// static page per language, filled in the browser from local storage.
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const entry = localeByPrefix(locale)!;
  const t = await getTranslations({ locale: entry.code, namespace: 'favorites.page' });
  return pageMetadata({
    path: paths.favorites(entry.pathPrefix),
    locale: entry,
    title: t('documentTitle'),
    description: t('description'),
    // Every language has one; the language switch keeps visitors on it.
    alternates: builtLocales.map((l) => ({ locale: l.code, path: paths.favorites(l.pathPrefix) })),
    noindex: true,
  });
}

export default async function FavoritesRoute({ params }: Props) {
  const { locale } = await params;
  const entry = enterLocale(locale);
  return <FavoritesBody locale={entry} />;
}
