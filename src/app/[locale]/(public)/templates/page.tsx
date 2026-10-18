import type { Metadata } from 'next';
import { localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { JsonLd } from '@/modules/seo';
import { TemplateList, templateListMetadata, templateListStructuredData } from '@/ui/template-list/TemplateList';

// The template list (design doc §9.1, §11.8).
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return templateListMetadata(localeByPrefix(locale)!);
}

export default async function TemplateListPage({ params }: Props) {
  const { locale } = await params;
  const entry = enterLocale(locale);
  return (
    <>
      <JsonLd data={await templateListStructuredData(entry)} />
      <TemplateList locale={entry} />
    </>
  );
}
