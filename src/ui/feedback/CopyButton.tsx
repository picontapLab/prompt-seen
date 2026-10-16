'use client';

import { Check, Copy, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, type ButtonVariant } from '@/ui/primitives/Button';
import { selectContents, writeClipboard } from './copy';
import styles from './CopyButton.module.css';

export type CopyState = 'idle' | 'done' | 'failed';

export type CopyButtonProps = {
  /** The exact text to copy; normalized to LF and trimmed (§11.9). */
  text: string;
  labels: { copy: string; done: string; failed: string; failedHint: string };
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  /** Element whose text is selected after a failed copy, so it can be copied by hand (§11.7). */
  selectOnFailId?: string;
  onResult?: (state: Exclude<CopyState, 'idle'>) => void;
  /** Starting state, for state samples in Storybook. */
  defaultState?: CopyState;
  className?: string;
  /** Extra props for the button, e.g. data attributes for tests. */
  id?: string;
  'data-testid'?: string;
};

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
  ...rest
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>(defaultState);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    clearTimeout(timer.current);
    const ok = await writeClipboard(text);
    const next = ok ? 'done' : 'failed';
    setState(next);
    onResult?.(next);
    if (ok) timer.current = setTimeout(() => setState('idle'), COPY_FEEDBACK_MS);
    else if (selectOnFailId) selectContents(document.getElementById(selectOnFailId));
  }

  const icon = state === 'done' ? <Check /> : state === 'failed' ? <X /> : <Copy />;
  return (
    <span className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <Button variant={variant} size={size} icon={icon} onPress={copy} data-copy-state={state} {...rest}>
        <span className={styles.labels}>
          <span aria-hidden={state !== 'idle'} data-active={state === 'idle'}>
            {labels.copy}
          </span>
          <span aria-hidden={state !== 'done'} data-active={state === 'done'}>
            {labels.done}
          </span>
          <span aria-hidden={state !== 'failed'} data-active={state === 'failed'}>
            {labels.failed}
          </span>
        </span>
      </Button>
      <span role="status" className={state === 'failed' ? styles.hint : 'visually-hidden'}>
        {state === 'done' ? labels.done : state === 'failed' ? labels.failedHint : ''}
      </span>
    </span>
  );
}
