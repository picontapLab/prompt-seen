'use client';

import { useRouter } from 'next/navigation';
import { I18nProvider, RouterProvider } from 'react-aria-components';
import { Toaster } from './Toast';

/**
 * Context for every primitive, mounted once by the root document: the page language for React
 * Aria's built-in strings, number formats and direction (set explicitly, so server and client
 * render the same text), Next.js navigation for React Aria links, and the toast region.
 */
export function PrimitivesProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <I18nProvider locale={locale}>
      <RouterProvider navigate={(href) => router.push(href)}>
        {children}
        <Toaster />
      </RouterProvider>
    </I18nProvider>
  );
}
