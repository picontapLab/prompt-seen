import type {
  CollectionSummary,
  PromptDetail,
  PromptSummary,
  TemplateDetail,
  TemplateSummary,
  Term,
} from '@/modules/content/types';
import { slimImage, pickFeedTemplates } from '@/modules/feed/compose';
import type { FeedImage, FeedTemplate } from '@/modules/feed/types';
import { toShowcase, type Showcase } from '@/ui/showcase/model';
import { featuredOrder, type HomeSettings } from './featured';

export { featuredOrder, type HomeSettings } from './featured';

// What the home page of one locale shows (design doc §11.8.1): the works on show on the first
// screen, more works under them, use cases with a cover each, the newest works, templates and
// collections. Pure: the page passes in the content model of its locale, the list's featured
// order and `home` from site.yaml. Works are returned as IDs; the page takes their cards from
// the list's own pages, so a work reads the same everywhere (engineering conventions).

export type HomeInput = {
  locale: string;
  /** Build date, YYYY-MM-DD: decides which works on show have started. */
  today: string;
  /** Visible prompts, newest first (LocaleIndex.prompts). */
  prompts: readonly PromptSummary[];
  promptDetail: (id: string) => PromptDetail | null;
  /** Prompt IDs in the list's "featured" order (FeedIndex.featured, §11.8.2). */
  featuredOrder: readonly string[];
  templates: readonly TemplateSummary[];
  templateDetail: (id: string) => TemplateDetail | null;
  collections: readonly CollectionSummary[];
  /** Whether collection pages exist in this build. */
  collectionsLinked: boolean;
  terms: readonly Term[];
  settings: HomeSettings;
  /** Internal path of the list filtered by a use case, for use cases without a topic page. */
  useCaseList: (useCaseId: string) => string;
};

/** A use case entry (§11.8.1 按用途浏览): a work at its original ratio, the name and the count. */
export type HomeUseCase = {
  id: string;
  label: string;
  labelLocale?: string | null;
  count: number;
  /** Its topic page when published (§9.1), else the list filtered by it. */
  href: string;
  /** The work on its cover. */
  work: string;
  cover: FeedImage;
};

/** A work on show: the showcase and the slug of its page (for the popup's data). */
export type OnShow = Showcase & { slug: string };

export type HomeModel = {
  /** The works on show: the current one first, then the order "Another frame" steps through. */
  onShow: OnShow[];
  /** More works under the first screen (§11.8.1 更多展出). */
  more: string[];
  useCases: HomeUseCase[];
  /** The start of the list, newest first (§11.8.1 最新收录). */
  latest: string[];
  templates: FeedTemplate[];
  collections: CollectionSummary[];
  /** Visible prompts in this locale. */
  total: number;
};

/** Counts per section (§11.8.1): 4–6 more works, 6–8 use cases, a few rows of the list. */
export const HOME_LIMITS = { more: 6, useCases: 8, latest: 12, templates: 3, collections: 2 } as const;

export function composeHome(input: HomeInput): HomeModel {
  const byId = new Map(input.prompts.map((p) => [p.id, p]));
  const activeIds = featuredOrder(input.settings.featured, input.today);
  const active = new Set(activeIds);
  const futureOnlyIds = new Set(input.settings.featured.map((f) => f.prompt).filter((id) => !active.has(id)));
  const details = new Map<string, PromptDetail | null>();
  const available = (id: string): PromptDetail | null => {
    if (details.has(id)) return details.get(id)!;
    const summary = byId.get(id);
    const d = summary?.locale === input.locale && !futureOnlyIds.has(id) ? input.promptDetail(id) : null;
    const usable =
      d &&
      d.id === id &&
      d.locale === input.locale &&
      d.prompt.text.trim() &&
      d.cover?.width > 0 &&
      d.cover.height > 0 &&
      Object.values(d.cover.variants).some(Boolean)
        ? d
        : null;
    details.set(id, usable);
    return usable;
  };
  const sameLanguage = (d: PromptDetail) => d.prompt.language === input.locale;
  const configured = activeIds.flatMap((id) => {
    const d = available(id);
    return d?.annotations.length ? [d] : [];
  });
  let onShow: PromptDetail[];
  if (configured.some(sameLanguage)) {
    onShow = [...configured.filter(sameLanguage), ...configured.filter((d) => !sameLanguage(d))];
  } else {
    const seen = new Set(configured.map((d) => d.id));
    let first: PromptDetail | null = null;
    let matching: PromptDetail | null = null;
    for (const id of input.featuredOrder) {
      if (seen.has(id)) continue;
      seen.add(id);
      const d = available(id);
      if (!d?.annotations.length) continue;
      first ??= d;
      if (sameLanguage(d)) {
        matching = d;
        break;
      }
    }
    onShow = matching ? [matching, ...configured] : configured.length ? configured : first ? [first] : [];
    if (!onShow.length) {
      let fallback: PromptDetail | null = null;
      for (const summary of input.prompts) {
        const d = available(summary.id);
        if (!d) continue;
        fallback ??= d;
        if (sameLanguage(d)) {
          fallback = d;
          break;
        }
      }
      if (fallback) onShow = [fallback];
    }
  }
  const showcases = onShow.map((d): OnShow => ({ ...toShowcase(d), slug: d.slug }));

  // More works: the other works on show, then the featured order; never the current one. Works
  // the latest row already links come last, so the home page links as many works as it can;
  // they still fill the row when there are not enough others.
  const current = showcases[0]?.id;
  const latest = input.prompts.slice(0, HOME_LIMITS.latest).map((p) => p.id);
  const inLatest = new Set(latest);
  const candidates = [...showcases.slice(1).map((s) => s.id), ...input.featuredOrder].filter(
    (id, i, all) => id !== current && byId.has(id) && all.indexOf(id) === i,
  );
  const more = [...candidates.filter((id) => !inLatest.has(id)), ...candidates.filter((id) => inLatest.has(id))].slice(
    0,
    HOME_LIMITS.more,
  );

  // Use cases with the most works first; each cover is a different work where there is one,
  // taken in the featured order so annotated and verified works come first.
  const covers = new Set<string>();
  const useCases = input.terms
    .filter((t) => t.kind === 'useCase' && t.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, HOME_LIMITS.useCases)
    .flatMap((term): HomeUseCase[] => {
      const candidates = input.featuredOrder.filter((id) => byId.get(id)?.useCaseIds.includes(term.id));
      const work = candidates.find((id) => !covers.has(id)) ?? candidates[0];
      if (!work) return [];
      covers.add(work);
      return [
        {
          id: term.id,
          label: term.label,
          labelLocale: term.labelLocale,
          count: term.count,
          href: term.path ?? input.useCaseList(term.id),
          work,
          cover: slimImage(byId.get(work)!.cover),
        },
      ];
    });

  const templates = pickFeedTemplates(input.templates, input.templateDetail, input.locale, HOME_LIMITS.templates);

  const collections = input.collectionsLinked ? input.collections.slice(0, HOME_LIMITS.collections) : [];

  return {
    onShow: showcases,
    more,
    useCases,
    latest,
    templates,
    collections,
    total: input.prompts.length,
  };
}
