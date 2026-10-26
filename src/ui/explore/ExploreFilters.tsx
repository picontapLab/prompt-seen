'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { conditionCount, facetCounts, type FacetCounts, type FeedQuery, type Sort } from '@/modules/feed/query';
import { FilterGroups } from '@/ui/gallery/FilterGroups';
import { useList } from '@/ui/gallery/ListProvider';
import { Button } from '@/ui/primitives/Button';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import styles from './Explore.module.css';

type Term = { id: string; label: string };

/**
 * Explore's filters beside the results (design doc §9.4, §11.7, step 4c): every dimension open
 * at once, with the order, the number of results and a way to clear. Every option shows how
 * many works it would leave under the other conditions, and one that would leave none is
 * disabled (FilterGroups). The conditions are the URL fragment, as on the list, so the page
 * can be shared and returns with history. Wide screens only; narrower ones use the list's
 * filter bar (ExploreBody).
 */
export function ExploreFilters({
  styleTerms,
  useCases,
  initialCounts,
}: {
  styleTerms: readonly Term[];
  useCases: readonly Term[];
  initialCounts: FacetCounts;
}) {
  const t = useTranslations('feed.filters');
  const e = useTranslations('explore');
  const format = useFormatter();
  const { query, setQuery, index, loadIndex } = useList();
  // Filtering is what this page is for: the index loads at once, not on intent.
  useEffect(() => void loadIndex().catch(() => {}), [loadIndex]);
  const counts = useMemo(() => (index ? facetCounts(index, query) : initialCounts), [index, query, initialCounts]);
  const set = (patch: Partial<FeedQuery>) => setQuery({ ...query, ...patch });
  const n = conditionCount(query);

  return (
    <section className={styles.filters} aria-labelledby="explore-filters" data-explore-filters="">
      <div className={styles.filtersHead}>
        <h2 id="explore-filters" className={styles.filtersTitle}>
          {e('filters')}
        </h2>
        <span className={styles.resultCount} aria-live="polite" data-results="">
          {t('results', { count: counts.total })}
        </span>
      </div>
      <SegmentedControl<Sort>
        label={t('sort')}
        value={query.sort}
        onChange={(sort) => set({ sort })}
        segments={[
          { id: 'latest', label: t('latest') },
          { id: 'featured', label: t('featured') },
        ]}
      />
      <FilterGroups
        withStyles
        styleTerms={styleTerms}
        useCases={useCases}
        query={query}
        counts={counts}
        onChange={set}
        className={styles.groups}
      />
      {n > 0 && (
        <Button variant="ghost" onPress={() => set({ style: null, use: [], shape: [], ref: [] })}>
          {t('clear')} <span className={styles.count}>{format.number(n)}</span>
        </Button>
      )}
    </section>
  );
}
