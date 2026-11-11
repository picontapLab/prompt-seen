import { expect, it } from 'vitest';
import { isAggregateIndexable } from './indexing';

it('keeps browse ordering intact while excluding an aggregate that displays fallback content', () => {
  const items = [
    {
      localization: {
        contentLocale: 'de',
        localStatus: 'current' as const,
        presentation: 'local' as const,
        indexable: true,
      },
    },
    {
      localization: {
        contentLocale: 'en',
        localStatus: 'missing' as const,
        presentation: 'fallback' as const,
        indexable: false,
      },
    },
  ];
  expect(isAggregateIndexable({ enabled: true }, items)).toBe(false);
  expect(isAggregateIndexable({ enabled: true }, items.slice(0, 1))).toBe(true);
  expect(isAggregateIndexable({ enabled: true }, [])).toBe(false);
  expect(isAggregateIndexable({ enabled: false }, items.slice(0, 1))).toBe(false);
});
