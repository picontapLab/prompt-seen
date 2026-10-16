'use client';

import { useId, type ReactNode } from 'react';
import { SelectionIndicator, ToggleButton, ToggleButtonGroup, type Key } from 'react-aria-components';
import { cx } from './cx';
import styles from './SegmentedControl.module.css';

export type Segment<K extends Key> = { id: K; label: ReactNode; icon?: ReactNode; isDisabled?: boolean };

export type SegmentedControlProps<K extends Key> = {
  /** Names the group; shown above it unless labelHidden. */
  label: ReactNode;
  labelHidden?: boolean;
  /** Two to four options (§11.1.7). */
  segments: readonly Segment<K>[];
  value: K;
  onChange: (value: K) => void;
  isDisabled?: boolean;
  className?: string;
};

/**
 * SegmentedControl (§11.1.7): one choice among 2–4, e.g. the theme. A radio group: arrow keys
 * move between options, the current one carries a safelight underline (§11.1.9), not a pill.
 */
export function SegmentedControl<K extends Key>({
  label,
  labelHidden,
  segments,
  value,
  onChange,
  isDisabled,
  className,
}: SegmentedControlProps<K>) {
  const labelId = useId();
  return (
    <div className={cx(styles.root, className)}>
      <span id={labelId} className={labelHidden ? 'visually-hidden' : styles.label}>
        {label}
      </span>
      <ToggleButtonGroup
        aria-labelledby={labelId}
        className={styles.group}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[value]}
        onSelectionChange={(keys) => {
          const [next] = keys;
          if (next !== undefined) onChange(next as K);
        }}
        isDisabled={isDisabled}
      >
        {segments.map((s) => (
          <ToggleButton key={s.id} id={s.id} isDisabled={s.isDisabled} className={styles.segment}>
            {s.icon}
            <span>{s.label}</span>
            <SelectionIndicator className={styles.indicator} />
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}
