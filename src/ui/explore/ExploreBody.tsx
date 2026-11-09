import 'server-only';
import { getTranslations } from 'next-intl/server';
import { config, type LocaleEntry } from '@/config';
import { ClientMessages } from '@/i18n/client-messages';
import { feedIndex, feedPage } from '@/modules/feed';
import { EMPTY_QUERY, facetCounts } from '@/modules/feed/query';
import { paths } from '@/modules/url';
import { popupLocale } from '@/ui/detail-popup/logic';
import { PopupHost } from '@/ui/detail-popup/PopupHost';
import { Feed } from '@/ui/gallery/Feed';
import { FilterBar } from '@/ui/gallery/FilterBar';
import { ListProvider } from '@/ui/gallery/ListProvider';
import styles from './Explore.module.css';
import { ExploreFilters } from './ExploreFilters';

/**
 * /{locale}/explore/ (design doc §9.1, §9.4, §11.7; noindex): every filter at once over the
 * whole Prompt list. Built from the list's own parts (§17.4): the slim index for results and
 * counts, its page files for cards, the same continuous feed and detail popup. Conditions live
 * in the fragment, so no combination becomes a crawlable address; the page has one address and
 * does not follow the list's page numbers. The HTML holds the newest works, as the list's first
 * page does, so it reads without JavaScript too.
 */
export async function ExploreBody({ locale }: { locale: LocaleEntry }) {
  const t = await getTranslations({ locale: locale.code, namespace: 'explore' });
  const data = feedPage(locale.code, 1);
  const index = feedIndex(locale.code);
  const initialCounts = facetCounts(index, EMPTY_QUERY);

  return (
    <div className="container" data-page="explore">
      <header className={styles.head}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.intro}>{t('intro')}</p>
      </header>
      <ClientMessages namespaces={['feed', 'detail', 'popup', 'favorites', 'shortcuts', 'explore']}>
        <ListProvider
          key={`${locale.code}:${config.buildId}`}
          locale={{ code: locale.code, pathPrefix: locale.pathPrefix }}
          buildId={data.buildId}
          listPath={paths.explore(locale.pathPrefix)}
          pageAddresses={false}
        >
          <PopupHost key={locale.code} locale={popupLocale(locale)} siteName={config.siteName}>
            <div className={styles.layout}>
              <aside className={styles.aside}>
                <ExploreFilters styleTerms={index.styles} useCases={index.useCases} initialCounts={initialCounts} />
              </aside>
              <div className={styles.results}>
                {/* Below 1024 px the list's own bar: style tabs, the panel and the active chips. */}
                <div className={styles.bar}>
                  <FilterBar styles={index.styles} useCases={index.useCases} initialCounts={initialCounts} />
                </div>
                <Feed initial={data} />
              </div>
            </div>
          </PopupHost>
        </ListProvider>
      </ClientMessages>
    </div>
  );
}
