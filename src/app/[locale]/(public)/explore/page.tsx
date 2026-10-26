import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { builtLocales, localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { pageMetadata } from '@/modules/seo';
import { paths } from '@/modules/url';
import { ExploreBody } from '@/ui/explore/ExploreBody';

// Every filter at once (design doc §9.1, §9.4): noindex and outside the sitemaps. Conditions
// live in the fragment, so this one static page per language serves every combination.
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const entry = localeByPrefix(locale)!;
  const t = await getTranslations({ locale: entry.code, namespace: 'explore' });
  return pageMetadata({
    path: paths.explore(entry.pathPrefix),
    locale: entry,
    title: t('documentTitle'),
    description: t('description'),
    alternates: builtLocales.map((l) => ({ locale: l.code, path: paths.explore(l.pathPrefix) })),
    noindex: true,
  });
}

export default async function ExploreRoute({ params }: Props) {
  const { locale } = await params;
  const entry = enterLocale(locale);
  return <ExploreBody locale={entry} />;
}
