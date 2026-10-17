'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import {
  conditionCount,
  facetCounts,
  isFiltered,
  REF_OPTIONS,
  type FacetCounts,
  type FeedQuery,
  type RefOption,
} from '@/modules/feed/query';
import { SHAPES, type Shape } from '@/modules/feed/types';
import { Button } from '@/ui/primitives/Button';
import { FilterChip, RemovableChips } from '@/ui/primitives/Chip';
import { Dialog } from '@/ui/primitives/Dialog';
import { Select } from '@/ui/primitives/Select';
import styles from './FilterBar.module.css';
import { useList } from './ListProvider';

// The list's filter bar (design doc §11.7, §11.8.2, §11.1.9): sticky under the header. Styles
// are text tabs with monospaced counts and the current one underlined in safelight amber; use,
// shape and reference image sit in a panel of chips; sort is newest first or featured. Every
// option shows how many results it would give with the other conditions, and one that would
// give none is disabled. Narrow screens get one "Filters (n)" button for everything.

type Term = { id: string; label: string };

export type FilterBarProps = {
  styles: readonly Term[];
  useCases: readonly Term[];
  /** Counts for the unfiltered list, from the build, until the index has loaded. */
  initialCounts: FacetCounts;
};

export function FilterBar({ styles: styleTerms, useCases, initialCounts }: FilterBarProps) {
  const t = useTranslations('feed.filters');
  const format = useFormatter();
  const { query, setQuery, index, loadIndex } = useList();
  const [panel, setPanel] = useState<'panel' | 'all' | null>(null);
  const counts = useMemo(() => (index ? facetCounts(index, query) : initialCounts), [index, query, initialCounts]);
  const warm = () => void loadIndex().catch(() => {});

  const set = (patch: Partial<FeedQuery>) => setQuery({ ...query, ...patch });
  const toggle = <T extends string>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const noMatch = t('noMatch');
  // A selected option stays pressable to clear it, even when the other conditions leave it no results.
  const shown = (selected: boolean, count: number) => (selected && count === 0 ? undefined : count);
  const n = conditionCount(query);
  const panelCount = query.use.length + query.shape.length + query.ref.length;

  const styleLabel = (id: string) => styleTerms.find((s) => s.id === id)?.label ?? id;
  const labelOfUse = (id: string) => useCases.find((u) => u.id === id)?.label ?? id;
  const active = [
    ...(query.style ? [{ id: `style:${query.style}`, label: styleLabel(query.style) }] : []),
    ...query.use.map((u) => ({ id: `use:${u}`, label: labelOfUse(u) })),
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

  const chips = (withStyles: boolean) => (
    <div className={styles.groups}>
      {withStyles && (
        <fieldset className={styles.group}>
          <legend>{t('style')}</legend>
          <div className={styles.chips}>
            {styleTerms.map((s) => (
              <FilterChip
                key={s.id}
                isSelected={query.style === s.id}
                onChange={(on) => set({ style: on ? s.id : null })}
                count={shown(query.style === s.id, counts.style[s.id] ?? 0)}
                disabledReason={noMatch}
              >
                {s.label}
              </FilterChip>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className={styles.group}>
        <legend>{t('use')}</legend>
        <div className={styles.chips}>
          {useCases.map((u) => (
            <FilterChip
              key={u.id}
              isSelected={query.use.includes(u.id)}
              onChange={() => set({ use: toggle(query.use, u.id) })}
              count={shown(query.use.includes(u.id), counts.use[u.id] ?? 0)}
              disabledReason={noMatch}
            >
              {u.label}
            </FilterChip>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>{t('shape')}</legend>
        <div className={styles.chips}>
          {SHAPES.map((s: Shape) => (
            <FilterChip
              key={s}
              isSelected={query.shape.includes(s)}
              onChange={() => set({ shape: toggle(query.shape, s) })}
              count={shown(query.shape.includes(s), counts.shape[s])}
              disabledReason={noMatch}
            >
              {t(`shapes.${s}`)}
            </FilterChip>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>{t('ref')}</legend>
        <div className={styles.chips}>
          {REF_OPTIONS.map((r: RefOption) => (
            <FilterChip
              key={r}
              isSelected={query.ref.includes(r)}
              onChange={() => set({ ref: toggle(query.ref, r) })}
              count={shown(query.ref.includes(r), counts.ref[r])}
              disabledReason={noMatch}
            >
              {t(`refs.${r}`)}
            </FilterChip>
          ))}
        </div>
      </fieldset>
    </div>
  );

  return (
    <div className={styles.bar} onPointerEnter={warm} onFocus={warm} data-filtered={isFiltered(query) || undefined}>
      <div className={styles.row}>
        {/* Style tabs (wide screens): one style at a time, "All" clears it (§11.1.9). */}
        <div role="group" aria-label={t('style')} className={styles.tabs}>
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
                {s.label} <span className={styles.count}>{format.number(count)}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.tools}>
          <Button
            className={styles.wideOnly}
            variant="secondary"
            onPress={() => setPanel('panel')}
            icon={<SlidersHorizontal aria-hidden="true" />}
          >
            {panelCount ? t('panelCount', { count: panelCount }) : t('panel')}
          </Button>
          <Button
            className={styles.narrowOnly}
            variant="secondary"
            onPress={() => setPanel('all')}
            icon={<SlidersHorizontal aria-hidden="true" />}
          >
            {n ? t('openCount', { count: n }) : t('open')}
          </Button>
          <Select
            className={styles.sort}
            label={<span className="visually-hidden">{t('sort')}</span>}
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
          <RemovableChips label={t('active')} labelHidden items={active} onRemove={remove} />
          <Button variant="ghost" onPress={clear}>
            {t('clear')}
          </Button>
        </div>
      )}

      <Dialog
        title={panel === 'all' ? t('open') : t('panelTitle')}
        variant={panel === 'all' ? 'sheet' : 'modal'}
        isOpen={panel !== null}
        onOpenChange={(open) => !open && setPanel(null)}
        actions={(close) => (
          <>
            {n > 0 && (
              <Button variant="ghost" onPress={clear}>
                {t('clear')}
              </Button>
            )}
            <Button variant="primary" onPress={close} isDisabled={counts.total === 0}>
              {t('show', { count: counts.total })}
            </Button>
          </>
        )}
      >
        {chips(panel === 'all')}
      </Dialog>
    </div>
  );
}
