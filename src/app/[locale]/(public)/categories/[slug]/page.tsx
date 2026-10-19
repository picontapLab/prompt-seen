import type { Metadata } from 'next';
import { localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { getDetailModel } from '@/modules/content';
import { JsonLd } from '@/modules/seo';
import { EMPTY_PARAM } from '@/modules/url';
import { TopicBody, topicMetadata, topicParams, topicStructuredData } from '@/ui/pages/TopicBody';

// category topic pages (design doc §9.1, §11.8.5). Generated only where the topic meets its
// publishing rule in this locale (§9.1 发布条件); every other address answers 404.
type Props = { params: Promise<{ locale: string; slug: string }> };

const KIND = 'category';

export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { locale: string } }) {
  const entry = localeByPrefix(params.locale);
  const found = entry ? topicParams(entry.code, KIND) : [];
  return found.length ? found : [{ slug: EMPTY_PARAM }];
}

function load(code: string, slug: string) {
  const detail = getDetailModel('topic', `${KIND}/${slug}`, code);
  if (!detail) throw new Error(`topic ${KIND}/${slug} has no detail model in ${code}: rebuild content`);
  return detail;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (slug === EMPTY_PARAM) return { robots: { index: false } };
  const entry = localeByPrefix(locale)!;
  return topicMetadata(load(entry.code, slug), entry);
}

export default async function TopicPage({ params }: Props) {
  const { locale, slug } = await params;
  const entry = enterLocale(locale);
  if (slug === EMPTY_PARAM) return null;
  const detail = load(entry.code, slug);
  return (
    <>
      <JsonLd data={await topicStructuredData(detail, entry)} />
      <TopicBody detail={detail} locale={entry} />
    </>
  );
}
