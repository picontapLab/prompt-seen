import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { builtLocales, config, localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { absoluteUrl, paths } from '@/modules/url';

// Placeholder home per locale (step 1a). Step 4b replaces it with the first screen (§11.8.1);
// step 2 moves metadata into the seo module.
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const entry = localeByPrefix(locale)!;
  const t = await getTranslations({ locale: entry.code, namespace: 'common.placeholder' });
  return {
    title: t('title', { siteName: config.siteName }),
    alternates: {
      canonical: absoluteUrl(paths.home(locale)),
      languages: {
        ...Object.fromEntries(builtLocales.map((l) => [l.htmlLang, absoluteUrl(paths.home(l.pathPrefix))])),
        'x-default': absoluteUrl(paths.languageEntry()),
      },
    },
  };
}

export default async function LocaleHome({ params }: Props) {
  const { locale } = await params;
  const entry = enterLocale(locale);
  const t = await getTranslations('common.placeholder');
  return (
    <main data-page="placeholder-home" data-locale={entry.code}>
      <h1>{t('title', { siteName: config.siteName })}</h1>
      <p>{t('body', { language: entry.nativeName })}</p>
    </main>
  );
}
