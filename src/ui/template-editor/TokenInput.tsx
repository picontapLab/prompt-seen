'use client';

import { CircleAlert, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { graphemeLength } from '@/modules/template';
import { cx } from '@/ui/primitives/cx';
import fieldStyles from '@/ui/primitives/Field.module.css';
import styles from './TokenInput.module.css';
import { splitItems } from './values';

export type TokenInputProps = {
  label: ReactNode;
  /** "Optional" or "required", whichever the form marks (§11.8.4 必填标注). */
  necessity?: 'optional' | 'required';
  description?: ReactNode;
  value: readonly string[];
  onChange: (next: string[]) => void;
  /** Called when focus leaves the field, after any typed text became an item. */
  onBlur?: () => void;
  maxItems: number | null;
  itemMaxLength: number | null;
  /** The template's separator; typing its first visible character also adds an item. */
  separator: string;
  isInvalid?: boolean;
  /** Says what happened and how to fix it (§11.11). */
  errorMessage?: ReactNode;
  /** Items over the length limit, marked in place. */
  invalidItems?: readonly number[];
  /** Language of the values (the prompt's language, §8.3). */
  lang?: string;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
};

/**
 * TokenInput (design doc §11.1.7): a string-list field. Enter or the separator adds the typed
 * item, Backspace in the empty input removes the last one, and the count shows "2 / 3" with how
 * many more fit. Text still in the input becomes an item when focus leaves, so nothing typed is
 * lost. Keys pressed while an input method is composing (CJK) never add or remove items (§11.6.4).
 */
export function TokenInput({
  label,
  necessity,
  description,
  value,
  onChange,
  onBlur,
  maxItems,
  itemMaxLength,
  separator,
  isInvalid,
  errorMessage,
  invalidItems = [],
  lang,
  inputRef,
  className,
}: TokenInputProps) {
  const t = useTranslations('templates.tokens');
  const f = useTranslations('primitives.field');
  const id = useId();
  const [draft, setDraft] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const composing = useRef(false);
  const full = maxItems !== null && value.length >= maxItems;
  const mark = separator.trim();

  function add(text: string): string {
    const items = splitItems(text, separator);
    if (items.length === 0) return '';
    const room = maxItems === null ? items.length : Math.max(maxItems - value.length, 0);
    const added = items.slice(0, room);
    if (added.length) {
      onChange([...value, ...added]);
      setAnnouncement(t('added', { item: added.join(separator) }));
    }
    if (added.length < items.length) setAnnouncement(t('full', { max: maxItems ?? 0 }));
    // What did not fit stays in the input, so it can be moved elsewhere.
    return items.slice(added.length).join(separator);
  }

  function remove(index: number) {
    const item = value[index];
    onChange(value.filter((_, i) => i !== index));
    if (item !== undefined) setAnnouncement(t('removed', { item }));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      setDraft(add(draft));
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      event.preventDefault();
      remove(value.length - 1);
    }
  }

  function onInputChange(next: string) {
    // The separator adds an item as it is typed; never while an input method is composing.
    if (!composing.current && mark && next.includes(mark)) {
      const end = next.lastIndexOf(mark);
      setDraft(add(next.slice(0, end)) + next.slice(end + mark.length).trimStart());
      return;
    }
    setDraft(next);
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text');
    if (!mark || !text.includes(mark)) return;
    event.preventDefault();
    setDraft(add(draft + text));
  }

  const countId = `${id}-count`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const pendingLength = graphemeLength(draft.trim());
  const pendingTooLong = itemMaxLength !== null && pendingLength > itemMaxLength;

  return (
    <div
      className={cx(fieldStyles.field, className)}
      role="group"
      aria-labelledby={`${id}-label`}
      data-invalid={isInvalid || undefined}
    >
      <div className={fieldStyles.labelRow}>
        <label id={`${id}-label`} htmlFor={`${id}-input`} className={fieldStyles.label}>
          {label}
          {necessity && <span className={fieldStyles.necessity}> · {f(necessity)}</span>}
        </label>
        {maxItems !== null && (
          <span id={countId} className={fieldStyles.counter} data-over={value.length > maxItems ? '' : undefined}>
            {t('count', { count: value.length, max: maxItems })}
          </span>
        )}
      </div>
      <div
        className={cx(fieldStyles.control, styles.control)}
        data-invalid={isInvalid || undefined}
        onPointerDown={(event) => {
          // A press on the box, not on an item, puts the caret in the input.
          if (event.target === event.currentTarget) {
            event.preventDefault();
            document.getElementById(`${id}-input`)?.focus();
          }
        }}
      >
        {value.length > 0 && (
          <ul className={styles.tokens} aria-label={t('items')}>
            {value.map((item, index) => (
              <li
                key={`${index}-${item}`}
                className={styles.token}
                data-invalid={invalidItems.includes(index) || undefined}
                lang={lang}
              >
                <span className={styles.tokenText}>{item}</span>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={t('remove', { item })}
                  onClick={() => {
                    remove(index);
                    document.getElementById(`${id}-input`)?.focus();
                  }}
                >
                  <X aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={inputRef}
          id={`${id}-input`}
          className={cx(fieldStyles.input, styles.input)}
          value={draft}
          lang={lang}
          enterKeyHint="enter"
          autoComplete="off"
          aria-describedby={[maxItems !== null && countId, descriptionId, isInvalid && errorId]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={isInvalid || undefined}
          placeholder={full ? undefined : t('placeholder')}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={(event) => {
            composing.current = false;
            onInputChange(event.currentTarget.value);
          }}
          onBlur={() => {
            if (draft.trim()) setDraft(add(draft));
            onBlur?.();
          }}
        />
      </div>
      <p id={descriptionId} className={fieldStyles.description}>
        {description && <span className={styles.help}>{description}</span>}
        <span className={styles.hint}>
          {pendingTooLong
            ? t('pendingTooLong', { max: itemMaxLength, count: pendingLength })
            : full
              ? t('full', { max: maxItems ?? 0 })
              : maxItems !== null
                ? t('remaining', { count: maxItems - value.length })
                : t('howTo')}
        </span>
      </p>
      {isInvalid && errorMessage && (
        <p id={errorId} className={fieldStyles.error}>
          <CircleAlert aria-hidden="true" />
          <span>{errorMessage}</span>
        </p>
      )}
      <span role="status" className="visually-hidden">
        {announcement}
      </span>
    </div>
  );
}
