'use client';

import { ChevronDown } from 'lucide-react';
import { lazy, Suspense, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Key } from 'react-aria-components';
import { cx } from '@/ui/primitives/cx';
import fieldStyles from '@/ui/primitives/Field.module.css';
import type { Option } from '@/ui/primitives/Select';

const load = () => import('@/ui/primitives/Select');
const Select = lazy(() => load().then((m) => ({ default: m.Select })));

/** Starts loading the Select, e.g. when the pointer enters the filter bar. */
export const preloadSortSelect = () => void load();

type SortSelectProps = {
  /** Visually hidden; names the control. */
  label: string;
  options: readonly Option[];
  selectedKey: Key;
  onSelectionChange: (key: Key | null) => void;
  className?: string;
};

/**
 * The list's sort control (§11.8.2). React Aria's Select brings its collection, list box and
 * popover code, which the list does not need until the visitor reaches for it (§16.4). Until then
 * this is a button that looks and reads the same; pointing at or focusing it starts the download,
 * and pressing it (or ↑ ↓) swaps in the Select, focused and open — as LanguageSwitch does for the
 * language list.
 */
export function SortSelect({ label, options, selectedKey, onSelectionChange, className }: SortSelectProps) {
  const [active, setActive] = useState(false);
  const labelId = useId();
  const valueId = useId();
  const current = options.find((o) => o.id === selectedKey);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    setActive(true);
  };
  const placeholder = (
    <div className={cx(fieldStyles.field, className)}>
      <span id={labelId} className={fieldStyles.label}>
        <span className="visually-hidden">{label}</span>
      </span>
      <button
        type="button"
        className={fieldStyles.control}
        aria-labelledby={`${valueId} ${labelId}`}
        aria-haspopup="listbox"
        aria-expanded="false"
        onPointerEnter={preloadSortSelect}
        onFocus={preloadSortSelect}
        onClick={() => setActive(true)}
        onKeyDown={onKeyDown}
      >
        <span id={valueId} className={fieldStyles.input}>
          <span>{current?.label}</span>
        </span>
        <span className={fieldStyles.trigger} aria-hidden="true">
          <ChevronDown />
        </span>
      </button>
    </div>
  );
  if (!active) return placeholder;
  return (
    <Suspense fallback={placeholder}>
      <OpenSelect
        label={label}
        options={options}
        selectedKey={selectedKey}
        onSelectionChange={onSelectionChange}
        className={className}
      />
    </Suspense>
  );
}

/**
 * The Select as the visitor asked for it: its button takes focus first, then the list opens, so
 * the popover's focus scope returns focus to the button when it closes.
 */
function OpenSelect({ label, options, selectedKey, onSelectionChange, className }: SortSelectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    ref.current?.querySelector('button')?.focus();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens only once the button has focus
    setOpen(true);
  }, []);
  return (
    <div ref={ref} style={{ display: 'contents' }}>
      <Select
        className={className}
        label={<span className="visually-hidden">{label}</span>}
        options={options}
        selectedKey={selectedKey}
        onSelectionChange={onSelectionChange}
        isOpen={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
