import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { ErrorPage } from '../error-page';

// Rendered at /{locale}/410/ and served by the host for deleted entries (§9.5); hosts that
// cannot send 410 fall back to 404, which Google treats the same way.
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: localeByPrefix(locale)!.code, namespace: 'common.errors.gone' });
  return { title: t('title'), robots: { index: false, follow: true } };
}

export default async function LocaleGone({ params }: Props) {
  const { locale } = await params;
  enterLocale(locale);
  return <ErrorPage locale={locale} kind="gone" />;
}
