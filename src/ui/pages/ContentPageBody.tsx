import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { LocaleEntry } from '@/config';
import { localeIndex } from '@/modules/content';
import type { PageDetail } from '@/modules/content/types';
import { aboutStructuredData, breadcrumbStructuredData, pageMetadata } from '@/modules/seo';
import { pageCrumbs } from '@/ui/prompt-detail/crumbs';
import { Article, PageHead } from './PageParts';

// About and license pages (design doc §9.1, §9.8, §9.10.5): long-form text at /{locale}/{slug}/,
// in the reading width with the contents list beside it on desktop.

/** `generateStaticParams` of /{locale}/[page]/: the content pages visible in this locale. */
export function contentPageParams(code: string): { page: string }[] {
  return localeIndex(code).pages.map((p) => ({ page: p.slug }));
}

export function contentPageMetadata(detail: PageDetail, locale: LocaleEntry) {
  return pageMetadata({
    path: detail.path,
    locale,
    title: detail.seo.title,
    description: detail.seo.description,
    alternates: detail.alternates,
  });
}

export async function contentPageStructuredData(detail: PageDetail, locale: LocaleEntry) {
  const t = await getTranslations({ locale: locale.code, namespace: 'pages.breadcrumb' });
  const crumbs = pageCrumbs(detail, locale.pathPrefix, (key) => t(key));
  // The about page describes the site's Organization (§9.6); other pages carry their breadcrumb.
  return detail.slug === 'about'
    ? aboutStructuredData({ path: detail.path, locale, name: detail.title, description: detail.description }, crumbs)
    : breadcrumbStructuredData(crumbs);
}

export async function ContentPageBody({ detail, locale }: { detail: PageDetail; locale: LocaleEntry }) {
  const t = await getTranslations({ locale: locale.code, namespace: 'pages' });
  return (
    <div className="container" data-page="content-page" data-slug={detail.slug} data-locale={locale.code}>
      <PageHead
        crumbs={pageCrumbs(detail, locale.pathPrefix, (key) => t(`breadcrumb.${key}`))}
        crumbLabel={t('breadcrumb.label')}
        title={detail.title}
        lead={detail.description}
      />
      <Article body={detail.body} toc={detail.toc} tocLabel={t('toc')} />
    </div>
  );
}
