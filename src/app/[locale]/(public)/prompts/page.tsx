import type { Metadata } from 'next';
import { localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { JsonLd } from '@/modules/seo';
import { PromptList } from '@/ui/gallery/PromptList';
import { listMetadata, listStructuredData } from '@/ui/gallery/list-metadata';

// The Prompt list, page 1 (design doc §9.4, §11.8.2). Later pages are /page/{n}/.
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return listMetadata(localeByPrefix(locale)!, 1);
}

export default async function PromptListPage({ params }: Props) {
  const { locale } = await params;
  const entry = enterLocale(locale);
  return (
    <>
      <JsonLd data={await listStructuredData(entry, 1)} />
      <PromptList locale={entry} page={1} />
    </>
  );
}
