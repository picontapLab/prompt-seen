import 'server-only';
import { builtLocales, config, type LocaleEntry } from '@/config';
import { homeIndexable } from '@/modules/home/server';
import { localeIndex } from '@/modules/content';
import type { ImageRef, LocalizationState } from '@/modules/content/types';
import { feedIndex, feedPage, feedBand, type FeedCard, type FeedPage } from '@/modules/feed';
import { absoluteImageUrl } from '@/modules/media';
import { absoluteUrl, paths } from '@/modules/url';
import { isAggregateIndexable, type PageSections } from './indexing';
import { latest, type SitemapRef, type SitemapUrl } from './sitemap';

// What the sitemaps list (design doc §9.3, §9.7). Only pages a search engine may index: locales
// that are enabled (preview-only locales never are) and versions that pass every publishing rule.
// Drafts of a preview build are left out, as are pages that do not exist in this build.

/** Locales whose pages may be indexed: built and enabled (§8.2, §8.7). */
export const indexableLocales = (): LocaleEntry[] =>
  config.buildMode === 'production' ? builtLocales.filter((l) => l.enabled) : [];

/** Works of a list page in visible order: cards, and feature rows standing in for their card. */
export function listPageWorks(page: FeedPage): FeedCard[] {
  return page.blocks.flatMap((b) =>
    b.t === 'cards' ? b.items : b.t === 'feature' && b.reason === 'extreme' ? [b.card] : [],
  );
}

/** Every displayed work participates in eligibility, including editorial interludes. */
export function listPageIndexable(locale: LocaleEntry, page: FeedPage): boolean {
  const items = page.blocks.flatMap((block): { localization: LocalizationState }[] =>
    block.t === 'cards' || block.t === 'templates' ? block.items : block.t === 'feature' ? [block.card] : [block.item],
  );
  const band = page.page === 1 ? feedBand(locale.code) : null;
  if (band) items.push(band.lead, ...band.works);
  return isAggregateIndexable(locale, items);
}

const mainImage = (image: ImageRef | null): string[] => {
  const variant = image && (image.variants.detail ?? image.variants.card ?? image.variants.original);
  return variant ? [absoluteImageUrl(variant)] : [];
};

/** Every indexable page of one locale, with its last content change and main image. */
export function localeSitemapUrls(locale: LocaleEntry, sections: PageSections): SitemapUrl[] {
  if (!locale.enabled || config.buildMode !== 'production') return [];
  const index = localeIndex(locale.code);
  const prefix = locale.pathPrefix;
  const published = <T extends { localization: LocalizationState }>(entries: readonly T[]) =>
    entries.filter((e) => e.localization.indexable);
  const prompts = published(index.prompts);
  const templates = published(index.templates);
  const urls: SitemapUrl[] = [];

  // Only the canonical home: the default locale lives at the root, its prefixed alias is omitted.
  // Sitemaps are submitted through robots.txt or Search Console, allowing the root URL here.
  if (homeIndexable(locale)) urls.push({ loc: absoluteUrl(paths.home(prefix)) });

  if (sections.prompts) {
    const updated = new Map(index.prompts.map((p) => [p.id, p.updatedAt]));
    const { pageCount } = feedIndex(locale.code);
    for (let n = 1; n <= pageCount; n++) {
      const works = listPageWorks(feedPage(locale.code, n));
      if (!listPageIndexable(locale, feedPage(locale.code, n))) continue;
      urls.push({
        loc: absoluteUrl(paths.promptsPage(prefix, n)),
        lastmod: latest(works.map((w) => updated.get(w.id))),
      });
    }
  }
  for (const p of prompts) urls.push({ loc: absoluteUrl(p.path), lastmod: p.updatedAt, images: mainImage(p.cover) });

  if (sections.templates && isAggregateIndexable(locale, index.templates))
    urls.push({ loc: absoluteUrl(paths.templates(prefix)), lastmod: latest(templates.map((t) => t.updatedAt)) });
  for (const t of templates) urls.push({ loc: absoluteUrl(t.path), lastmod: t.updatedAt, images: mainImage(t.cover) });

  const collections = published(index.collections);
  if (sections.collections && isAggregateIndexable(locale, index.collections))
    urls.push({ loc: absoluteUrl(paths.collections(prefix)), lastmod: latest(collections.map((c) => c.updatedAt)) });
  if (sections.collections)
    for (const c of collections)
      urls.push({ loc: absoluteUrl(c.path), lastmod: c.updatedAt, images: mainImage(c.cover) });
  if (sections.topics)
    for (const t of published(index.topics))
      urls.push({ loc: absoluteUrl(t.path), lastmod: t.updatedAt, images: mainImage(t.cover) });
  if (sections.pages)
    for (const p of published(index.pages)) urls.push({ loc: absoluteUrl(p.path), lastmod: p.updatedAt });

  return urls;
}

/** The sitemap index: one sitemap per indexable locale, dated by its newest entry. */
export function sitemapRefs(sections: PageSections): SitemapRef[] {
  return indexableLocales().map((l) => ({
    loc: absoluteUrl(paths.sitemap(l.pathPrefix)),
    lastmod: latest(localeSitemapUrls(l, sections).map((u) => u.lastmod)),
  }));
}
