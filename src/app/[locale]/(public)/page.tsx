import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { config, localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { homeMetadata, homeStructuredData, JsonLd } from '@/modules/seo';
import { HomeBody, homeModel } from '@/ui/home/HomeBody';

// The home page of a locale (design doc §11.8.1): the work on show, its annotated prompt and
// the ways into the library.
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const entry = localeByPrefix(locale)!;
  const t = await getTranslations({ locale: entry.code, namespace: 'home' });
  return homeMetadata(entry, {
    documentTitle: t('documentTitle', { siteName: config.siteName }),
    title: config.siteName,
    description: t('description'),
    // The share card shows the work on show (§9.7: the og variant, cropped at its focal point).
    image: homeModel(entry).onShow[0]?.cover ?? null,
  });
}

export default async function LocaleHome({ params }: Props) {
  const { locale } = await params;
  const entry = enterLocale(locale);
  return (
    <>
      {/* WebSite and Organization (§9.6). */}
      <JsonLd data={homeStructuredData(entry)} />
      <HomeBody locale={entry} model={homeModel(entry)} />
    </>
  );
}
