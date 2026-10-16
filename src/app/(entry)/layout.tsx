import type { Metadata } from 'next';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { config, defaultLocale, isPreviewBuild } from '@/config';
import { pickNamespaces } from '@/i18n/catalog';
import { CLIENT_COMMON_NAMESPACES } from '@/i18n/client-messages';
import { absoluteUrl } from '@/modules/url';
import { RootDocument } from '@/ui/navigation/RootDocument';
import { Shell } from '@/ui/navigation/Shell';

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl('/')),
  ...(isPreviewBuild && { robots: { index: false, follow: false } }),
  applicationName: config.siteName,
};

// The language entry lists every language in its own name; its chrome uses the default locale.
export default async function EntryLayout({ children }: { children: React.ReactNode }) {
  setRequestLocale(defaultLocale.code);
  const messages = pickNamespaces(await getMessages({ locale: defaultLocale.code }), CLIENT_COMMON_NAMESPACES);
  return (
    <RootDocument locale={defaultLocale} messages={messages}>
      <Shell locale={defaultLocale} minimal>
        {children}
      </Shell>
    </RootDocument>
  );
}
