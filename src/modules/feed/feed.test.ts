import { describe, expect, it } from 'vitest';
import type { PromptDetail, PromptSummary, TemplateDetail, TemplateSummary } from '@/modules/content/types';
import { articleCount, assembleBatch, interludeGap, type ListItem } from './assemble';
import { composeFeed, currentShowcaseGroups, shapeOf, templateExcerpt, type ComposeInput } from './compose';
import { EMPTY_QUERY, facetCounts, formatQuery, parseQuery, queryResults, editorialFor } from './query';
import type { FeedCard, Interlude } from './types';

// The list's layout rules (design doc §9.4, §11.1.4, §11.8.2): pagination, feature rows for
// extreme ratios, one editorial interlude per page, the featured order, filters and counts.

const image = (width: number, height: number) => ({
  assetId: 'a_001',
  width,
  height,
  ratio: width / height,
  extreme: width / height > 2 || width / height < 0.5,
  placeholder: '#888888',
  alt: 'alt',
  caption: null,
  variants: { card: { key: 'media/a.webp', width, height, mimeType: 'image/webp' } },
  credit: {
    creator: null,
    creditText: null,
    copyrightNotice: null,
    sourceUrl: null,
    license: null,
    licenseUrl: null,
    acquireLicenseUrl: null,
  },
  digitalSourceType: 'x',
});

function prompt(n: number, opts: Partial<PromptSummary> & { w?: number; h?: number } = {}): PromptSummary {
  const id = `p_${String(n).padStart(3, '0')}`;
  return {
    kind: 'prompt',
    id,
    slug: `s-${n}`,
    locale: 'en',
    path: `/en/prompts/s-${n}/`,
    title: `T${n}`,
    description: '',
    visibility: 'published',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
    frameNumber: String(n).padStart(4, '0'),
    cover: image(opts.w ?? 800, opts.h ?? 1000),
    categoryId: 'c',
    styleIds: ['ink'],
    useCaseIds: ['poster'],
    model: { displayName: 'M', providerModelId: null },
    verification: 'unknown',
    lastTestedAt: null,
    promptLanguage: 'en',
    promptOpening: 'Open.',
    annotated: false,
    ...opts,
  };
}

const detailOf = (p: PromptSummary, annotated = false): PromptDetail =>
  ({
    ...p,
    prompt: { text: 'A red seal. Then more.', language: 'en', characters: 22, lines: 1 },
    annotations: annotated
      ? [{ letter: 'A', phrase: 'red seal', start: 2, end: 10, region: { x: 0, y: 0, w: 0.1, h: 0.1 }, note: 'n' }]
      : [],
    test: {
      model: p.model,
      verification: p.verification,
      lastTestedAt: null,
      aspectRatio: '4:5',
      referenceImage: 'none',
    },
  }) as unknown as PromptDetail;

function input(prompts: PromptSummary[], extra: Partial<ComposeInput> = {}): ComposeInput {
  const details = new Map(prompts.map((p) => [p.id, detailOf(p, p.annotated)]));
  return {
    locale: 'en',
    buildId: 'b1',
    today: '2026-10-15',
    prompts,
    promptDetail: (id) => details.get(id) ?? null,
    templates: [],
    templateDetail: () => null,
    collections: [],
    collectionsLinked: false,
    terms: [
      { kind: 'style', id: 'ink', label: 'Ink', count: 3, path: null },
      { kind: 'useCase', id: 'poster', label: 'Poster', count: 3, path: null },
    ],
    settings: { showcase: [], interludes: [] },
    ratioLabel: (w, h) => `${w}:${h}`,
    ...extra,
  };
}

const list = (n: number) => Array.from({ length: n }, (_, i) => prompt(n - i));
const card = (id: string) => ({ id }) as FeedCard;
const items = (pattern: string): ListItem[] =>
  [...pattern].map((c, i) => ({
    card: card(`i${i}`),
    feature: c === 'X' ? ({ t: 'feature', key: `x${i}`, reason: 'extreme', card: card(`i${i}`) } as never) : null,
  }));

describe('assembleBatch', () => {
  const editorial = { t: 'templates', key: 'e', items: [] } as Interlude;

  it('puts the interlude between cards near the middle, keeping runs of at least three', () => {
    expect(interludeGap(items('cccccccccc'))).toBe(5);
    // c c c X c [gap] c c c c c c: a lone card after the feature row would be a stretched row
    expect(interludeGap(items('cccXcccccccc'))).not.toBe(5);
    const g = interludeGap(items('cccXcccccccc'));
    expect(g).toBeGreaterThanOrEqual(7);
  });

  it('turns extreme works into feature rows where they fall', () => {
    const blocks = assembleBatch(items('ccXcc'), null);
    expect(blocks.map((b) => b.t)).toEqual(['cards', 'feature', 'cards']);
    expect(articleCount(blocks)).toBe(5);
  });

  it('gives short batches no interlude', () => {
    expect(assembleBatch(items('ccccc'), editorial).some((b) => b.t === 'templates')).toBe(false);
    expect(assembleBatch(items('cccccccc'), editorial).filter((b) => b.t === 'templates')).toHaveLength(1);
  });
});

describe('composeFeed', () => {
  it('splits newest-first pages of 24 with positions for the feed pattern', () => {
    const feed = composeFeed(input(list(50)));
    expect(
      feed.pages.map((p) => p.blocks.flatMap((b) => (b.t === 'cards' ? b.items.map((c) => c.id) : [])).length),
    ).toEqual([24, 24, 2]);
    expect(feed.pages[1]!.offset).toBe(24);
    expect(feed.pages.every((p) => p.articleTotal === 50)).toBe(true);
    expect(feed.index.items.map((f) => f.p)).toEqual([...Array(24).fill(1), ...Array(24).fill(2), 3, 3]);
  });

  it('rotates editorial interludes one per page and keeps keys unique', () => {
    const prompts = list(60);
    const feed = composeFeed(
      input(prompts, { settings: { showcase: [], interludes: [{ type: 'feature', prompt: prompts[5]!.id }] } }),
    );
    const keys = feed.pages.flatMap((p) => p.blocks.filter((b) => b.t !== 'cards').map((b) => (b as Interlude).key));
    // Pages of 24, 24 and 12; page 1 holds the featured work itself, so it shows no repeat.
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    expect(feed.pages[0]!.blocks.every((b) => b.t === 'cards')).toBe(true);
    expect(feed.pages[0]!.articleTotal).toBe(62);
  });

  it('leaves out interludes that have nothing to show in the locale', () => {
    const feed = composeFeed(
      input(list(30), {
        settings: {
          showcase: [],
          interludes: [
            { type: 'feature', prompt: 'p_999' },
            { type: 'collection', collection: 'c_001' },
            { type: 'templates' },
          ],
        },
      }),
    );
    expect(feed.index.editorial).toEqual([]);
  });

  it('shows the current showcase group and leads the featured order with its picks', () => {
    const prompts = list(10).map((p) => (p.id === 'p_003' ? { ...p, annotated: true } : p));
    const feed = composeFeed(
      input(prompts, {
        settings: {
          showcase: [
            { from: '2026-10-20', lead: 'p_001', works: [] }, // not yet
            { from: '2026-10-01', lead: 'p_003', works: ['p_009', 'p_404'] },
          ],
          interludes: [],
        },
      }),
    );
    expect(feed.band?.lead.id).toBe('p_003');
    expect(feed.band?.works.map((w) => w.id)).toEqual(['p_009']);
    expect(feed.index.featured.slice(0, 3)).toEqual(['p_003', 'p_009', 'p_010']);
  });

  it('skips a showcase lead without annotations', () => {
    const feed = composeFeed(
      input(list(5), { settings: { showcase: [{ lead: 'p_002', works: [] }], interludes: [] } }),
    );
    expect(feed.band).toBeNull();
  });
});

describe('helpers', () => {
  it('buckets shapes', () => {
    expect([shapeOf(4, 5), shapeOf(1, 1), shapeOf(16, 9), shapeOf(21, 9), shapeOf(1, 3)]).toEqual([
      'portrait',
      'square',
      'landscape',
      'panorama',
      'portrait',
    ]);
  });

  it('colours template placeholders by field order', () => {
    expect(templateExcerpt('Poster for {{product}} in {{palette}}', ['palette', 'product'])).toEqual([
      'Poster for ',
      { v: 'product', c: 2 },
      ' in ',
      { v: 'palette', c: 1 },
    ]);
  });

  it('orders showcase groups by start date', () => {
    const groups = [
      { lead: 'p_001', works: [] },
      { from: '2026-10-02', lead: 'p_002', works: [] },
    ];
    expect(currentShowcaseGroups(groups, '2026-10-15').map((g) => g.lead)).toEqual(['p_002', 'p_001']);
  });
});

describe('queries', () => {
  const prompts = [
    prompt(4, { styleIds: ['ink'], useCaseIds: ['poster'], w: 800, h: 1000 }),
    prompt(3, { styleIds: ['neon'], useCaseIds: ['poster', 'avatar'], w: 1000, h: 1000 }),
    prompt(2, { styleIds: ['ink'], useCaseIds: ['avatar'], w: 1600, h: 900, annotated: true }),
    prompt(1, { styleIds: ['neon'], useCaseIds: ['wallpaper'], w: 2100, h: 900 }),
  ];
  const { index } = composeFeed(input(prompts));

  it('filters with OR inside a dimension and AND across dimensions', () => {
    const q = { ...EMPTY_QUERY, style: 'ink', use: ['poster', 'avatar'] };
    expect(queryResults(index, q).map((f) => f.id)).toEqual(['p_004', 'p_002']);
    expect(queryResults(index, { ...EMPTY_QUERY, shape: ['panorama', 'square'] }).map((f) => f.id)).toEqual([
      'p_003',
      'p_001',
    ]);
  });

  it('counts each option under the other conditions', () => {
    const c = facetCounts(index, { ...EMPTY_QUERY, style: 'ink' });
    expect(c.total).toBe(2);
    expect(c.styleAll).toBe(4);
    expect(c.style).toEqual({ ink: 2, neon: 2 });
    expect(c.use).toEqual({ poster: 1, avatar: 1 });
    expect(c.shape).toEqual({ portrait: 1, square: 0, landscape: 1, panorama: 0 });
  });

  it('sorts featured: annotated before the rest, newest first within each', () => {
    expect(queryResults(index, { ...EMPTY_QUERY, sort: 'featured' }).map((f) => f.id)).toEqual([
      'p_002',
      'p_004',
      'p_003',
      'p_001',
    ]);
  });

  it('keeps only matching feature interludes under filters', () => {
    const idx = {
      ...index,
      editorial: [
        { t: 'feature', key: 'a', reason: 'editorial', card: card('p_004') },
        { t: 'templates', key: 'b', items: [] },
      ] as Interlude[],
    };
    const q = { ...EMPTY_QUERY, style: 'ink' };
    expect(editorialFor(idx, q, queryResults(idx, q)).map((e) => e.key)).toEqual(['a']);
    expect(editorialFor(idx, EMPTY_QUERY, []).map((e) => e.key)).toEqual(['a', 'b']);
  });

  it('round-trips the URL fragment and drops unknown values', () => {
    const q = {
      style: 'ink',
      use: ['poster'],
      shape: ['portrait' as const, 'panorama' as const],
      ref: ['required' as const],
      sort: 'featured' as const,
    };
    expect(parseQuery(formatQuery(q), index)).toEqual(q);
    expect(parseQuery('#style=nope&use=poster,zzz&shape=round&ref=x&sort=random', index)).toEqual({
      ...EMPTY_QUERY,
      use: ['poster'],
    });
    expect(formatQuery(EMPTY_QUERY)).toBe('');
  });
});

// Keep the fixture types honest without importing more of the content model.
export type { TemplateDetail, TemplateSummary };
