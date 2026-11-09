import type {
  CollectionSummary,
  ImageRef,
  PromptDetail,
  PromptSummary,
  TemplateDetail,
  TemplateSummary,
  Term,
} from '@/modules/content/types';
import { parseTemplateBody } from '@/modules/template/parse';
import { toShowcase } from '@/ui/showcase/model';
import { articleCount, assembleBatch, takesInterlude, type ListItem } from './assemble';
import {
  FEED_PAGE_SIZE,
  type ExcerptPart,
  type FeedBand,
  type FeedCard,
  type FeedImage,
  type FeedIndex,
  type FeedPage,
  type FeedTemplate,
  type Interlude,
  type Shape,
} from './types';

// Builds the list of one locale at build time (design doc §9.4, §11.1.4, §11.8.2): the
// newest-first pages with their interludes, the slim metadata index for filters and the
// showcase band. Pure: the `feed` emitter passes in the content model and site.yaml settings.

export type FeedSettings = {
  showcase: { from?: string; lead: string; works: string[] }[];
  interludes: (
    | { type: 'feature'; prompt: string }
    | { type: 'templates'; templates?: string[] }
    | { type: 'collection'; collection: string }
  )[];
};

export type ComposeInput = {
  locale: string;
  buildId: string;
  /** Build date, YYYY-MM-DD: picks the showcase group that is current. */
  today: string;
  /** Visible prompts, newest first (LocaleIndex.prompts). */
  prompts: readonly PromptSummary[];
  promptDetail: (id: string) => PromptDetail | null;
  templates: readonly TemplateSummary[];
  templateDetail: (id: string) => TemplateDetail | null;
  collections: readonly CollectionSummary[];
  /** Whether collection pages exist in this build: banners only link to pages that do. */
  collectionsLinked: boolean;
  terms: readonly Term[];
  settings: FeedSettings;
  ratioLabel: (width: number, height: number) => string;
  pageSize?: number;
};

export type ComposedFeed = { pages: FeedPage[]; index: FeedIndex; band: FeedBand | null };

export const shapeOf = (width: number, height: number): Shape => {
  const r = width / height;
  return r > 2 ? 'panorama' : r > 1.05 ? 'landscape' : r >= 0.95 ? 'square' : 'portrait';
};

export const slimImage = (image: ImageRef): FeedImage => ({
  mimeType: image.mimeType,
  animation: image.animation,
  width: image.width,
  height: image.height,
  placeholder: image.placeholder,
  alt: image.alt,
  variants: { thumbnail: image.variants.thumbnail, card: image.variants.card, detail: image.variants.detail },
});

export function toCard(p: PromptSummary, ratioLabel: ComposeInput['ratioLabel']): FeedCard {
  return {
    hasGifOutput: p.hasGifOutput,
    id: p.id,
    slug: p.slug,
    path: p.path,
    title: p.title,
    frameNumber: p.frameNumber,
    cover: slimImage(p.cover),
    ratio: ratioLabel(p.cover.width, p.cover.height),
    model: p.model.displayName ?? p.model.providerModelId,
    verification: p.verification,
    lastTestedAt: p.lastTestedAt,
    promptLanguage: p.promptLanguage,
    locale: p.locale,
    description: p.description,
  };
}

/** A template's opening with each placeholder in its field's variable colour (§11.1.1: fields in order, cycling 1–6). */
export function templateExcerpt(excerpt: string, fieldOrder: readonly string[]): ExcerptPart[] {
  return parseTemplateBody(excerpt).segments.map((s) =>
    s.kind === 'text' ? s.text : { v: s.name, c: (Math.max(fieldOrder.indexOf(s.name), 0) % 6) + 1 },
  );
}

/** A browsing preview never borrows another locale's prose or field definitions. */
export function toFeedTemplate(summary: TemplateSummary, detail: TemplateDetail | null): FeedTemplate | null {
  if (!detail || detail.id !== summary.id || detail.locale !== summary.locale) return null;
  return {
    id: summary.id,
    path: summary.path,
    title: summary.title,
    locale: summary.locale,
    description: summary.description,
    fieldCount: summary.fieldCount,
    promptLanguage: summary.promptLanguage,
    excerpt:
      summary.promptLanguage === summary.locale
        ? templateExcerpt(
            summary.bodyExcerpt,
            detail.version.fields.map((f) => f.name),
          )
        : null,
  };
}

/** Stable language priority for automatic selections; missing details do not consume a slot. */
export function pickFeedTemplates(
  summaries: readonly TemplateSummary[],
  detailOf: (id: string) => TemplateDetail | null,
  locale: string,
  limit: number,
): FeedTemplate[] {
  const visible = summaries.filter((t) => t.locale === locale);
  const ordered = [
    ...visible.filter((t) => t.promptLanguage === locale),
    ...visible.filter((t) => t.promptLanguage !== locale),
  ];
  const items: FeedTemplate[] = [];
  for (const summary of ordered) {
    if (items.length >= limit) break;
    const item = toFeedTemplate(summary, detailOf(summary.id));
    if (item) items.push(item);
  }
  return items;
}

/** The showcase group in effect on `today`: the latest dated one that has started, else the first undated. */
export function currentShowcaseGroups(groups: FeedSettings['showcase'], today: string) {
  return groups
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => !g.from || g.from <= today)
    .sort((a, b) => (b.g.from ?? '').localeCompare(a.g.from ?? '') || a.i - b.i)
    .map(({ g }) => g);
}

export function composeFeed(input: ComposeInput): ComposedFeed {
  const size = input.pageSize ?? FEED_PAGE_SIZE;
  const { prompts, ratioLabel } = input;
  const byId = new Map(prompts.map((p) => [p.id, p]));

  const featureOf = (
    p: PromptSummary,
    reason: 'extreme' | 'editorial',
  ): Extract<Interlude, { t: 'feature' }> | null => {
    const detail = input.promptDetail(p.id);
    if (!detail) return null;
    return {
      t: 'feature',
      key: `${reason}-${p.id}`,
      reason,
      card: toCard(p, ratioLabel),
      showcase: toShowcase(detail),
    };
  };

  // --- Editorial interludes, resolved for this locale; ones with nothing to show are dropped.
  const editorial: Interlude[] = [];
  input.settings.interludes.forEach((cfg, i) => {
    if (cfg.type === 'feature') {
      const p = byId.get(cfg.prompt);
      const feature = p && featureOf(p, 'editorial');
      if (feature) editorial.push({ ...feature, key: `editorial-${i}-${p.id}` });
    } else if (cfg.type === 'templates') {
      const items = cfg.templates
        ? cfg.templates.flatMap((id) => {
            const summary = input.templates.find((t) => t.id === id && t.locale === input.locale);
            const item = summary && toFeedTemplate(summary, input.templateDetail(id));
            return item ? [item] : [];
          })
        : pickFeedTemplates(input.templates, input.templateDetail, input.locale, 3);
      if (items.length >= 2) editorial.push({ t: 'templates', key: `templates-${i}`, items });
    } else if (input.collectionsLinked) {
      const c = input.collections.find((x) => x.id === cfg.collection);
      if (c)
        editorial.push({
          t: 'collection',
          key: `collection-${i}-${c.id}`,
          item: {
            id: c.id,
            path: c.path,
            title: c.title,
            description: c.description,
            cover: slimImage(c.cover),
            itemCount: c.itemCount,
          },
        });
    }
  });

  // --- Newest-first pages: extreme works become feature rows where they fall (§11.1.4); each
  // long enough page takes the next editorial interlude in rotation (§11.8.2).
  const items: ListItem[] = prompts.map((p) => ({
    card: toCard(p, ratioLabel),
    feature: p.cover.extreme ? featureOf(p, 'extreme') : null,
  }));
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  let rotation = 0;
  let articles = 0;
  const pages: FeedPage[] = [];
  for (let n = 1; n <= pageCount; n += 1) {
    const slice = items.slice((n - 1) * size, n * size);
    const next = editorial.length && takesInterlude(slice.length) ? editorial[rotation++ % editorial.length]! : null;
    // The rotation repeats on long lists; keys stay unique per page.
    const blocks = assembleBatch(slice, next && { ...next, key: `${next.key}@${n}` });
    pages.push({
      buildId: input.buildId,
      locale: input.locale,
      page: n,
      pageCount,
      total: items.length,
      offset: (n - 1) * size,
      articleOffset: articles,
      articleTotal: 0,
      blocks,
    });
    articles += articleCount(blocks);
  }
  for (const page of pages) page.articleTotal = articles;

  // --- Showcase band and featured order (§11.8.2).
  const groups = currentShowcaseGroups(input.settings.showcase, input.today);
  let band: FeedBand | null = null;
  for (const g of groups) {
    const lead = input.promptDetail(g.lead);
    if (!lead || !byId.has(g.lead) || lead.annotations.length === 0) continue;
    const works = g.works
      .filter((id) => id !== g.lead)
      .map((id) => byId.get(id))
      .filter((p) => !!p)
      .map((p) => toCard(p, ratioLabel));
    band = { lead: toShowcase(lead), leadSlug: lead.slug, works };
    break;
  }

  // Picks of groups that have started, newest group first (a scheduled group waits its turn).
  const picks = groups.flatMap((g) => [g.lead, ...g.works]);
  const rank = (p: PromptSummary) => {
    const pick = picks.indexOf(p.id);
    if (pick >= 0) return pick;
    return picks.length + (p.annotated ? 0 : p.verification === 'verified' ? 1 : 2) * prompts.length;
  };
  // Stable sort keeps newest first within each group.
  const featured = prompts
    .map((p, i) => ({ id: p.id, key: rank(p), i }))
    .sort((a, b) => a.key - b.key || a.i - b.i)
    .map((x) => x.id);

  const pageOf = new Map(prompts.map((p, i) => [p.id, Math.floor(i / size) + 1]));
  const terms = (kind: Term['kind']) =>
    input.terms.filter((t) => t.kind === kind && t.count > 0).map((t) => ({ id: t.id, label: t.label }));

  const index: FeedIndex = {
    buildId: input.buildId,
    locale: input.locale,
    pageSize: size,
    pageCount,
    items: prompts.map((p) => {
      const detail = input.promptDetail(p.id);
      return {
        id: p.id,
        p: pageOf.get(p.id)!,
        s: p.styleIds,
        u: p.useCaseIds,
        r: shapeOf(p.cover.width, p.cover.height),
        ref: detail?.test.referenceImage === 'required',
        x: p.cover.extreme,
      };
    }),
    featured,
    styles: terms('style'),
    useCases: terms('useCase'),
    editorial,
  };

  return { pages, index, band };
}
