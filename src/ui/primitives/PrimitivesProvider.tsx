'use client';

import { I18nProvider } from 'react-aria-components';
import { Toaster } from './Toast';

/**
 * Context for every primitive, mounted once by the root document: the page language for React
 * Aria's built-in strings, number formats and direction (set explicitly, so server and client
 * render the same text), and the toast region. A React Aria RouterProvider joins here when a
 * primitive first renders links.
 */
export function PrimitivesProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  return (
    <I18nProvider locale={locale}>
      {children}
      <Toaster />
    </I18nProvider>
  );
}
