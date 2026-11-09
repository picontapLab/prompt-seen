import { describe, expect, it } from 'vitest';
import type {
  CollectionSummary,
  PromptDetail,
  PromptSummary,
  TemplateDetail,
  TemplateSummary,
  Term,
} from '@/modules/content/types';
import { composeHome, featuredOrder, HOME_LIMITS, type HomeInput } from './compose';

// The home page's choices (design doc §11.8.1): which work is on show and in what order
// "Another frame" steps, more works without repeats, use cases with distinct covers.

const image = (width = 800, height = 1000) =>
  ({
    assetId: 'a_001',
    width,
    height,
    ratio: width / height,
    extreme: false,
    placeholder: '#888888',
    alt: 'alt',
    caption: null,
    variants: { card: { key: 'media/a.webp', width, height, mimeType: 'image/webp' } },
  }) as unknown as PromptSummary['cover'];

function prompt(n: number, opts: Partial<PromptSummary> = {}): PromptSummary {
  const id = `p_${String(n).padStart(3, '0')}`;
  return {
    kind: 'prompt',
    id,
    slug: `s-${n}`,
    path: `/en/prompts/s-${n}/`,
    title: `T${n}`,
    locale: 'en',
    description: 'A red seal.',
    promptLanguage: 'en',
    frameNumber: String(n).padStart(4, '0'),
    cover: image(),
    useCaseIds: ['poster'],
    model: { displayName: 'M', providerModelId: null },
    verification: 'unknown',
    lastTestedAt: null,
    annotated: false,
    ...opts,
  } as PromptSummary;
}

const detailOf = (p: PromptSummary): PromptDetail =>
  ({
    ...p,
    prompt: { text: 'A red seal. Then more.', language: p.promptLanguage, characters: 22, lines: 1 },
    annotations: p.annotated
      ? [{ letter: 'A', phrase: 'red seal', start: 2, end: 10, region: { x: 0, y: 0, w: 0.1, h: 0.1 }, note: 'n' }]
      : [],
    test: { model: p.model, verification: p.verification, lastTestedAt: null },
  }) as unknown as PromptDetail;

const term = (id: string, count: number, path: string | null = null): Term => ({
  kind: 'useCase',
  id,
  label: id,
  aliases: [],
  count,
  path,
});

function input(prompts: PromptSummary[], extra: Partial<HomeInput> = {}): HomeInput {
  const details = new Map(prompts.map((p) => [p.id, detailOf(p)]));
  return {
    locale: 'en',
    today: '2026-10-25',
    prompts,
    promptDetail: (id) => details.get(id) ?? null,
    featuredOrder: prompts.map((p) => p.id),
    templates: [],
    templateDetail: () => null,
    collections: [],
    collectionsLinked: true,
    terms: [term('poster', prompts.length)],
    settings: { featured: [] },
    useCaseList: (id) => `/en/prompts/#use=${id}`,
    ...extra,
  };
}

// Newest first: p_010 … p_001; odd ones are annotated.
const prompts = Array.from({ length: 10 }, (_, i) => prompt(10 - i, { annotated: (10 - i) % 2 === 1 }));

describe('featuredOrder', () => {
  it('shows started entries, latest date first, then undated ones, each once', () => {
    const featured = [
      { prompt: 'p_001' },
      { prompt: 'p_003', from: '2026-10-01' },
      { prompt: 'p_005', from: '2026-10-30' }, // scheduled
      { prompt: 'p_007', from: '2026-10-19' },
      { prompt: 'p_009' },
      { prompt: 'p_003', from: '2026-10-20' },
    ];
    expect(featuredOrder(featured, '2026-10-25')).toEqual(['p_003', 'p_007', 'p_001', 'p_009']);
    expect(featuredOrder(featured, '2026-10-30')[0]).toBe('p_005');
  });
});

describe('composeHome', () => {
  it('puts annotated, visible works on show in order and skips the rest', () => {
    const featured = [
      { prompt: 'p_007', from: '2026-10-20' },
      { prompt: 'p_004' },
      { prompt: 'p_404' },
      { prompt: 'p_003' },
    ];
    const home = composeHome(input(prompts, { settings: { featured } }));
    expect(home.onShow.map((s) => s.id)).toEqual(['p_007', 'p_003']);
    expect(home.onShow[0]!.annotations).toHaveLength(1);
  });

  it('falls back to the first annotated work of the featured order, then to the newest work', () => {
    const home = composeHome(input(prompts, { featuredOrder: ['p_010', 'p_005', 'p_003'] }));
    expect(home.onShow.map((s) => s.id)).toEqual(['p_005']);
    const plain = prompts.map((p) => ({ ...p, annotated: false }));
    expect(composeHome(input(plain)).onShow.map((s) => s.id)).toEqual(['p_010']);
    expect(composeHome(input([])).onShow).toEqual([]);
  });

  it('fills the more row with the other works on show, then the featured order, never the current one', () => {
    const featured = [{ prompt: 'p_009', from: '2026-10-20' }, { prompt: 'p_001' }];
    const home = composeHome(
      input(prompts, { settings: { featured }, featuredOrder: ['p_009', 'p_010', 'p_001', 'p_008'] }),
    );
    expect(home.more).toEqual(['p_001', 'p_010', 'p_008']);
    expect(composeHome(input(prompts)).more).toHaveLength(HOME_LIMITS.more);
  });

  it('gives each use case a different cover where it can, and links the topic page or the filtered list', () => {
    const tagged = [
      prompt(3, { useCaseIds: ['poster', 'product'] }),
      prompt(2, { useCaseIds: ['product'] }),
      prompt(1, { useCaseIds: ['poster'] }),
    ];
    const home = composeHome(
      input(tagged, {
        terms: [term('product', 2, '/en/use-cases/product/'), term('poster', 2), term('empty', 0)],
        featuredOrder: ['p_003', 'p_002', 'p_001'],
      }),
    );
    // Equal counts sort by label: poster first, takes p_003; product then takes p_002.
    expect(home.useCases.map((u) => [u.id, u.work, u.href])).toEqual([
      ['poster', 'p_003', '/en/prompts/#use=poster'],
      ['product', 'p_002', '/en/use-cases/product/'],
    ]);
  });

  it('lists the newest works, templates with coloured variables, and collections only when their pages exist', () => {
    const templates = [
      {
        id: 't_001',
        locale: 'en',
        description: 'A poster.',
        path: '/en/templates/x/',
        title: 'X',
        fieldCount: 1,
        promptLanguage: 'en',
        bodyExcerpt: 'Poster for {{product}}.',
      },
    ];
    const templateDetail = () =>
      ({ id: 't_001', locale: 'en', version: { fields: [{ name: 'product' }] } }) as unknown as TemplateDetail;
    const collections = [
      { id: 'c_001', path: '/en/collections/ink/', title: 'Ink', description: 'd', cover: image(), itemCount: 3 },
    ];
    const home = composeHome(
      input(prompts, {
        templates: templates as unknown as TemplateSummary[],
        templateDetail,
        collections: collections as unknown as CollectionSummary[],
      }),
    );
    expect(home.latest.slice(0, 2)).toEqual(['p_010', 'p_009']);
    expect(home.total).toBe(10);
    expect(home.templates[0]!.excerpt).toEqual(['Poster for ', { v: 'product', c: 1 }, '.']);
    expect(home.collections.map((c) => c.id)).toEqual(['c_001']);
    expect(
      composeHome(input(prompts, { collections: collections as never, collectionsLinked: false })).collections,
    ).toEqual([]);
  });
});

// Spec §5.4: literal expectations deliberately independent of the production selector.
describe('locale-aware works on show', () => {
  it.each([
    ['S01', ['fr', 'en', 'fr', 'en'], [1, 2, 3, 4], [1, 2, 3, 4], [], true, [2, 4, 1, 3]],
    ['S02', ['fr', 'fr', 'en'], [1, 2], [1, 2, 3], [], true, [3, 1, 2]],
    ['S03', ['fr', 'fr'], [1, 2], [1, 2], [], true, [1, 2]],
    ['S04', ['fr', 'en', 'en'], [], [1, 2, 3], [], true, [2]],
    ['S05', ['fr', 'fr'], [], [1, 2], [], true, [1]],
    ['S06', ['fr', 'en'], [], [2, 1], [2], true, [1]],
    ['S07', ['fr', 'en'], [], [1, 2], [], false, [2]],
    ['S08', [], [], [], [], false, []],
  ])(
    '%s follows stable language priority and scheduled exclusions',
    (_case, languages, configured, feed, future, annotated, expected) => {
      const ps = (languages as string[]).map((promptLanguage, i) =>
        prompt(i + 1, { promptLanguage, annotated: annotated as boolean }),
      );
      const id = (n: number) => `p_${String(n).padStart(3, '0')}`;
      const model = composeHome(
        input(ps, {
          featuredOrder: (feed as number[]).map(id),
          settings: {
            featured: [
              ...(configured as number[]).map((n) => ({ prompt: id(n) })),
              ...(future as number[]).map((n) => ({ prompt: id(n), from: '2099-01-01' })),
            ],
          },
        }),
      );
      expect(model.onShow.map((s) => s.id)).toEqual((expected as number[]).map(id));
    },
  );

  it('rejects invisible, mismatched and empty details, and never substitutes another locale', () => {
    const ps = [prompt(1, { annotated: true }), prompt(2, { annotated: true }), prompt(3)];
    const model = composeHome(
      input(ps, {
        promptDetail: (id) => {
          if (id === 'p_001') return { ...detailOf(ps[0]!), locale: 'fr' };
          if (id === 'p_002')
            return { ...detailOf(ps[1]!), prompt: { text: ' ', language: 'en', characters: 1, lines: 1 } };
          return null;
        },
      }),
    );
    expect(model.onShow).toEqual([]);
  });

  it('uses exact future registry codes without combining regional variants', () => {
    const ps = [
      prompt(1, { locale: 'pt-BR', promptLanguage: 'pt-PT', annotated: true }),
      prompt(2, { locale: 'pt-BR', promptLanguage: 'pt-BR', annotated: true }),
    ];
    expect(composeHome(input(ps, { locale: 'pt-BR' })).onShow.map((s) => s.id)).toEqual(['p_002']);
  });
});
