import { SHAPES, type FeedFacts, type FeedIndex, type Interlude, type Shape } from './types';

// Filters, counts and order for the list (design doc §9.4, §11.7, §11.8.2). Pure, run in the
// browser on the slim metadata index; step 4c's explore page reuses it (§17.4).
//
// Conditions live in the URL fragment, never in a crawlable path (§9.4, §11.6.1):
//   #style=ink&use=poster,wallpaper&shape=portrait&ref=required&sort=featured
// Within one dimension, options combine with OR; across dimensions, with AND.

export type Sort = 'latest' | 'featured';
export type RefOption = 'none' | 'required';
export const REF_OPTIONS: readonly RefOption[] = ['none', 'required'];

export type FeedQuery = {
  /** One style at a time: the text tabs (§11.1.9). */
  style: string | null;
  use: string[];
  shape: Shape[];
  ref: RefOption[];
  sort: Sort;
};

export const EMPTY_QUERY: FeedQuery = { style: null, use: [], shape: [], ref: [], sort: 'latest' };

export const isFiltered = (q: FeedQuery) => !!q.style || q.use.length > 0 || q.shape.length > 0 || q.ref.length > 0;

/** The list differs from the pre-rendered newest-first pages. */
export const isCustomOrder = (q: FeedQuery) => isFiltered(q) || q.sort !== 'latest';

/** Number of active conditions, for the "Filters (2)" button (§11.8.2). */
export const conditionCount = (q: FeedQuery) => (q.style ? 1 : 0) + q.use.length + q.shape.length + q.ref.length;

type Dimension = 'style' | 'use' | 'shape' | 'ref';

function matches(f: FeedFacts, q: FeedQuery, skip?: Dimension): boolean {
  if (skip !== 'style' && q.style && !f.s.includes(q.style)) return false;
  if (skip !== 'use' && q.use.length && !q.use.some((u) => f.u.includes(u))) return false;
  if (skip !== 'shape' && q.shape.length && !q.shape.includes(f.r)) return false;
  if (skip !== 'ref' && q.ref.length && !q.ref.includes(f.ref ? 'required' : 'none')) return false;
  return true;
}

/** Matching prompts in the chosen order. */
export function queryResults(index: FeedIndex, q: FeedQuery): FeedFacts[] {
  const hits = index.items.filter((f) => matches(f, q));
  if (q.sort === 'latest') return hits;
  const rank = new Map(index.featured.map((id, i) => [id, i]));
  return hits.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
}

export type FacetCounts = {
  /** Results per style tab under the other conditions. */
  style: Record<string, number>;
  /** The "All" tab: results under the other conditions, any style. */
  styleAll: number;
  use: Record<string, number>;
  shape: Record<Shape, number>;
  ref: Record<RefOption, number>;
  total: number;
};

/**
 * What each option would show under the other current conditions (§11.7: every option shows
 * its count; one that leads to no results is disabled).
 */
export function facetCounts(index: FeedIndex, q: FeedQuery): FacetCounts {
  const style: Record<string, number> = {};
  const use: Record<string, number> = {};
  const shape = Object.fromEntries(SHAPES.map((s) => [s, 0])) as Record<Shape, number>;
  const ref: Record<RefOption, number> = { none: 0, required: 0 };
  let styleAll = 0;
  let total = 0;
  for (const f of index.items) {
    if (matches(f, q)) total += 1;
    if (matches(f, q, 'style')) {
      styleAll += 1;
      for (const s of f.s) style[s] = (style[s] ?? 0) + 1;
    }
    if (matches(f, q, 'use')) for (const u of f.u) use[u] = (use[u] ?? 0) + 1;
    if (matches(f, q, 'shape')) shape[f.r] += 1;
    if (matches(f, q, 'ref')) ref[f.ref ? 'required' : 'none'] += 1;
  }
  return { style, styleAll, use, shape, ref, total };
}

/**
 * Editorial interludes for a custom order: all of them without filters; with filters only
 * feature rows of matching works, since the others have nothing to do with the conditions
 * (§11.8.2 "只保留与条件相关的段落").
 */
export function editorialFor(index: FeedIndex, q: FeedQuery, results: readonly FeedFacts[]): Interlude[] {
  if (!isFiltered(q)) return index.editorial;
  const hit = new Set(results.map((r) => r.id));
  return index.editorial.filter((e) => e.t === 'feature' && hit.has(e.card.id));
}

// --- URL fragment -------------------------------------------------------------------------------

const list = (value: string | null) => (value ? value.split(',').filter(Boolean) : []);

/** Reads conditions from `location.hash`; unknown keys and values are dropped. */
export function parseQuery(hash: string, index?: Pick<FeedIndex, 'styles' | 'useCases'>): FeedQuery {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const styles = index && new Set(index.styles.map((s) => s.id));
  const uses = index && new Set(index.useCases.map((u) => u.id));
  const style = params.get('style');
  return {
    style: style && (!styles || styles.has(style)) ? style : null,
    use: [...new Set(list(params.get('use')).filter((u) => !uses || uses.has(u)))],
    shape: [...new Set(list(params.get('shape')).filter((s): s is Shape => (SHAPES as string[]).includes(s)))],
    ref: [...new Set(list(params.get('ref')).filter((r): r is RefOption => (REF_OPTIONS as string[]).includes(r)))],
    sort: params.get('sort') === 'featured' ? 'featured' : 'latest',
  };
}

/** `#…` for a query, or "" when it is the default newest-first list. */
export function formatQuery(q: FeedQuery): string {
  const parts: string[] = [];
  if (q.style) parts.push(`style=${encodeURIComponent(q.style)}`);
  if (q.use.length) parts.push(`use=${q.use.map(encodeURIComponent).join(',')}`);
  if (q.shape.length) parts.push(`shape=${q.shape.join(',')}`);
  if (q.ref.length) parts.push(`ref=${q.ref.join(',')}`);
  if (q.sort !== 'latest') parts.push(`sort=${q.sort}`);
  return parts.length ? `#${parts.join('&')}` : '';
}

export const sameQuery = (a: FeedQuery, b: FeedQuery) => formatQuery(a) === formatQuery(b);
