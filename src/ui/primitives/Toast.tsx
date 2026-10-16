'use client';

import { CircleCheck, Info, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { flushSync } from 'react-dom';
import {
  Button as AriaButton,
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastRegion as ToastRegion,
} from 'react-aria-components';
import { cx } from './cx';
import styles from './Toast.module.css';

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

/** Polite live region with the visible toasts; pauses its timers while hovered or focused. */
export function Toaster() {
  const t = useTranslations('primitives.toast');
  return (
    <ToastRegion queue={toastQueue} className={styles.region} aria-label={t('region')}>
      {({ toast }) => {
        const { title, description, tone = 'info', action } = toast.content;
        return (
          <AriaToast
            toast={toast}
            className={cx(styles.toast, styles[tone])}
            style={
              {
                viewTransitionName: `toast-${toast.key.replace(/[^\w-]/g, '')}`,
                viewTransitionClass: 'toast',
              } as React.CSSProperties
            }
          >
            {tone === 'success' ? (
              <CircleCheck className={styles.icon} aria-hidden="true" />
            ) : (
              <Info className={styles.icon} aria-hidden="true" />
            )}
            <ToastContent className={styles.content}>
              <Text slot="title" className={styles.title}>
                {title}
              </Text>
              {description && (
                <Text slot="description" className={styles.description}>
                  {description}
                </Text>
              )}
            </ToastContent>
            {action && (
              <AriaButton
                className={styles.action}
                onPress={() => {
                  action.onAction();
                  toastQueue.close(toast.key);
                }}
              >
                {action.label}
              </AriaButton>
            )}
            <AriaButton slot="close" className={styles.dismiss} aria-label={t('dismiss')}>
              <X aria-hidden="true" />
            </AriaButton>
          </AriaToast>
        );
      }}
    </ToastRegion>
  );
}
