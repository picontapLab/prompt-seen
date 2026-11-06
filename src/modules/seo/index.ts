import 'server-only';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { builtLocales, config, type LocaleEntry } from '@/config';
import type { Alternate, ImageRef, PromptDetail, TemplateDetail } from '@/modules/content/types';
import { absoluteImageUrl } from '@/modules/media';
import { absoluteUrl, paths } from '@/modules/url';
import { buildPageMetadata, type PageSeo, type SeoContext } from './build';
import { isIndexable } from './indexing';
import {
  aboutPage,
  breadcrumbList,
  collectionPage,
  graph,
  organization,
  promptWork,
  templateWork,
  website,
  type JsonLdNode,
  type LdContext,
  type LdCrumb,
  type ListItemInput,
} from './structured-data';

// How pages get their metadata (design doc §9.3, §17.3 step 2). Every page's generateMetadata
// returns one of these; none sets title, canonical, hreflang or Open Graph itself:
//
//   export async function generateMetadata({ params }: Props): Promise<Metadata> {
//     const { locale, slug } = await params;
//     const { entry, detail } = loadPrompt(locale, slug);
//     return promptMetadata(detail, entry);
//   }
//
// Structured data (§9.6) works the same way: the page renders <JsonLd data={…} /> with one of
// the *StructuredData functions below, passing the breadcrumb items it shows:
//
//   const t = await getTranslations({ locale: entry.code, namespace: 'detail.breadcrumb' });
//   const crumbs = promptCrumbs(detail, entry.pathPrefix, (key) => t(key));
//   <JsonLd data={promptStructuredData(detail, entry, crumbs)} />

export { buildPageMetadata, ogLocale } from './build';
export type { PageSeo, SeoContext } from './build';
export { JsonLd } from './JsonLd';
export { isIndexable, type PageSections } from './indexing';
export { indexableLocales } from './sitemaps';
export type { JsonLdNode, LdCrumb, ListItemInput } from './structured-data';

/**
 * Verification tags of webmaster tools (§9.9), from site.yaml `searchEngines.verification`, for
 * the layouts' metadata: Google Search Console and Yandex by name, Bing (`msvalidate.01`) and
 * Naver Search Advisor as other tags. Empty when none is set.
 */
export function verificationMetadata(): Pick<Metadata, 'verification'> {
  const v = config.searchEngines.verification;
  const other = {
    ...(v.bing && { 'msvalidate.01': v.bing }),
    ...(v.naver && { 'naver-site-verification': v.naver }),
  };
  const verification = {
    ...(v.google && { google: v.google }),
    ...(v.yandex && { yandex: v.yandex }),
    ...(Object.keys(other).length && { other }),
  };
  return Object.keys(verification).length ? { verification } : {};
}

const context: SeoContext = {
  siteName: config.siteName,
  defaultLocale: config.defaultLocale,
  locales: builtLocales,
  absoluteUrl,
  absoluteImageUrl,
};

const ld: LdContext = {
  siteName: config.siteName,
  absoluteUrl,
  absoluteImageUrl,
  entryPath: paths.siteRoot(),
  logoPath: paths.siteIcon(),
};

async function documentTitle(locale: LocaleEntry, title: string, kind: 'prompt' | 'template') {
  const t = await getTranslations({ locale: locale.code, namespace: 'detail' });
  return t('documentTitle', { title, kind: t(`kinds.${kind}`), siteName: config.siteName });
}

/** A Prompt detail page: the full page and the popup share it (§9.2, §11.3). */
export async function promptMetadata(detail: PromptDetail, locale: LocaleEntry): Promise<Metadata> {
  return buildPageMetadata(
    {
      path: detail.path,
      locale,
      documentTitle: await documentTitle(locale, detail.seo.title, 'prompt'),
      title: detail.seo.title,
      description: detail.seo.description,
      alternates: detail.alternates,
      image: detail.cover,
      type: 'article',
      publishedTime: detail.createdAt,
      modifiedTime: detail.updatedAt,
      markdownPath: isIndexable(locale, detail.visibility)
        ? paths.promptMarkdown(locale.pathPrefix, detail.slug)
        : null,
    },
    context,
  );
}

/** A template detail page; its share image is the default sample's result (§9.7). */
export async function templateMetadata(detail: TemplateDetail, locale: LocaleEntry): Promise<Metadata> {
  return buildPageMetadata(
    {
      path: detail.path,
      locale,
      documentTitle: await documentTitle(locale, detail.seo.title, 'template'),
      title: detail.seo.title,
      description: detail.seo.description,
      alternates: detail.alternates,
      image: detail.cover,
      type: 'article',
      publishedTime: detail.createdAt,
      modifiedTime: detail.updatedAt,
      markdownPath: isIndexable(locale, detail.visibility)
        ? paths.templateMarkdown(locale.pathPrefix, detail.slug)
        : null,
    },
    context,
  );
}

/** Any other page: `title` is used as is, followed by the site name. */
export function pageMetadata(page: {
  path: string;
  locale: LocaleEntry;
  title: string;
  description: string;
  alternates: readonly Alternate[];
  noindex?: boolean;
}): Metadata {
  return buildPageMetadata(
    {
      ...page,
      documentTitle: page.title.includes(config.siteName) ? page.title : `${page.title} · ${config.siteName}`,
    } satisfies PageSeo,
    context,
  );
}

/**
 * A locale's home page (§8.2, §9.3, step 4b): every built language's home in hreflang and the
 * default-language home at the base path as the x-default. The share image is the work on show.
 */
export function homeMetadata(
  locale: LocaleEntry,
  page: { documentTitle: string; title: string; description: string; image?: ImageRef | null },
): Metadata {
  const metadata = buildPageMetadata(
    {
      ...page,
      path: paths.home(locale.pathPrefix),
      locale,
      alternates: builtLocales.map((l) => ({ locale: l.code, path: paths.home(l.pathPrefix) })),
    },
    context,
  );
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      languages: { ...metadata.alternates?.languages, 'x-default': absoluteUrl(paths.siteRoot()) },
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Structured data (§9.6). `crumbs` are the items of the breadcrumb the page shows, if any.

/** A Prompt detail page: CreativeWork with its main image, and the breadcrumb. */
export function promptStructuredData(
  detail: PromptDetail,
  locale: LocaleEntry,
  crumbs: readonly LdCrumb[],
): JsonLdNode {
  return graph(promptWork(detail, locale, ld), breadcrumbList(crumbs, ld));
}

/** A template page: CreativeWork of the default sample's prompt, and the breadcrumb. */
export function templateStructuredData(
  detail: TemplateDetail,
  locale: LocaleEntry,
  crumbs: readonly LdCrumb[],
): JsonLdNode {
  return graph(templateWork(detail, locale, ld), breadcrumbList(crumbs, ld));
}

/** A locale's home page: the site in that language and the Organization behind it. */
export function homeStructuredData(locale: LocaleEntry): JsonLdNode {
  return graph(website({ path: paths.home(locale.pathPrefix), locale }, ld), organization(ld));
}

/**
 * A list, topic or collection page (step 3a's list; steps 3c and 3e call it for theirs): the
 * items this page shows, in visible order, and the breadcrumb when the page has one.
 */
export function collectionStructuredData(
  page: {
    path: string;
    locale: LocaleEntry;
    name: string;
    description: string;
    items: readonly ListItemInput[];
    offset?: number;
  },
  crumbs: readonly LdCrumb[] = [],
): JsonLdNode {
  return graph(collectionPage(page, ld), breadcrumbList(crumbs, ld));
}

/** The about page (step 3e): AboutPage and the Organization it describes. */
export function aboutStructuredData(
  page: { path: string; locale: LocaleEntry; name: string; description: string },
  crumbs: readonly LdCrumb[] = [],
): JsonLdNode {
  return graph(aboutPage(page, ld), organization(ld), breadcrumbList(crumbs, ld));
}

/** A page whose only structured data is its breadcrumb, such as the license page (step 3e). */
export function breadcrumbStructuredData(crumbs: readonly LdCrumb[]): JsonLdNode {
  return graph(breadcrumbList(crumbs, ld));
}
