import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { ErrorPage } from '../error-page';

// Rendered at /{locale}/404/ and served by the host's error_page rule with status 404 (§4.1).
// The host keeps this location internal, so the page itself never answers 200.
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: localeByPrefix(locale)!.code, namespace: 'common.errors.notFound' });
  return { title: t('title'), robots: { index: false, follow: true } };
}

export default async function LocaleNotFound({ params }: Props) {
  const { locale } = await params;
  enterLocale(locale);
  return <ErrorPage locale={locale} kind="notFound" />;
}
