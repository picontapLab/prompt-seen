'use client';

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
 * stays on the control. Queue updates reach subscribers immediately because the undo action has
 * a short lifetime and a document view transition can delay the notification.
 */
export const toastQueue = new ToastQueue<ToastMessage>({ maxVisibleToasts: 3 });

export function showToast(message: ToastMessage, timeout?: number): string {
  return toastQueue.add(message, {
    timeout: timeout ?? (message.action ? DEFAULT_TIMEOUT.action : DEFAULT_TIMEOUT.plain),
  });
}
