import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { config, localeByPrefix } from '@/config';
import { ClientMessages } from '@/i18n/client-messages';
import { enterLocale } from '@/i18n/locale';
import { findBySlug, getDetailModel, listEntries } from '@/modules/content';
import { JsonLd, promptMetadata, promptStructuredData } from '@/modules/seo';
import { promptCrumbs } from '@/ui/prompt-detail/crumbs';
import { PromptDetailBody } from '@/ui/prompt-detail/PromptDetailBody';

// Prompt detail, the full page (design doc §9.2, §11.8.3). Every prompt visible in a locale is
// pre-rendered there; the popup of step 4a renders the same PromptDetailBody from the same model.
type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { locale: string } }) {
  const entry = localeByPrefix(params.locale);
  return entry ? listEntries({ locale: entry.code, kind: 'prompt' }).map((e) => ({ slug: e.slug })) : [];
}

/** The detail model; params come from generateStaticParams, so a miss is a build bug. */
function load(code: string, slug: string) {
  const summary = findBySlug('prompt', code, slug);
  const detail = summary && getDetailModel('prompt', summary.id, code);
  if (!detail) throw new Error(`prompt "${slug}" has no detail model in ${code}: rebuild content`);
  return detail;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = localeByPrefix(locale)!;
  return promptMetadata(load(entry.code, slug), entry);
}

export default async function PromptPage({ params }: Props) {
  const { locale, slug } = await params;
  const entry = enterLocale(locale);
  const detail = load(entry.code, slug);
  const t = await getTranslations({ locale: entry.code, namespace: 'detail.breadcrumb' });
  const crumbs = promptCrumbs(detail, entry.pathPrefix, (key) => t(key));
  return (
    <div className="container" data-width="detail" data-page="prompt-detail">
      <JsonLd data={promptStructuredData(detail, entry, crumbs)} />
      <ClientMessages namespaces={['detail', 'favorites', 'shortcuts']}>
        <PromptDetailBody detail={detail} locale={entry} siteName={config.siteName} />
      </ClientMessages>
    </div>
  );
}
