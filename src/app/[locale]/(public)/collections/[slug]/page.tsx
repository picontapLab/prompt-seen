import type { Metadata } from 'next';
import { localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { findBySlug, getDetailModel, listEntries } from '@/modules/content';
import { JsonLd } from '@/modules/seo';
import { EMPTY_PARAM } from '@/modules/url';
import { CollectionBody, collectionMetadata, collectionPageStructuredData } from '@/ui/pages/CollectionBody';

// An editorial collection (design doc §9.1, §11.8.5). Generated where it is published with at
// least two entries visible in the locale (§9.1 发布条件).
type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { locale: string } }) {
  const entry = localeByPrefix(params.locale);
  const found = entry ? listEntries({ locale: entry.code, kind: 'collection' }).map((c) => ({ slug: c.slug })) : [];
  return found.length ? found : [{ slug: EMPTY_PARAM }];
}

function load(code: string, slug: string) {
  const summary = findBySlug('collection', code, slug);
  const detail = summary && getDetailModel('collection', summary.id, code);
  if (!detail) throw new Error(`collection "${slug}" has no detail model in ${code}: rebuild content`);
  return detail;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (slug === EMPTY_PARAM) return { robots: { index: false } };
  const entry = localeByPrefix(locale)!;
  return collectionMetadata(load(entry.code, slug), entry);
}

export default async function CollectionPage({ params }: Props) {
  const { locale, slug } = await params;
  const entry = enterLocale(locale);
  if (slug === EMPTY_PARAM) return null;
  const detail = load(entry.code, slug);
  return (
    <>
      <JsonLd data={await collectionPageStructuredData(detail, entry)} />
      <CollectionBody detail={detail} locale={entry} />
    </>
  );
}
