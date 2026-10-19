import 'server-only';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { LocaleEntry } from '@/config';
import { localeIndex } from '@/modules/content';
import type { TaxonomyKind, TopicDetail, TopicSummary } from '@/modules/content/types';
import { EMPTY_QUERY, formatQuery } from '@/modules/feed/query';
import { collectionStructuredData, pageMetadata } from '@/modules/seo';
import { paths } from '@/modules/url';
import { topicCrumbs } from '@/ui/prompt-detail/crumbs';
import { RelatedRow } from '@/ui/prompt-detail/RelatedRow';
import { Article, Cover, PageHead, WorkRows } from './PageParts';
import styles from './Pages.module.css';
import { cardsFor } from './works';

// Category, style and use-case topic pages (design doc §9.1, §11.8.5). One template for all
// three; a topic exists in a locale only when its text is published there and at least three
// visible prompts use the term (§9.1 发布条件), which the content build decides.

/** URL segment of each kind of topic (§9.1). */
export const TOPIC_SEGMENT: Record<TaxonomyKind, 'categories' | 'styles' | 'use-cases'> = {
  category: 'categories',
  style: 'styles',
  useCase: 'use-cases',
};

const topicsOf = (code: string, taxonomy?: TaxonomyKind): TopicSummary[] =>
  localeIndex(code).topics.filter((t) => !taxonomy || t.taxonomy === taxonomy);

/** `generateStaticParams` of one kind of topic in one locale. */
export function topicParams(code: string, taxonomy: TaxonomyKind): { slug: string }[] {
  return topicsOf(code, taxonomy).map((t) => ({ slug: t.slug }));
}

export function topicMetadata(detail: TopicDetail, locale: LocaleEntry) {
  return pageMetadata({
    path: detail.path,
    locale,
    title: detail.seo.title,
    description: detail.seo.description,
    alternates: detail.alternates,
  });
}

/** The list filtered by this term, when the list's filters cover its kind (§11.8.2: style, use). */
function listFilter(detail: TopicDetail, prefix: string): string | null {
  if (detail.taxonomy === 'style')
    return paths.promptsFiltered(prefix, formatQuery({ ...EMPTY_QUERY, style: detail.id }));
  if (detail.taxonomy === 'useCase')
    return paths.promptsFiltered(prefix, formatQuery({ ...EMPTY_QUERY, use: [detail.id] }));
  return null;
}

export async function TopicBody({ detail, locale }: { detail: TopicDetail; locale: LocaleEntry }) {
  const t = await getTranslations({ locale: locale.code, namespace: 'pages' });
  const prefix = locale.pathPrefix;
  const crumbs = topicCrumbs(detail, prefix, (key) => t(`breadcrumb.${key}`));
  const cards = cardsFor(
    locale.code,
    detail.prompts.map((p) => p.id),
  );
  const filtered = listFilter(detail, prefix);
  const related = topicsOf(locale.code).filter((x) => !(x.taxonomy === detail.taxonomy && x.id === detail.id));

  return (
    <div
      className="container"
      data-page="topic"
      data-topic={`${detail.taxonomy}/${detail.id}`}
      data-locale={locale.code}
    >
      <PageHead
        crumbs={crumbs}
        crumbLabel={t('breadcrumb.label')}
        eyebrow={`${t(`topic.kinds.${detail.taxonomy}`)} · ${t('topic.count', { count: detail.promptCount })}`}
        title={detail.title}
        lead={detail.description}
        media={detail.cover && <Cover image={detail.cover} priority sizes="(min-width: 1024px) 45vw, 100vw" />}
      />
      <Article body={detail.body} toc={detail.toc} tocLabel={t('toc')} />
      <section className={styles.section} aria-labelledby="topic-works">
        <div className={styles.sectionHead}>
          <h2 id="topic-works" className={styles.sectionTitle}>
            {t('topic.works')}
          </h2>
          {filtered && (
            <Link href={filtered} prefetch={false} className={styles.more}>
              {t('topic.inList')}
            </Link>
          )}
        </div>
        <WorkRows cards={cards} locale={locale.code} label={t('topic.works')} />
      </section>
      <div className={styles.section}>
        <RelatedRow
          heading={t('topic.related')}
          items={related.map((x) => ({
            href: x.path,
            title: x.title,
            image: x.cover,
            meta: `${t(`topic.kinds.${x.taxonomy}`)} · ${t('topic.count', { count: x.promptCount })}`,
          }))}
        />
      </div>
    </div>
  );
}

/** CollectionPage with the works in the order shown, and the breadcrumb (§9.6). */
export async function topicStructuredData(detail: TopicDetail, locale: LocaleEntry) {
  const t = await getTranslations({ locale: locale.code, namespace: 'pages' });
  return collectionStructuredData(
    {
      path: detail.path,
      locale,
      name: detail.title,
      description: detail.description,
      items: cardsFor(
        locale.code,
        detail.prompts.map((p) => p.id),
      ).map((c) => ({ path: c.path, name: c.title })),
    },
    topicCrumbs(detail, locale.pathPrefix, (key) => t(`breadcrumb.${key}`)),
  );
}
