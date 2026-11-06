import 'server-only';
import { getTranslations } from 'next-intl/server';
import { config, type LocaleEntry } from '@/config';
import { homeMetadata, homeStructuredData, JsonLd } from '@/modules/seo';
import { HomeBody, homeModel } from './HomeBody';

// The root and locale routes share their content and metadata, including the English alias.
export async function homePageMetadata(locale: LocaleEntry) {
  const t = await getTranslations({ locale: locale.code, namespace: 'home' });
  return homeMetadata(locale, {
    documentTitle: t('documentTitle', { siteName: config.siteName }),
    title: config.siteName,
    description: t('description'),
    image: homeModel(locale).onShow[0]?.cover ?? null,
  });
}

export function HomePage({ locale }: { locale: LocaleEntry }) {
  return (
    <>
      <JsonLd data={homeStructuredData(locale)} />
      <HomeBody locale={locale} model={homeModel(locale)} />
    </>
  );
}
