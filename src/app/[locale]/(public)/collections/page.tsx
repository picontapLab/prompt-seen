import type { Metadata } from 'next';
import { localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { JsonLd } from '@/modules/seo';
import { CollectionIndex, collectionIndexMetadata, collectionIndexStructuredData } from '@/ui/pages/CollectionBody';

// The index of editorial collections (design doc §9.1), the header's Collections section.
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return collectionIndexMetadata(localeByPrefix(locale)!);
}

export default async function CollectionIndexPage({ params }: Props) {
  const { locale } = await params;
  const entry = enterLocale(locale);
  return (
    <>
      <JsonLd data={await collectionIndexStructuredData(entry)} />
      <CollectionIndex locale={entry} />
    </>
  );
}
