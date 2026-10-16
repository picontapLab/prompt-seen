'use client';

import { CircleCheck, Info, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Button as AriaButton,
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastRegion as ToastRegion,
} from 'react-aria-components';
import { cx } from './cx';
import styles from './Toast.module.css';
import { toastQueue } from './toast-queue';

/**
 * Polite live region with the visible toasts; pauses its timers while hovered or focused.
 * PrimitivesProvider loads it once the page is idle, so it stays out of the first-load bundle.
 */
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
