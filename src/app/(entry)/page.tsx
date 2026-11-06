import { setRequestLocale } from 'next-intl/server';
import { defaultLocale } from '@/config';
import { HomePage, homePageMetadata } from '@/ui/home/HomePage';

// Serve the default-language home as static HTML, without a language gate or redirect.
export function generateMetadata() {
  return homePageMetadata(defaultLocale);
}

export default function RootHome() {
  setRequestLocale(defaultLocale.code);
  return <HomePage locale={defaultLocale} />;
}
