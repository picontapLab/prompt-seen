import type { FeedCard, FeedImage, FeedIndex, FeedPage } from '@/modules/feed/types';
import type { Favorite } from '@/state/favorites/store';

// Turning saved IDs back into works (design doc §11.5: "收藏展示使用当前内容索引补全标题和图片").
// Prompts come from the list's own files: the slim index says which page holds each one, and the
// page holds its card, so a saved work reads as it does in the list. Templates are few and come
// with the page. Pure: no fetching, so tests run it on plain data.

/** A saved template as the favourites page shows it. */
export type TemplateItem = {
  id: string;
  path: string;
  title: string;
  fieldCount: number;
  cover: FeedImage | null;
  hasGifOutput?: boolean;
};

/** Pages of the newest-first list that hold these prompts; IDs the index lacks are not here. */
export function pagesFor(index: Pick<FeedIndex, 'items'>, ids: Iterable<string>): number[] {
  const page = new Map(index.items.map((f) => [f.id, f.p]));
  const out = new Set<number>();
  for (const id of ids) {
    const p = page.get(id);
    if (p) out.add(p);
  }
  return [...out].sort((a, b) => a - b);
}

/** Every work's card on these pages, by ID: cards and the feature rows that stand in for one. */
export function cardsOn(pages: readonly FeedPage[]): Map<string, FeedCard> {
  const out = new Map<string, FeedCard>();
  for (const page of pages)
    for (const block of page.blocks) {
      if (block.t === 'cards') for (const card of block.items) out.set(card.id, card);
      else if (block.t === 'feature' && block.reason === 'extreme') out.set(block.card.id, block.card);
    }
  return out;
}

export type ShownFavorite = Favorite & {
  /** Removed on this page a moment ago: shown faded with an undo until the window closes. */
  removed: boolean;
};

/**
 * What the page lists, newest saved first: the saved works plus those just removed here, in
 * their old place (§11.5: "收藏页中被取消的卡片保留原位并变为半透明"). A work saved again (in another
 * tab, say) is simply saved.
 */
export function shownFavorites(saved: readonly Favorite[], removed: readonly Favorite[]): ShownFavorite[] {
  const ids = new Set(saved.map((f) => f.id));
  return [
    ...saved.map((f) => ({ ...f, removed: false })),
    ...removed.filter((f) => !ids.has(f.id)).map((f) => ({ ...f, removed: true })),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** "prompt-seen-saved-2026-10-26.json" date part, in the visitor's own calendar day. */
export function fileDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
