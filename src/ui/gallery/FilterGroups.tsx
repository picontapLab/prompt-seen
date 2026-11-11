'use client';
import { languageAttributes } from '@/ui/prompt-detail/language';

import { useTranslations } from 'next-intl';
import { REF_OPTIONS, type FacetCounts, type FeedQuery, type RefOption } from '@/modules/feed/query';
import { SHAPES, type Shape } from '@/modules/feed/types';
import { FilterChip } from '@/ui/primitives/Chip';
import styles from './FilterBar.module.css';

type Term = { id: string; label: string; labelLocale?: string | null };

/**
 * The counted filter chips by dimension (design doc §11.7, §11.8.2): style (one at a time), use,
 * shape and reference image. Every option shows how many results it would give with the other
 * conditions; one that would give none is disabled and says why. The list shows them in its
 * panel (FilterPanel); explore shows them beside the results (step 4c).
 */
export function FilterGroups({
  withStyles,
  styleTerms,
  useCases,
  query,
  counts,
  onChange,
  className,
}: {
  /** Include the style chips; the list's wide bar has its own style tabs. */
  withStyles: boolean;
  styleTerms: readonly Term[];
  useCases: readonly Term[];
  query: FeedQuery;
  counts: FacetCounts;
  onChange: (patch: Partial<FeedQuery>) => void;
  className?: string;
}) {
  const t = useTranslations('feed.filters');
  const toggle = <T extends string>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const noMatch = t('noMatch');
  // A selected option stays pressable to clear it, even when the other conditions leave it no results.
  const shown = (selected: boolean, count: number) => (selected && count === 0 ? undefined : count);

  return (
    <div className={className ? `${styles.groups} ${className}` : styles.groups}>
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
                <span {...languageAttributes(s.labelLocale)}>{s.label}</span>
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
              <span {...languageAttributes(u.labelLocale)}>{u.label}</span>
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
  );
}
