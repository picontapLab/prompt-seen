'use client';

import { flushSync } from 'react-dom';
import { UNSTABLE_ToastQueue as ToastQueue } from 'react-aria-components';

// The site's toast queue, kept apart from the toast components so that queueing a toast costs
// nothing until one is shown (§16.4).

export type ToastTone = 'info' | 'success';

export type ToastMessage = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** An undo or follow-up action; the toast closes after it runs. */
  action?: { label: string; onAction: () => void };
};

/** Undoable toasts stay about 5 seconds (§11.5); others a little longer to be read. */
const DEFAULT_TIMEOUT = { action: 5000, plain: 6000 };

/**
 * One queue for the whole site; the region is mounted once by the root document. Toasts are for
 * results that do not show where the action happened (§11.1.7); in-place feedback (copy, save)
 * stays on the control.
 */
export const toastQueue = new ToastQueue<ToastMessage>({
  maxVisibleToasts: 3,
  // Entry and exit through view transitions where available, else immediate (§12.2).
  wrapUpdate(fn) {
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document !== 'undefined' && 'startViewTransition' in document && !reduced) {
      document.startViewTransition(() => flushSync(fn));
    } else {
      fn();
    }
  },
});

export function showToast(message: ToastMessage, timeout?: number): string {
  return toastQueue.add(message, {
    timeout: timeout ?? (message.action ? DEFAULT_TIMEOUT.action : DEFAULT_TIMEOUT.plain),
  });
}
