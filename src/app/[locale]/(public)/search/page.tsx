import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { builtLocales, localeByPrefix } from '@/config';
import { ClientMessages } from '@/i18n/client-messages';
import { enterLocale } from '@/i18n/locale';
import { pageMetadata } from '@/modules/seo';
import { paths } from '@/modules/url';
import { SearchPage } from '@/ui/search/SearchPage';
import styles from '@/ui/search/SearchPage.module.css';

// The search page (design doc §9.1, §11.8.6): static and noindex; the query is `?q=`, read in
// the browser (§11.6.1), so one HTML file serves every query.
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const entry = localeByPrefix(locale)!;
  const t = await getTranslations({ locale: entry.code, namespace: 'search.page' });
  return pageMetadata({
    path: paths.search(entry.pathPrefix),
    locale: entry,
    title: t('documentTitle'),
    description: t('description'),
    // Every language has a search page; the language switch keeps visitors on it.
    alternates: builtLocales.map((l) => ({ locale: l.code, path: paths.search(l.pathPrefix) })),
    noindex: true,
  });
}

export default async function SearchRoute({ params }: Props) {
  const { locale } = await params;
  const entry = enterLocale(locale);
  const t = await getTranslations('search.page');
  return (
    <div className="container" data-width="reading" data-page="search">
      <header className={styles.head}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.intro}>{t('intro')}</p>
      </header>
      <ClientMessages namespaces={['search']}>
        <SearchPage locale={entry} />
      </ClientMessages>
    </div>
  );
}
