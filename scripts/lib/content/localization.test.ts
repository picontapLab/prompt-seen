import { expect, it } from 'vitest';
import { classifyLocalization, reviewState, selectDescription } from './localization';

it('keeps a missing local description missing when a public source is selected for browsing', () => {
  const localStatus = classifyLocalization({ declaredStatus: null, publishable: false, review: 'unreviewed', dependencies: [] });
  expect(localStatus).toBe('missing');
  expect(selectDescription({ locale: 'de', defaultLocale: 'en', sourceLocale: 'en', registry: ['en', 'de'], preview: false, versions: new Map([['en', { status: 'current', published: true }]]) })).toEqual({ contentLocale: 'en', localStatus: 'missing', presentation: 'fallback' });
});

it('only retains previously approved unchanged target text as outdated; later rejection wins', () => {
  const approved = { key: 'page/about', sourceHash: 'source-v1', targetHash: 'target-v1', completedAt: '2026-01-01T00:00:00Z', conclusion: 'approved' as const };
  const review = (records: Parameters<typeof reviewState>[3], target = 'target-v1') => reviewState('page/about', 'source-v2', target, records, Date.parse('2026-02-01'));
  expect(review([approved])).toBe('outdated');
  expect(review([approved], 'target-v2')).toBe('unreviewed');
  expect(review([{ ...approved, conclusion: 'changes-requested' }, approved])).toBe('unreviewed');
  expect(review([{ ...approved, completedAt: '2027-01-01T00:00:00Z' }])).toBe('unreviewed');
  expect(reviewState('page/about', 'source-v1', null, [approved])).toBe('unreviewed');
});
