import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { builtLocales, config, isPreviewBuild, localeByPrefix } from '@/config';
import { pickNamespaces } from '@/i18n/catalog';
import { CLIENT_COMMON_NAMESPACES } from '@/i18n/client-messages';
import { absoluteUrl } from '@/modules/url';

// Static export: every locale segment is generated up front (§3.2).
export const dynamicParams = false;

export function generateStaticParams() {
  return builtLocales.map((l) => ({ locale: l.pathPrefix }));
}

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl('/')),
  // Previews and other non-production builds are never indexable (§15.1).
  ...(isPreviewBuild && { robots: { index: false, follow: false } }),
  applicationName: config.siteName,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const entry = localeByPrefix(locale)!;
  setRequestLocale(entry.code);
  const messages = pickNamespaces(await getMessages(), CLIENT_COMMON_NAMESPACES);
  return (
    <html lang={entry.htmlLang} dir={entry.direction}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
