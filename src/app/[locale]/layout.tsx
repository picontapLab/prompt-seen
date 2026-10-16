import type { Metadata } from 'next';
import { getMessages } from 'next-intl/server';
import { builtLocales, config, isPreviewBuild } from '@/config';
import { pickNamespaces } from '@/i18n/catalog';
import { CLIENT_COMMON_NAMESPACES } from '@/i18n/client-messages';
import { enterLocale } from '@/i18n/locale';
import { absoluteUrl } from '@/modules/url';
import { RootDocument } from '@/ui/navigation';

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
  const entry = enterLocale(locale);
  const messages = pickNamespaces(await getMessages({ locale: entry.code }), CLIENT_COMMON_NAMESPACES);
  return (
    <RootDocument locale={entry} messages={messages}>
      {children}
    </RootDocument>
  );
}
