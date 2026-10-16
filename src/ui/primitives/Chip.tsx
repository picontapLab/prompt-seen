'use client';

import { X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import {
  Button as AriaButton,
  Label,
  Tag,
  TagGroup,
  TagList,
  ToggleButton,
  type Key,
  type ToggleButtonProps,
} from 'react-aria-components';
import { cx } from './cx';
import styles from './Chip.module.css';

export type FilterChipProps = Omit<ToggleButtonProps, 'className' | 'children' | 'style'> & {
  children: ReactNode;
  /** Results under the current conditions; zero disables the chip (§11.7). */
  count?: number;
  /** Why the chip is disabled, e.g. "No results with the current filters" (§11.1.7). */
  disabledReason?: string;
  className?: string;
};

/** Filter chip (§11.1.7): a toggle with a monospaced count; 2px corners, never a pill (§11.1.9). */
export function FilterChip({ children, count, disabledReason, className, ...props }: FilterChipProps) {
  const format = useFormatter();
  const t = useTranslations('primitives.chip');
  const reasonId = useId();
  const isDisabled = props.isDisabled || count === 0;
  return (
    <ToggleButton
      {...props}
      isDisabled={isDisabled}
      aria-describedby={isDisabled && disabledReason ? reasonId : undefined}
      className={cx(styles.chip, styles.filter, className)}
    >
      <span>{children}</span>
      {count !== undefined && (
        <span className={styles.count}>
          <span aria-hidden="true">{format.number(count)}</span>
          <span className="visually-hidden">{t('count', { count })}</span>
        </span>
      )}
      {isDisabled && disabledReason && (
        <span id={reasonId} className="visually-hidden">
          {disabledReason}
        </span>
      )}
    </ToggleButton>
  );
}

/** Static tag, e.g. a style on a detail page. Not interactive; wrap in a link when it navigates. */
export function TagChip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx(styles.chip, styles.tag, className)}>{children}</span>;
}

export type RemovableChipsProps = {
  /** Names the group, e.g. "Active filters". */
  label: ReactNode;
  labelHidden?: boolean;
  items: readonly { id: Key; label: string }[];
  onRemove: (keys: Set<Key>) => void;
  className?: string;
};

/**
 * Removable chips (§11.1.7), e.g. the active filters: arrow keys move between chips, Delete or
 * Backspace removes one, and every chip has a remove button with its own name.
 */
export function RemovableChips({ label, labelHidden, items, onRemove, className }: RemovableChipsProps) {
  const t = useTranslations('primitives.chip');
  return (
    <TagGroup onRemove={onRemove} className={cx(styles.group, className)}>
      <Label className={labelHidden ? 'visually-hidden' : styles.groupLabel}>{label}</Label>
      <TagList items={items} className={styles.list}>
        {(item) => (
          <Tag id={item.id} textValue={item.label} className={cx(styles.chip, styles.removable)}>
            <span>{item.label}</span>
            <AriaButton slot="remove" className={styles.remove} aria-label={t('remove', { label: item.label })}>
              <X aria-hidden="true" />
            </AriaButton>
          </Tag>
        )}
      </TagList>
    </TagGroup>
  );
}
