import type { Viewport } from 'next';
import { themeColor } from '@/styles/tokens/theme-color';

// Pass-through root layout. <html> is rendered one level down, by the default-language home and by
// [locale]/layout.tsx (through RootDocument), so every page gets its own lang and dir (design
// doc §8.6). Pages under [locale] that call notFound() need a [locale]/not-found.tsx without
// <html>; the root not-found.tsx renders a full document and is only used for unmatched URLs.

// Browser chrome follows the theme (§11.9): both schemes are supported, and theme-color follows
// the system here; an explicit choice adds an override first in <head> (src/state/preferences).
export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: themeColor.light },
    { media: '(prefers-color-scheme: dark)', color: themeColor.dark },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
