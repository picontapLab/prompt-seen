import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { localeByPrefix } from '@/config';
import { ClientMessages } from '@/i18n/client-messages';
import { enterLocale } from '@/i18n/locale';
import { findBySlug, getDetailModel, listEntries } from '@/modules/content';
import { JsonLd, templateMetadata, templateStructuredData } from '@/modules/seo';
import { templateCrumbs } from '@/ui/prompt-detail/crumbs';
import { TemplateDetailBody } from '@/ui/template-detail/TemplateDetailBody';

// Template detail (design doc §6, §9.1). The initial HTML carries the default sample's prompt;
// the interactive editor is step 3c.
type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { locale: string } }) {
  const entry = localeByPrefix(params.locale);
  return entry ? listEntries({ locale: entry.code, kind: 'template' }).map((e) => ({ slug: e.slug })) : [];
}

/** The detail model; params come from generateStaticParams, so a miss is a build bug. */
function load(code: string, slug: string) {
  const summary = findBySlug('template', code, slug);
  const detail = summary && getDetailModel('template', summary.id, code);
  if (!detail) throw new Error(`template "${slug}" has no detail model in ${code}: rebuild content`);
  return detail;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = localeByPrefix(locale)!;
  return templateMetadata(load(entry.code, slug), entry);
}

export default async function TemplatePage({ params }: Props) {
  const { locale, slug } = await params;
  const entry = enterLocale(locale);
  const detail = load(entry.code, slug);
  const t = await getTranslations({ locale: entry.code, namespace: 'detail.breadcrumb' });
  const crumbs = templateCrumbs(entry.pathPrefix, (key) => t(key));
  return (
    <div className="container" data-width="detail" data-page="template-detail">
      <JsonLd data={templateStructuredData(detail, entry, crumbs)} />
      <ClientMessages namespaces={['detail']}>
        <TemplateDetailBody detail={detail} locale={entry} />
      </ClientMessages>
    </div>
  );
}
