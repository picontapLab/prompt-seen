import { languageAttributes } from '@/ui/prompt-detail/language';
import { isAggregateIndexable } from '@/modules/seo/indexing';
import { LanguageLinks } from '@/ui/navigation/LanguageLinks';
import 'server-only';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { builtLocales, type LocaleEntry } from '@/config';
import { listEntries } from '@/modules/content';
import type { CollectionDetail, CollectionSummary } from '@/modules/content/types';
import { collectionStructuredData, pageMetadata } from '@/modules/seo';
import { paths } from '@/modules/url';
import { FrameNumber } from '@/ui/brand/FrameNumber';
import { collectionCrumbs } from '@/ui/prompt-detail/crumbs';
import { RelatedRow } from '@/ui/prompt-detail/RelatedRow';
import { Article, Cover, PageHead } from './PageParts';
import styles from './Pages.module.css';

// Editorial collections (design doc §9.1, §11.8.5): the cover complete at its ratio, the display
// title and lead, the text, then the entries in editorial order. Each entry alternates image
// and text: a large complete image, its position, title, the editor's reason and the way in.

const collectionsOf = (code: string): CollectionSummary[] => listEntries({ locale: code, kind: 'collection' });

export function collectionMetadata(detail: CollectionDetail, locale: LocaleEntry) {
  return pageMetadata({
    path: detail.path,
    locale,
    title: detail.seo.title,
    description: detail.seo.description,
    alternates: detail.alternates,
    noindex: !detail.localization.indexable,
  });
}

const two = (n: number) => String(n).padStart(2, '0');

export async function CollectionBody({ detail, locale }: { detail: CollectionDetail; locale: LocaleEntry }) {
  const t = await getTranslations({ locale: locale.code, namespace: 'pages' });
  const crumbs = collectionCrumbs(detail, locale.pathPrefix, (key) => t(`breadcrumb.${key}`));
  const related = collectionsOf(locale.code).filter((c) => c.id !== detail.id);

  return (
    <div className="container" data-page="collection" data-entry={detail.id} data-locale={locale.code}>
      <LanguageLinks links={detail.languageLinks} />
      <PageHead
        contentLocale={detail.localization.contentLocale}
        crumbs={crumbs}
        crumbLabel={t('breadcrumb.label')}
        eyebrow={`${t('collection.eyebrow')} · ${t('collection.count', { count: detail.items.length })}`}
        title={detail.title}
        lead={detail.description}
        media={<Cover image={detail.cover} priority sizes="(min-width: 1024px) 45vw, 100vw" />}
      />
      <Article
        contentLocale={detail.localization.contentLocale}
        body={detail.body}
        toc={detail.toc}
        tocLabel={t('toc')}
      />
      <ol className={styles.items}>
        {detail.items.map((item, i) => {
          const entry = item.entry;
          const image = entry.cover;
          return (
            <li key={entry.id} className={styles.item} data-entry={entry.id}>
              {image && (
                <Link href={entry.path} prefetch={false} className={styles.itemImage} tabIndex={-1} aria-hidden="true">
                  <Cover image={image} sizes="(min-width: 768px) 55vw, 100vw" />
                </Link>
              )}
              <div className={styles.itemText}>
                <p className={styles.itemNumber}>
                  <span>{two(i + 1)}</span>
                  {item.kind === 'prompt' ? (
                    <FrameNumber n={Number(item.entry.frameNumber)} />
                  ) : (
                    <span>{t('collection.template')}</span>
                  )}
                </p>
                <h2 {...languageAttributes(entry.localization.contentLocale)} className={styles.itemTitle}>
                  <Link href={entry.path} prefetch={false}>
                    {entry.title}
                  </Link>
                </h2>
                <p
                  {...languageAttributes(
                    item.reason ? detail.localization.contentLocale : entry.localization.contentLocale,
                  )}
                  className={styles.itemReason}
                >
                  {item.reason ?? entry.description}
                </p>
                <p>
                  <Link
                    href={entry.path}
                    prefetch={false}
                    className={styles.more}
                    aria-label={`${item.kind === 'prompt' ? t('collection.viewPrompt') : t('collection.openTemplate')}: ${entry.title}`}
                  >
                    {item.kind === 'prompt' ? t('collection.viewPrompt') : t('collection.openTemplate')}
                  </Link>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className={styles.section}>
        <RelatedRow
          heading={t('collection.related')}
          items={related.map((c) => ({
            href: c.path,
            title: c.title,
            image: c.cover,
            meta: t('collection.count', { count: c.itemCount }),
          }))}
        />
      </div>
    </div>
  );
}

export async function collectionPageStructuredData(detail: CollectionDetail, locale: LocaleEntry) {
  const t = await getTranslations({ locale: locale.code, namespace: 'pages' });
  return collectionStructuredData(
    {
      path: detail.path,
      locale,
      indexable: detail.localization.indexable,
      name: detail.title,
      description: detail.description,
      items: detail.items.map((i) => ({ path: i.entry.path, name: i.entry.title })),
    },
    collectionCrumbs(detail, locale.pathPrefix, (key) => t(`breadcrumb.${key}`)),
  );
}

// --- /{locale}/collections/ -------------------------------------------------------------------

/** Metadata of the index: hreflang for the locales that have collections; noindex when empty. */
export async function collectionIndexMetadata(locale: LocaleEntry) {
  const t = await getTranslations({ locale: locale.code, namespace: 'pages.collections' });
  return pageMetadata({
    path: paths.collections(locale.pathPrefix),
    locale,
    title: t('documentTitle'),
    description: t('description'),
    alternates: builtLocales
      .filter((l) => isAggregateIndexable(l, collectionsOf(l.code)))
      .map((l) => ({ locale: l.code, path: paths.collections(l.pathPrefix) })),
    noindex: !isAggregateIndexable(locale, collectionsOf(locale.code)),
  });
}

export async function collectionIndexStructuredData(locale: LocaleEntry) {
  const t = await getTranslations({ locale: locale.code, namespace: 'pages' });
  return collectionStructuredData(
    {
      path: paths.collections(locale.pathPrefix),
      locale,
      name: t('collections.title'),
      description: t('collections.description'),
      indexable: isAggregateIndexable(locale, collectionsOf(locale.code)),
      items: collectionsOf(locale.code).map((c) => ({ path: c.path, name: c.title })),
    },
    collectionCrumbs(null, locale.pathPrefix, (key) => t(`breadcrumb.${key}`)),
  );
}

export async function CollectionIndex({ locale }: { locale: LocaleEntry }) {
  const t = await getTranslations({ locale: locale.code, namespace: 'pages' });
  const collections = collectionsOf(locale.code);
  return (
    <div className="container" data-page="collection-index" data-locale={locale.code}>
      <PageHead
        crumbs={collectionCrumbs(null, locale.pathPrefix, (key) => t(`breadcrumb.${key}`))}
        crumbLabel={t('breadcrumb.label')}
        eyebrow={t('collection.count', { count: collections.length })}
        title={t('collections.title')}
        lead={t('collections.intro')}
      />
      {collections.length === 0 ? (
        <p className={styles.empty}>{t('collections.empty')}</p>
      ) : (
        <ul className={styles.index}>
          {collections.map((c, i) => (
            <li key={c.id} className={styles.indexItem} data-entry={c.id}>
              <Link href={c.path} prefetch={false} className={styles.indexLink}>
                <Cover image={c.cover} priority={i === 0} sizes="(min-width: 768px) 45vw, 100vw" />
                <span className={styles.itemNumber}>
                  {two(i + 1)} · {t('collection.count', { count: c.itemCount })}
                </span>
                <span {...languageAttributes(c.localization.contentLocale)} className={styles.indexTitle}>
                  {c.title}
                </span>
              </Link>
              <p {...languageAttributes(c.localization.contentLocale)} className={styles.itemReason}>
                {c.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
