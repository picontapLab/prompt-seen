import { describe, expect, it } from 'vitest';
import type { ResolvedConfig } from '../../../src/config/schema';
import { Findings } from './findings';
import type { Content } from './read';
import { validateHomeSettings } from './validate-home';

// home.featured in site.yaml (design doc §11.8.1): only existing, annotated prompts go on show,
// with 3–5 phrases whose regions show a place (docs/home-ux-optimization-spec.md C-1).

const small = { x: 0.1, y: 0.1, w: 0.3, h: 0.3 };
const annotation = (phrase: string, region = small) => ({ phrase, region });

const content = {
  prompts: new Map([
    ['p_001', { data: { annotations: [annotation('a red seal'), annotation('soft wash'), annotation('pale paper')] } }],
    ['p_002', { data: { annotations: [] } }],
    ['p_003', { data: { annotations: [annotation('a grid'), annotation('one face')] } }],
    [
      'p_004',
      {
        data: {
          annotations: [
            annotation('the whole sheet', { x: 0.02, y: 0.01, w: 0.96, h: 0.98 }),
            annotation('a seal'),
            annotation('a half', { x: 0, y: 0, w: 1, h: 0.5 }),
          ],
        },
      },
    ],
  ]),
} as unknown as Content;

const check = (featured: ResolvedConfig['home']['featured'], from = content) => {
  const findings = new Findings('/repo');
  validateHomeSettings(from, { home: { featured } } as ResolvedConfig, findings, '2026-11-21');
  return findings.list.map((f) => `${f.level} ${f.field}: ${f.message}`);
};

// Eight well-annotated works: five illustrations, then a poster, a portrait and a product.
const kinds = ['illustration', 'illustration', 'poster', 'illustration', 'illustration', 'portrait', 'illustration', 'product'];
const sorted = {
  prompts: new Map(
    kinds.map((categoryId, i) => [
      `p_10${i + 1}`,
      { data: { categoryId, annotations: [annotation('one'), annotation('two'), annotation('three')] } },
    ]),
  ),
} as unknown as Content;

describe('validateHomeSettings', () => {
  it('accepts prompts with three or more phrases whose regions show a place', () => {
    expect(check([{ prompt: 'p_001', from: '2026-10-01' }])).toEqual([]);
  });

  it('rejects missing and unannotated prompts, and warns about repeats', () => {
    expect(check([{ prompt: 'p_404' }, { prompt: 'p_002' }, { prompt: 'p_001' }, { prompt: 'p_001' }])).toEqual([
      'error home.featured.0.prompt: prompt p_404 does not exist',
      'error home.featured.1.prompt: the featured work p_002 has no annotations',
      'warning home.featured.3.prompt: p_001 is featured more than once; only its first entry counts',
    ]);
  });

  it('warns about works on show with fewer than three phrases', () => {
    expect(check([{ prompt: 'p_003' }])).toEqual([
      'warning home.featured.0.prompt: the featured work p_003 has 2 annotation(s); the first screen shows 3–5',
    ]);
  });

  it('warns about regions over half the picture, naming each phrase; half exactly passes', () => {
    expect(check([{ prompt: 'p_004' }])).toEqual([
      'warning home.featured.0.prompt: the featured work p_004 frames most of its picture: "the whole sheet" covers 94%',
    ]);
  });

  it('warns when one category fills more than three of the first seven works on show', () => {
    // docs/home-ux-optimization-spec.md C-2: p_101…p_107 hold five illustrations.
    const featured = kinds.map((_, i) => ({ prompt: `p_10${i + 1}` }));
    expect(check(featured, sorted)).toEqual([
      'warning home.featured: 5 of the first 7 works on show are in the category "illustration" (p_101, p_102, p_104, p_105, p_107)',
    ]);
  });

  it('counts the works in the order they are shown today, leaving out scheduled ones', () => {
    // Dated entries come first, newest first; p_104 and p_105 wait for December.
    const featured = [
      { prompt: 'p_101' },
      { prompt: 'p_102' },
      { prompt: 'p_104', from: '2026-12-01' },
      { prompt: 'p_105', from: '2026-12-01' },
      { prompt: 'p_103', from: '2026-11-20' },
      { prompt: 'p_106', from: '2026-11-19' },
      { prompt: 'p_107' },
      { prompt: 'p_108' },
    ];
    expect(check(featured, sorted)).toEqual([]);
  });

  it('checks a work once, at its first entry', () => {
    expect(check([{ prompt: 'p_003' }, { prompt: 'p_003' }])).toEqual([
      'warning home.featured.0.prompt: the featured work p_003 has 2 annotation(s); the first screen shows 3–5',
      'warning home.featured.1.prompt: p_003 is featured more than once; only its first entry counts',
    ]);
  });
});
