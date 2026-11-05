import type { ImageRef, PromptSummary } from '@/modules/content/types';
import type { Showcase } from '@/ui/showcase/model';

// The continuous list's data (design doc §3.5, §9.4, §11.8.2): what the `feed` emitter writes to
// public/generated/{locale}/feed/ and what the list pages and the browser read. Plain,
// serializable data; a page's HTML and its JSON come from the same object, so they agree.

/** Prompts per page and per batch of the continuous list (§9.4). */
export const FEED_PAGE_SIZE = 24;

/** The image fields a card needs; full credits stay in the detail model. */
export type FeedImage = Pick<
  ImageRef,
  'width' | 'height' | 'placeholder' | 'alt' | 'variants' | 'mimeType' | 'animation'
>;

/** One work in the justified rows (§11.1.4, §11.8.2). */
export type FeedCard = {
  hasGifOutput?: boolean;
  id: string;
  slug: string;
  path: string;
  title: string;
  frameNumber: string;
  cover: FeedImage;
  /** "4:5", "16:9" (§9.2). */
  ratio: string;
  /** Display name or provider ID of the model it was verified with; null when unknown. */
  model: string | null;
  verification: PromptSummary['verification'];
  lastTestedAt: string | null;
  promptLanguage: string;
  /** First sentence of the prompt; replaces the facts line while the card is pointed at. */
  promptOpening: string;
};

/** A template excerpt: plain text, and placeholders with their variable colour 1–6 (§11.1.1). */
export type ExcerptPart = string | { v: string; c: number };

export type FeedTemplate = {
  id: string;
  path: string;
  title: string;
  fieldCount: number;
  promptLanguage: string;
  excerpt: ExcerptPart[];
};

export type FeedCollection = {
  id: string;
  path: string;
  title: string;
  description: string;
  cover: FeedImage;
  itemCount: number;
};

/**
 * A full-width block between justified rows (§11.8.2): a feature row, a template strip or a
 * collection banner. `key` is unique within a list. Feature rows of works with extreme ratios
 * stand in for their card (`reason: 'extreme'`); editorial ones repeat a work shown elsewhere.
 */
export type Interlude =
  | { t: 'feature'; key: string; reason: 'extreme' | 'editorial'; card: FeedCard; showcase: Showcase }
  | { t: 'templates'; key: string; items: FeedTemplate[] }
  | { t: 'collection'; key: string; item: FeedCollection };

export type FeedBlock = { t: 'cards'; items: FeedCard[] } | Interlude;

/** One page of the list in newest-first order: `/{locale}/prompts/page/{n}/` and its JSON. */
export type FeedPage = {
  buildId: string;
  locale: string;
  page: number;
  pageCount: number;
  /** Prompts in the whole list. */
  total: number;
  /** Index of this page's first prompt in the list (0-based). */
  offset: number;
  /** Articles before this page (cards and interludes), for aria-posinset (§11.8.2). */
  articleOffset: number;
  /** Articles in the whole list, for aria-setsize. */
  articleTotal: number;
  blocks: FeedBlock[];
};

/** Image shape, the "ratio" filter (§11.8.2). Panoramas are wider than 2:1; tall works count as portrait. */
export type Shape = 'portrait' | 'square' | 'landscape' | 'panorama';
export const SHAPES: readonly Shape[] = ['portrait', 'square', 'landscape', 'panorama'];

/** Filter facts of one prompt; `p` is the page that holds its card. */
export type FeedFacts = {
  id: string;
  p: number;
  /** Style and use-case term IDs. */
  s: string[];
  u: string[];
  r: Shape;
  /** Needs a reference image (§5.2 inputRequirements.referenceImage: required). */
  ref: boolean;
  /** Shown as a feature row instead of a card (§11.1.4). */
  x: boolean;
};

/**
 * The slim metadata index (§3.2 "精简元数据索引"): the filter facts of every prompt in newest-first
 * order, the featured order, the terms with labels, and the editorial interludes. The list's
 * filter bar uses it for results and counts; step 4c's explore page reuses it (§17.4).
 */
export type FeedIndex = {
  buildId: string;
  locale: string;
  pageSize: number;
  pageCount: number;
  items: FeedFacts[];
  /** Prompt IDs in "featured" order (§11.8.2): showcase picks, annotated, verified, the rest. */
  featured: string[];
  styles: { id: string; label: string }[];
  useCases: { id: string; label: string }[];
  /** Editorial interludes in rotation order, resolved for this locale. */
  editorial: Interlude[];
};

/** The list's first-screen showcase band (§11.8.2): one annotated work and up to two more. */
export type FeedBand = { lead: Showcase; leadSlug: string; works: FeedCard[] };
