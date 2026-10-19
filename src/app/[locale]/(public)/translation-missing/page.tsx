import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { builtLocales, localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { pageMetadata } from '@/modules/seo';
import { paths } from '@/modules/url';
import { MissingTranslation } from '@/ui/pages/MissingTranslation';
import styles from '@/ui/pages/Pages.module.css';

// Where the language menu goes when the page in view has no version in the chosen language
// (design doc §11.8.7): says so in that language, lists the versions that exist and offers the
// default language's version. Never redirects by itself; noindex and outside the sitemaps.
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const entry = localeByPrefix(locale)!;
  const t = await getTranslations({ locale: entry.code, namespace: 'pages.missing' });
  return pageMetadata({
    path: paths.missingTranslation(locale),
    locale: entry,
    title: t('documentTitle'),
    description: t('generic', { language: entry.nativeName }),
    alternates: [],
    noindex: true,
  });
}

export default async function MissingTranslationPage({ params }: Props) {
  const { locale } = await params;
  const entry = enterLocale(locale);
  const t = await getTranslations('pages.missing');
  const c = await getTranslations('common.errors');
  // "Go to the English version" written in this page's language, for each version.
  const goTo = Object.fromEntries(builtLocales.map((l) => [l.code, t('goTo', { language: l.nativeName })]));
  return (
    <div className="container" data-page="translation-missing" data-locale={entry.code}>
      <header className={styles.errorHead}>
        <h1 className={styles.title}>{t('title', { language: entry.nativeName })}</h1>
        <p className={styles.lead}>{t('generic', { language: entry.nativeName })}</p>
        <MissingTranslation labels={{ available: t('available'), goTo }} />
        <p>
          <Link href={paths.home(locale)}>{c('home', { language: entry.nativeName })}</Link>
        </p>
      </header>
    </div>
  );
}
