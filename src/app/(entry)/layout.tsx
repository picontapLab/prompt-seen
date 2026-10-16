import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { config, defaultLocale, isPreviewBuild } from '@/config';
import { absoluteUrl } from '@/modules/url';

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl('/')),
  ...(isPreviewBuild && { robots: { index: false, follow: false } }),
  applicationName: config.siteName,
};

// The language entry lists every language in its own name; its chrome uses the default locale.
export default function EntryLayout({ children }: { children: React.ReactNode }) {
  setRequestLocale(defaultLocale.code);
  return (
    <html lang={defaultLocale.htmlLang} dir={defaultLocale.direction}>
      <body>{children}</body>
    </html>
  );
}
