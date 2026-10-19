import type { Metadata } from 'next';
import { localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { getDetailModel } from '@/modules/content';
import { JsonLd } from '@/modules/seo';
import { EMPTY_PARAM } from '@/modules/url';
import {
  ContentPageBody,
  contentPageMetadata,
  contentPageParams,
  contentPageStructuredData,
} from '@/ui/pages/ContentPageBody';

// Content pages such as about and license at /{locale}/{slug}/ (design doc §9.1, §9.8,
// §9.10.5). The site's own routes take precedence; content:validate keeps page slugs clear of
// them (RESERVED_PAGE_SEGMENTS in @/modules/url).
type Props = { params: Promise<{ locale: string; page: string }> };

export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { locale: string } }) {
  const entry = localeByPrefix(params.locale);
  const found = entry ? contentPageParams(entry.code) : [];
  return found.length ? found : [{ page: EMPTY_PARAM }];
}

function load(code: string, slug: string) {
  const detail = getDetailModel('page', slug, code);
  if (!detail) throw new Error(`page "${slug}" has no detail model in ${code}: rebuild content`);
  return detail;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  if (page === EMPTY_PARAM) return { robots: { index: false } };
  const entry = localeByPrefix(locale)!;
  return contentPageMetadata(load(entry.code, page), entry);
}

export default async function ContentPage({ params }: Props) {
  const { locale, page } = await params;
  const entry = enterLocale(locale);
  if (page === EMPTY_PARAM) return null;
  const detail = load(entry.code, page);
  return (
    <>
      <JsonLd data={await contentPageStructuredData(detail, entry)} />
      <ContentPageBody detail={detail} locale={entry} />
    </>
  );
}
