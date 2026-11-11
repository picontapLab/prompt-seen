'use client';
import { languageAttributes } from '@/ui/prompt-detail/language';

import { Compass, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { lazy, Suspense, useMemo, useState } from 'react';
import {
  conditionCount,
  facetCounts,
  formatQuery,
  isFiltered,
  type FacetCounts,
  type FeedQuery,
} from '@/modules/feed/query';
import { paths } from '@/modules/url';
import { Button } from '@/ui/primitives/Button';
import buttonStyles from '@/ui/primitives/Button.module.css';
import { ScrollRow } from '@/ui/primitives/ScrollRow';
import styles from './FilterBar.module.css';
import { useList } from './ListProvider';
import { preloadSortSelect, SortSelect } from './SortSelect';

// The list's filter bar (design doc §11.7, §11.8.2, §11.1.9): sticky under the header. Styles
// are text tabs with monospaced counts and the current one underlined in safelight amber; use,
// shape and reference image sit in a panel of chips; sort is newest first or featured. Every
// option shows how many results it would give with the other conditions, and one that would
// give none is disabled. Narrow screens get one "Filters (n)" button for everything.
//
// The panel, the active chips and the sort list are React Aria collections and overlays the
// list's first load does not need (§16.4): their code loads when the pointer or focus reaches
// the bar, and they mount when first used.

const loadPanel = () => import('./FilterPanel');
const FilterPanel = lazy(loadPanel);
const loadChips = () => import('@/ui/primitives/Chip');
const RemovableChips = lazy(() => loadChips().then((m) => ({ default: m.RemovableChips })));

type Term = { id: string; label: string; labelLocale?: string | null };

export type FilterBarProps = {
  styles: readonly Term[];
  useCases: readonly Term[];
  /** Counts for the unfiltered list, from the build, until the index has loaded. */
  initialCounts: FacetCounts;
};

export function FilterBar({ styles: styleTerms, useCases, initialCounts }: FilterBarProps) {
  const t = useTranslations('feed.filters');
  const e = useTranslations('explore');
  const r = useTranslations('primitives.scrollRow');
  const format = useFormatter();
  const { locale, pageAddresses, query, setQuery, index, loadIndex } = useList();
  const [panel, setPanel] = useState<'panel' | 'all' | null>(null);
  // Mounted on first open and kept, so closing animates (as the menu sheet does).
  const [panelMounted, setPanelMounted] = useState(false);
  const counts = useMemo(() => (index ? facetCounts(index, query) : initialCounts), [index, query, initialCounts]);
  const warm = () => {
    void loadIndex().catch(() => {});
    void loadPanel();
    void loadChips();
    preloadSortSelect();
  };
  const openPanel = (which: 'panel' | 'all') => {
    setPanelMounted(true);
    setPanel(which);
  };

  const set = (patch: Partial<FeedQuery>) => setQuery({ ...query, ...patch });
  const noMatch = t('noMatch');
  const n = conditionCount(query);
  const panelCount = query.use.length + query.shape.length + query.ref.length;

  const styleLabel = (id: string) => styleTerms.find((s) => s.id === id)?.label ?? id;
  const labelOfUse = (id: string) => useCases.find((u) => u.id === id)?.label ?? id;
  const active = [
    ...(query.style
      ? [
          {
            id: `style:${query.style}`,
            label: styleLabel(query.style),
            labelLocale: styleTerms.find((s) => s.id === query.style)?.labelLocale,
          },
        ]
      : []),
    ...query.use.map((u) => ({
      id: `use:${u}`,
      label: labelOfUse(u),
      labelLocale: useCases.find((s) => s.id === u)?.labelLocale,
    })),
    ...query.shape.map((s) => ({ id: `shape:${s}`, label: t(`shapes.${s}`) })),
    ...query.ref.map((r) => ({ id: `ref:${r}`, label: t(`refs.${r}`) })),
  ];
  const remove = (keys: Set<string | number>) => {
    const next = { ...query };
    for (const key of keys) {
      const [dim, value] = String(key).split(':') as [string, string];
      if (dim === 'style') next.style = null;
      if (dim === 'use') next.use = next.use.filter((v) => v !== value);
      if (dim === 'shape') next.shape = next.shape.filter((v) => v !== value);
      if (dim === 'ref') next.ref = next.ref.filter((v) => v !== value);
    }
    setQuery(next);
  };
  const clear = () => setQuery({ ...query, style: null, use: [], shape: [], ref: [] });

  return (
    <div className={styles.bar} onPointerEnter={warm} onFocus={warm} data-filtered={isFiltered(query) || undefined}>
      <div className={styles.row}>
        {/* Style tabs (wide screens): one style at a time, "All" clears it (§11.1.9). */}
        <ScrollRow
          role="group"
          aria-label={t('style')}
          className={styles.tabsRow}
          scrollerClassName={styles.tabs}
          labels={{ previous: r('previous'), next: r('next') }}
        >
          <button type="button" className={styles.tab} aria-pressed={!query.style} onClick={() => set({ style: null })}>
            {t('all')} <span className={styles.count}>{format.number(counts.styleAll)}</span>
          </button>
          {styleTerms.map((s) => {
            const count = counts.style[s.id] ?? 0;
            const selected = query.style === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={styles.tab}
                aria-pressed={selected}
                disabled={!selected && count === 0}
                title={!selected && count === 0 ? noMatch : undefined}
                onClick={() => set({ style: selected ? null : s.id })}
              >
                <span {...languageAttributes(s.labelLocale)}>{s.label}</span>{' '}
                <span className={styles.count}>{format.number(count)}</span>
              </button>
            );
          })}
        </ScrollRow>
        <div className={styles.tools}>
          <Button
            className={styles.wideOnly}
            variant="secondary"
            onPress={() => openPanel('panel')}
            icon={<SlidersHorizontal aria-hidden="true" />}
          >
            {panelCount ? t('panelCount', { count: panelCount }) : t('panel')}
          </Button>
          <Button
            className={styles.narrowOnly}
            variant="secondary"
            onPress={() => openPanel('all')}
            icon={<SlidersHorizontal aria-hidden="true" />}
          >
            {n ? t('openCount', { count: n }) : t('open')}
          </Button>
          {pageAddresses && (
            // Every filter at once, with these conditions (step 4c, §9.4).
            <Link
              href={paths.explore(locale.pathPrefix, formatQuery(query))}
              prefetch={false}
              className={`${buttonStyles.button} ${buttonStyles.ghost} ${buttonStyles.link} ${styles.wideOnly}`}
              data-explore-link=""
            >
              <span className={buttonStyles.content}>
                <Compass aria-hidden="true" />
                {e('open')}
              </span>
            </Link>
          )}
          <SortSelect
            className={styles.sort}
            label={t('sort')}
            options={[
              { id: 'latest', label: t('latest') },
              { id: 'featured', label: t('featured') },
            ]}
            selectedKey={query.sort}
            onSelectionChange={(key) => set({ sort: key === 'featured' ? 'featured' : 'latest' })}
          />
        </div>
      </div>

      {active.length > 0 && (
        <div className={styles.active}>
          <span className={styles.results} aria-live="polite">
            {t('results', { count: counts.total })}
          </span>
          {/* Before the chips, which load on demand: arriving later, they must not move it. */}
          <Button variant="ghost" onPress={clear}>
            {t('clear')}
          </Button>
          <Suspense>
            <RemovableChips label={t('active')} labelHidden items={active} onRemove={remove} />
          </Suspense>
        </div>
      )}

      {panelMounted && (
        <Suspense>
          <FilterPanel
            panel={panel}
            onClose={() => setPanel(null)}
            styleTerms={styleTerms}
            useCases={useCases}
            query={query}
            counts={counts}
            onChange={set}
            onClear={clear}
          />
        </Suspense>
      )}
    </div>
  );
}
