import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { builtLocales, localeByPrefix } from '@/config';
import { enterLocale } from '@/i18n/locale';
import { feedIndex } from '@/modules/feed';
import { PromptList } from '@/ui/gallery/PromptList';
import { listMetadata } from '@/ui/gallery/list-metadata';

// Pages 2…n of the Prompt list (design doc §9.4): each has its own address, canonical, cards and
// page links. /page/1/ is not generated; the host redirects it to the list (§9.4). A page number
// beyond the list is not generated either, so the host answers 404.
type Props = { params: Promise<{ locale: string; page: string }> };

export const dynamicParams = false;

const laterPages = (code: string) =>
  Array.from({ length: Math.max(feedIndex(code).pageCount - 1, 0) }, (_, i) => String(i + 2));

/**
 * Pages 2…n of this locale's list. Static export rejects an empty list for any locale, and a
 * short list (a draft locale) has no page 2: such a locale returns another locale's page,
 * which Next.js merges and de-duplicates. When no locale has a page 2, page 2 is rendered as
 * not found and scripts/package.ts removes it from the artifact.
 */
export function generateStaticParams({ params }: { params: { locale: string } }) {
  const entry = localeByPrefix(params.locale);
  const own = entry ? laterPages(entry.code) : [];
  if (own.length) return own.map((page) => ({ page }));
  const other = builtLocales.find((l) => laterPages(l.code).length);
  return other ? [{ locale: other.pathPrefix, page: '2' }] : [{ page: '2' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  const entry = localeByPrefix(locale)!;
  if (Number(page) > feedIndex(entry.code).pageCount) return {};
  return listMetadata(entry, Number(page));
}

export default async function PromptListPageN({ params }: Props) {
  const { locale, page } = await params;
  const entry = enterLocale(locale);
  if (Number(page) > feedIndex(entry.code).pageCount) notFound();
  return <PromptList locale={entry} page={Number(page)} />;
}
