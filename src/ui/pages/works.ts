import 'server-only';
import { feedIndex, feedPage } from '@/modules/feed';
import type { FeedCard } from '@/modules/feed/types';
import { listPageWorks } from '@/modules/seo/sitemaps';

// Cards for works shown outside the list (topic pages, error pages, the language entry). They
// come from the list's own pages, so a work looks and reads the same wherever it appears
// (design doc §11.1.9 展签) and no second card model is built.

const cache = new Map<string, Map<string, FeedCard>>();

/** Every card of a locale's list, by prompt ID. */
export function cardsById(locale: string): Map<string, FeedCard> {
  let cards = cache.get(locale);
  if (!cards) {
    cards = new Map();
    const { pageCount } = feedIndex(locale);
    for (let n = 1; n <= pageCount; n++)
      for (const card of listPageWorks(feedPage(locale, n))) cards.set(card.id, card);
    cache.set(locale, cards);
  }
  return cards;
}

/** Cards for these prompt IDs, in the same order; IDs without a card in this locale are skipped. */
export function cardsFor(locale: string, ids: readonly string[]): FeedCard[] {
  const cards = cardsById(locale);
  return ids.flatMap((id) => cards.get(id) ?? []);
}
