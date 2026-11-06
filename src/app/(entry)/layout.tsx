import type { Metadata } from 'next';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { config, defaultLocale, isPreviewBuild } from '@/config';
import { pickNamespaces } from '@/i18n/catalog';
import { CLIENT_COMMON_NAMESPACES } from '@/i18n/client-messages';
import { verificationMetadata } from '@/modules/seo';
import { absoluteUrl } from '@/modules/url';
import { DisplayFontStylesheet } from '@/styles/fonts/DisplayFontStylesheet';
import { RootDocument } from '@/ui/navigation/RootDocument';
import { Shell } from '@/ui/navigation/Shell';

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl('/')),
  ...(isPreviewBuild && { robots: { index: false, follow: false } }),
  applicationName: config.siteName,
  // Search Console, Bing, Yandex and Naver verify the site from its pages (§9.9).
  ...verificationMetadata(),
};

// The root home has the same navigation, language switch and fonts as a locale home.
export default async function EntryLayout({ children }: { children: React.ReactNode }) {
  setRequestLocale(defaultLocale.code);
  const messages = pickNamespaces(await getMessages({ locale: defaultLocale.code }), CLIENT_COMMON_NAMESPACES);
  return (
    <RootDocument locale={defaultLocale} messages={messages}>
      <DisplayFontStylesheet code={defaultLocale.code} />
      <Shell locale={defaultLocale}>{children}</Shell>
    </RootDocument>
  );
}
