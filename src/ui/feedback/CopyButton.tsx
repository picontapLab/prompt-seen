'use client';

import { Check, CircleAlert, Copy, X } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { preferencesStore } from '@/state/preferences/store';
import { Button, type ButtonVariant } from '@/ui/primitives/Button';
import { Tooltip } from '@/ui/primitives/Tooltip';
import { selectContents, writeClipboard } from './copy';
import styles from './CopyButton.module.css';

export type CopyState = 'idle' | 'done' | 'failed';

export type CopyButtonProps = {
  /**
   * The exact text to copy; normalized to LF and trimmed (§11.9). A function is read at the
   * moment of the press, so an edit committed on the way to the button (a blur) is included.
   */
  text: string | (() => string);
  labels: { copy: string; done: string; failed: string; failedHint: string };
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  /** Element whose text is selected after a failed copy, so it can be copied by hand (§11.7). */
  selectOnFailId?: string;
  onResult?: (state: Exclude<CopyState, 'idle'>) => void;
  /**
   * Set while there is nothing valid to copy, e.g. a template with fields still to fill (§11.4
   * 不可复制): the button names what is missing and runs `onPress` instead of copying, so it is
   * never a disabled button that does nothing. The label shares the cell with the others while
   * `active` is false too, so the width holds when fields become valid or invalid.
   */
  blocked?: { label: string; active: boolean; onPress: () => void };
  /**
   * The button `C` presses on this page (§11.10): `key` for aria-keyshortcuts, `hint` for the
   * tooltip ("Copy prompt (C)"), shown while single-key shortcuts are on.
   */
  shortcut?: { key: string; hint: string };
  /** Starting state, for state samples in Storybook. */
  defaultState?: CopyState;
  className?: string;
  /** Extra props for the button, e.g. data attributes for tests. */
  id?: string;
  'data-testid'?: string;
};

const noSubscription = () => () => {};

/** How long the success state stays before the label returns (§11.1.7: about 1.6 s). */
export const COPY_FEEDBACK_MS = 1600;

/**
 * Copy with in-place feedback (§11.1.7 CopyButton, §11.7): icon and label change in place, the
 * width never changes because every label occupies the same grid cell, and the result is
 * announced politely. A failure keeps its message until the next attempt and selects the text.
 */
export function CopyButton({
  text,
  labels,
  variant = 'primary',
  size = 'md',
  selectOnFailId,
  onResult,
  className,
  defaultState = 'idle',
  blocked,
  shortcut,
  ...rest
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>(defaultState);
  const singleKey = useSyncExternalStore(
    shortcut ? preferencesStore.subscribe : noSubscription,
    () => !!shortcut && preferencesStore.get().singleKeyShortcuts,
    () => false,
  );
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    clearTimeout(timer.current);
    if (blocked?.active) {
      setState('idle');
      blocked.onPress();
      return;
    }
    const ok = await writeClipboard(typeof text === 'function' ? text() : text);
    const next = ok ? 'done' : 'failed';
    setState(next);
    onResult?.(next);
    if (ok) timer.current = setTimeout(() => setState('idle'), COPY_FEEDBACK_MS);
    else if (selectOnFailId) selectContents(document.getElementById(selectOnFailId));
  }

  const shown = blocked?.active ? 'blocked' : state;
  const icon =
    shown === 'blocked' ? <CircleAlert /> : shown === 'done' ? <Check /> : shown === 'failed' ? <X /> : <Copy />;
  const button = (
    <Button
      variant={variant}
      size={size}
      icon={icon}
      onPress={copy}
      data-copy-state={shown}
      data-shortcut={shortcut ? 'copy' : undefined}
      aria-keyshortcuts={shortcut?.key}
      {...rest}
    >
      <span className={styles.labels}>
        <span aria-hidden={shown !== 'idle'} data-active={shown === 'idle'}>
          {labels.copy}
        </span>
        {blocked && (
          <span aria-hidden={shown !== 'blocked'} data-active={shown === 'blocked'}>
            {blocked.label}
          </span>
        )}
        <span aria-hidden={shown !== 'done'} data-active={shown === 'done'}>
          {labels.done}
        </span>
        <span aria-hidden={shown !== 'failed'} data-active={shown === 'failed'}>
          {labels.failed}
        </span>
      </span>
    </Button>
  );
  return (
    <span className={[styles.wrap, className].filter(Boolean).join(' ')}>
      {shortcut ? (
        <Tooltip content={shortcut.hint} isDisabled={!singleKey}>
          {button}
        </Tooltip>
      ) : (
        button
      )}
      <span role="status" className={shown === 'failed' ? styles.hint : 'visually-hidden'}>
        {shown === 'done' ? labels.done : shown === 'failed' ? labels.failedHint : ''}
      </span>
    </span>
  );
}
