'use client';

import { useTranslations } from 'next-intl';
import { conditionCount, REF_OPTIONS, type FacetCounts, type FeedQuery, type RefOption } from '@/modules/feed/query';
import { SHAPES, type Shape } from '@/modules/feed/types';
import { Button } from '@/ui/primitives/Button';
import { FilterChip } from '@/ui/primitives/Chip';
import { Dialog } from '@/ui/primitives/Dialog';
import styles from './FilterBar.module.css';

type Term = { id: string; label: string };

/**
 * The filter bar's panel of counted chips (design doc §11.8.2): use, shape and reference image on
 * wide screens ("panel"), every condition behind the one Filters button on narrow ones ("all").
 * Loaded the first time either button is pressed (FilterBar), so the list's first load carries no
 * dialog or chip code (§16.4); it stays mounted afterwards so closing can animate.
 */
export default function FilterPanel({
  panel,
  onClose,
  styleTerms,
  useCases,
  query,
  counts,
  onChange,
  onClear,
}: {
  panel: 'panel' | 'all' | null;
  onClose: () => void;
  styleTerms: readonly Term[];
  useCases: readonly Term[];
  query: FeedQuery;
  counts: FacetCounts;
  onChange: (patch: Partial<FeedQuery>) => void;
  onClear: () => void;
}) {
  const t = useTranslations('feed.filters');
  const toggle = <T extends string>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const noMatch = t('noMatch');
  // A selected option stays pressable to clear it, even when the other conditions leave it no results.
  const shown = (selected: boolean, count: number) => (selected && count === 0 ? undefined : count);
  const n = conditionCount(query);
  const withStyles = panel === 'all';

  return (
    <Dialog
      title={panel === 'all' ? t('open') : t('panelTitle')}
      variant={panel === 'all' ? 'sheet' : 'modal'}
      isOpen={panel !== null}
      onOpenChange={(open) => !open && onClose()}
      actions={(close) => (
        <>
          {n > 0 && (
            <Button variant="ghost" onPress={onClear}>
              {t('clear')}
            </Button>
          )}
          <Button variant="primary" onPress={close} isDisabled={counts.total === 0}>
            {t('show', { count: counts.total })}
          </Button>
        </>
      )}
    >
      <div className={styles.groups}>
        {withStyles && (
          <fieldset className={styles.group}>
            <legend>{t('style')}</legend>
            <div className={styles.chips}>
              {styleTerms.map((s) => (
                <FilterChip
                  key={s.id}
                  isSelected={query.style === s.id}
                  onChange={(on) => onChange({ style: on ? s.id : null })}
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
                onChange={() => onChange({ use: toggle(query.use, u.id) })}
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
                onChange={() => onChange({ shape: toggle(query.shape, s) })}
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
                onChange={() => onChange({ ref: toggle(query.ref, r) })}
                count={shown(query.ref.includes(r), counts.ref[r])}
                disabledReason={noMatch}
              >
                {t(`refs.${r}`)}
              </FilterChip>
            ))}
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}
