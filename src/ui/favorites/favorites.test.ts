import { describe, expect, it } from 'vitest';
import type { FeedCard, FeedPage } from '@/modules/feed/types';
import { singleKeyAction, type KeyLike } from '@/ui/shortcuts/keys';
import { cardsOn, fileDate, pagesFor, shownFavorites } from './resolve';

const card = (id: string) => ({ id }) as FeedCard;
const page = (blocks: FeedPage['blocks']) => ({ blocks }) as FeedPage;

describe('resolving saved works', () => {
  it('finds the pages that hold the saved prompts', () => {
    const index = {
      items: [
        { id: 'p_001', p: 1 },
        { id: 'p_002', p: 3 },
        { id: 'p_003', p: 1 },
      ],
    } as Parameters<typeof pagesFor>[0];
    expect(pagesFor(index, ['p_003', 'p_002', 'p_009'])).toEqual([1, 3]);
  });

  it('reads cards and the feature rows that stand in for one', () => {
    const cards = cardsOn([
      page([
        { t: 'cards', items: [card('p_001'), card('p_002')] },
        { t: 'feature', key: 'f', reason: 'extreme', card: card('p_003'), showcase: {} as never },
        { t: 'feature', key: 'e', reason: 'editorial', card: card('p_009'), showcase: {} as never },
      ]),
    ]);
    expect([...cards.keys()]).toEqual(['p_001', 'p_002', 'p_003']);
  });

  it('keeps a just-removed work in its old place until it is saved again', () => {
    const saved = [
      { id: 'p_003', kind: 'prompt' as const, at: '2026-10-03T00:00:00.000Z' },
      { id: 'p_001', kind: 'prompt' as const, at: '2026-10-01T00:00:00.000Z' },
    ];
    const removed = [{ id: 'p_002', kind: 'prompt' as const, at: '2026-10-02T00:00:00.000Z' }];
    expect(shownFavorites(saved, removed).map((f) => [f.id, f.removed])).toEqual([
      ['p_003', false],
      ['p_002', true],
      ['p_001', false],
    ]);
    // Saved again elsewhere: no longer shown as removed.
    const again = [...saved, { ...removed[0]!, at: '2026-10-05T00:00:00.000Z' }];
    expect(shownFavorites(again, removed).filter((f) => f.removed)).toEqual([]);
  });

  it('names the export by the local day', () => {
    expect(fileDate(new Date(2026, 9, 6, 23, 30))).toBe('2026-10-06');
  });
});

describe('single-key shortcuts', () => {
  const key = (over: Partial<KeyLike>): KeyLike => ({
    key: 'c',
    keyCode: 67,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    isComposing: false,
    repeat: false,
    defaultPrevented: false,
    ...over,
  });

  it('maps C, S and ? (with Shift) to their actions', () => {
    expect(singleKeyAction(key({}))).toBe('copy');
    expect(singleKeyAction(key({ key: 'C' }))).toBe('copy'); // Caps Lock
    expect(singleKeyAction(key({ key: 's', keyCode: 83 }))).toBe('save');
    expect(singleKeyAction(key({ key: '?', shiftKey: true }))).toBe('help');
    expect(singleKeyAction(key({ key: 'x' }))).toBeNull();
  });

  it('never acts during IME composition, with modifiers or on repeat', () => {
    expect(singleKeyAction(key({ isComposing: true }))).toBeNull();
    expect(singleKeyAction(key({ keyCode: 229 }))).toBeNull();
    expect(singleKeyAction(key({ metaKey: true }))).toBeNull(); // ⌘C stays the browser's copy
    expect(singleKeyAction(key({ ctrlKey: true }))).toBeNull();
    expect(singleKeyAction(key({ altKey: true }))).toBeNull();
    expect(singleKeyAction(key({ shiftKey: true }))).toBeNull();
    expect(singleKeyAction(key({ repeat: true }))).toBeNull();
    expect(singleKeyAction(key({ defaultPrevented: true }))).toBeNull();
  });
});
