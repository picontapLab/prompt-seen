import type { Metadata } from 'next';
import { BASE_PATH, SITE_NAME, SITE_ORIGIN } from '@/lib/site.mjs';
import './globals.css';

// Memo §1: metadataBase = origin + basePath; '/'-prefixed fields join after it.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN + BASE_PATH),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
