'use client';

import { lazy, Suspense, useEffect, useState } from 'react';
import { I18nProvider } from 'react-aria-components';
import { toastQueue } from './toast-queue';

const Toaster = lazy(() => import('./Toast').then((m) => ({ default: m.Toaster })));

/**
 * Context for every primitive, mounted once by the root document: the page language for React
 * Aria's built-in strings, number formats and direction (set explicitly, so server and client
 * render the same text), and the toast region. The region loads when the page is idle, or at
 * once if a toast is queued earlier, so it is not part of the first-load bundle (§16.4).
 */
export function PrimitivesProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  const [toaster, setToaster] = useState(false);
  useEffect(() => {
    const show = () => setToaster(true);
    const unsubscribe = toastQueue.subscribe(show);
    const idle = window.requestIdleCallback?.(show, { timeout: 4000 }) ?? window.setTimeout(show, 2000);
    return () => {
      unsubscribe();
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);
  return (
    <I18nProvider locale={locale}>
      {children}
      {toaster && (
        <Suspense>
          <Toaster />
        </Suspense>
      )}
    </I18nProvider>
  );
}
