import { localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { HomePage, homePageMetadata } from '@/ui/home/HomePage';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return homePageMetadata(localeByPrefix(locale)!);
}

// Keep the default locale's old home address working, with the root as its canonical URL.
export default async function LocaleHome({ params }: Props) {
  const { locale } = await params;
  return <HomePage locale={enterLocale(locale)} />;
}
