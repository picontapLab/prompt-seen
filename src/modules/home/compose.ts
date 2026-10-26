import type {
  CollectionSummary,
  PromptDetail,
  PromptSummary,
  TemplateDetail,
  TemplateSummary,
  Term,
} from '@/modules/content/types';
import { slimImage, templateExcerpt } from '@/modules/feed/compose';
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
  const annotated = (id: string) => {
    const detail = byId.has(id) ? input.promptDetail(id) : null;
    return detail && detail.annotations.length > 0 ? detail : null;
  };

  // Only annotated works go on show (§5.2, §11.8.1). Without a configured one in this locale,
  // the first annotated work of the featured order stands in; without any, the newest work.
  let onShow = featuredOrder(input.settings.featured, input.today)
    .map(annotated)
    .filter((d) => !!d);
  if (onShow.length === 0) {
    const stand = input.featuredOrder.map(annotated).find((d) => !!d) ?? input.promptDetail(input.prompts[0]?.id ?? '');
    onShow = stand ? [stand] : [];
  }
  const showcases = onShow.map((d): OnShow => ({ ...toShowcase(d), slug: d.slug }));

  // More works: the other works on show, then the featured order; never the current one.
  const current = showcases[0]?.id;
  const more = [...showcases.slice(1).map((s) => s.id), ...input.featuredOrder]
    .filter((id, i, all) => id !== current && byId.has(id) && all.indexOf(id) === i)
    .slice(0, HOME_LIMITS.more);

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
          count: term.count,
          href: term.path ?? input.useCaseList(term.id),
          work,
          cover: slimImage(byId.get(work)!.cover),
        },
      ];
    });

  const templates = input.templates
    .slice(0, HOME_LIMITS.templates)
    .map((t): FeedTemplate | null => {
      const detail = input.templateDetail(t.id);
      if (!detail) return null;
      return {
        id: t.id,
        path: t.path,
        title: t.title,
        fieldCount: t.fieldCount,
        promptLanguage: t.promptLanguage,
        excerpt: templateExcerpt(
          t.bodyExcerpt,
          detail.version.fields.map((f) => f.name),
        ),
      };
    })
    .filter((t) => !!t);

  const collections = input.collectionsLinked ? input.collections.slice(0, HOME_LIMITS.collections) : [];

  return {
    onShow: showcases,
    more,
    useCases,
    latest: input.prompts.slice(0, HOME_LIMITS.latest).map((p) => p.id),
    templates,
    collections,
    total: input.prompts.length,
  };
}
