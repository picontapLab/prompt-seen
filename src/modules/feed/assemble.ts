import type { FeedBlock, FeedCard, Interlude } from './types';

// How one batch of the list is laid out (design doc §11.1.4, §11.8.2). Pure, shared by the
// build (newest-first pages) and the browser (filtered and featured batches), so both follow
// the same rules.

/** A prompt in a batch: its card, or, for an extreme ratio, the feature row that replaces it. */
export type ListItem = { card: FeedCard; feature: Extract<Interlude, { t: 'feature' }> | null };

/** Batches shorter than this get no editorial interlude (a short last page reads as an ending). */
export const MIN_ITEMS_FOR_INTERLUDE = 8;

/** Cards left on each side of an interlude, where possible, so no row is a lone stretched card. */
const MIN_RUN = 3;

/**
 * Where the editorial interlude goes: a gap between two cards, never next to a feature row,
 * preferring gaps that leave at least MIN_RUN cards on both sides, then the one nearest the
 * middle of the batch; the middle itself when no gap lies between two cards.
 */
export function interludeGap(items: readonly ListItem[]): number {
  const n = items.length;
  const runBefore = (g: number) => {
    let k = 0;
    while (g - 1 - k >= 0 && !items[g - 1 - k]!.feature) k += 1;
    return k;
  };
  const runAfter = (g: number) => {
    let k = 0;
    while (g + k < n && !items[g + k]!.feature) k += 1;
    return k;
  };
  let best = -1;
  let bestScore = Infinity;
  for (let g = 1; g < n; g += 1) {
    if (items[g - 1]!.feature || items[g]!.feature) continue;
    const short = runBefore(g) < MIN_RUN || runAfter(g) < MIN_RUN;
    const score = (short ? n : 0) + Math.abs(g - n / 2);
    if (score < bestScore) [best, bestScore] = [g, score];
  }
  return best < 0 ? Math.floor(n / 2) : best;
}

/**
 * Whether a batch shows its editorial interlude: long enough, and not a feature row of a work
 * that is already in the batch (a short filtered list would show it twice).
 */
export function showsInterlude(editorial: Interlude | null, ids: readonly string[]): boolean {
  if (!editorial || !takesInterlude(ids.length)) return false;
  return !(editorial.t === 'feature' && ids.includes(editorial.card.id));
}

/**
 * The blocks of one batch: runs of cards for the justified rows, feature rows for works with
 * extreme ratios where they fall, and the editorial interlude (if any) near the middle.
 */
export function assembleBatch(items: readonly ListItem[], editorial: Interlude | null): FeedBlock[] {
  const blocks: FeedBlock[] = [];
  const shown =
    editorial &&
    showsInterlude(
      editorial,
      items.map((i) => i.card.id),
    );
  const gap = shown ? interludeGap(items) : -1;
  items.forEach((item, i) => {
    if (i === gap) blocks.push(editorial!);
    if (item.feature) {
      blocks.push(item.feature);
      return;
    }
    const last = blocks[blocks.length - 1];
    if (last?.t === 'cards') last.items.push(item.card);
    else blocks.push({ t: 'cards', items: [item.card] });
  });
  return blocks;
}

/** Whether a batch of this length takes an editorial interlude. */
export const takesInterlude = (length: number) => length >= MIN_ITEMS_FOR_INTERLUDE;

/** Articles in a list of blocks: each card, feature row and interlude is one (§11.8.2 feed pattern). */
export const articleCount = (blocks: readonly FeedBlock[]) =>
  blocks.reduce((n, b) => n + (b.t === 'cards' ? b.items.length : 1), 0);
