'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { Messages } from '@/i18n/catalog';

/**
 * Messages for client components, from explicit props only. Rendering next-intl's provider from
 * a server component would look up formats, time zone and "now" from the request locale, which
 * pages outside a locale (the root 404) cannot provide under static export. Times are UTC
 * because pages are pre-rendered (src/i18n/request.ts).
 */
export function IntlProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Messages;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
