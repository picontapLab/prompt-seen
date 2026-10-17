import { getFormatter, getTranslations } from 'next-intl/server';
import type { LocaleEntry } from '@/config';
import { ClientMessages } from '@/i18n/client-messages';
import { feedBand, feedIndex, feedPage } from '@/modules/feed';
import { EMPTY_QUERY, facetCounts } from '@/modules/feed/query';
import { ExpandableIntro } from './ExpandableIntro';
import { Feed } from './Feed';
import { FilterBar } from './FilterBar';
import { HideWhenFiltered, ListProvider } from './ListProvider';
import styles from './PromptList.module.css';
import { ShowcaseBand } from './ShowcaseBand';

/**
 * The Prompt list at /{locale}/prompts/ and /page/{n}/ (design doc §9.4, §11.8.2): page head,
 * the showcase band on the first page, the sticky filter bar and the continuous feed. The HTML
 * of every page holds that page's cards and real links to every page, so crawlers reach every
 * prompt without scrolling or scripts.
 */
export async function PromptList({ locale, page }: { locale: LocaleEntry; page: number }) {
  const t = await getTranslations({ locale: locale.code, namespace: 'feed' });
  const format = await getFormatter({ locale: locale.code });
  const data = feedPage(locale.code, page);
  const index = feedIndex(locale.code);
  const band = page === 1 ? feedBand(locale.code) : null;

  return (
    <div className="container" data-page="prompt-list" data-list-page={page}>
      <header className={styles.head}>
        <div className={styles.titles}>
          <h1 className={styles.title}>{t('title')}</h1>
          <ExpandableIntro text={t('intro')} more={t('introMore')} less={t('introLess')} />
        </div>
        <p className={styles.meta}>
          <span>{t('count', { count: data.total })}</span>
          {data.pageCount > 1 && (
            <span>
              {' · '}
              {t('pageOf', { page: format.number(page), pages: format.number(data.pageCount) })}
            </span>
          )}
        </p>
      </header>
      <ClientMessages namespaces={['feed', 'detail']}>
        <ListProvider locale={{ code: locale.code, pathPrefix: locale.pathPrefix }} buildId={data.buildId}>
          {band && (
            <HideWhenFiltered>
              <ShowcaseBand band={band} locale={locale.code} />
            </HideWhenFiltered>
          )}
          <FilterBar styles={index.styles} useCases={index.useCases} initialCounts={facetCounts(index, EMPTY_QUERY)} />
          <Feed initial={data} />
        </ListProvider>
      </ClientMessages>
    </div>
  );
}
