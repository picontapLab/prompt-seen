import { describe, expect, it } from 'vitest';
import { highlightParts } from './highlight-parts';
import { panelSections } from './panel-sections';
import { clearRecentSearches, recentSearches, rememberSearch, RECENT_KEY, RECENT_LIMIT } from './recent';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  } as unknown as Storage & { data: Map<string, string> };
}

describe('highlighting (§11.8.6)', () => {
  it('preserves Spanish accents and decomposed ñ without highlighting plain n', () => {
    expect(highlightParts('🖼 ¡Fotografi\u0301a del an\u0303o! ano', 'es', ['fotografia', 'año'])).toEqual([
      { text: '🖼 ¡', mark: false },
      { text: 'Fotografi\u0301a', mark: true },
      { text: ' del ', mark: false },
      { text: 'an\u0303o', mark: true },
      { text: '! ano', mark: false },
    ]);
  });
  it('preserves German whole words and UTF-16 ranges after spelling normalization', () => {
    expect(highlightParts('🖼 Straße, Größe und Porträt!', 'de', ['strasse', 'grosse', 'portrat'])).toEqual([
      { text: '🖼 ', mark: false },
      { text: 'Straße', mark: true },
      { text: ', ', mark: false },
      { text: 'Größe', mark: true },
      { text: ' und ', mark: false },
      { text: 'Porträt', mark: true },
      { text: '!', mark: false },
    ]);
  });
  it('marks whole words, case and accents folded', () => {
    expect(highlightParts('Neon café, NEON sign', 'en', ['neon', 'cafe'])).toEqual([
      { text: 'Neon', mark: true },
      { text: ' ', mark: false },
      { text: 'café', mark: true },
      { text: ', ', mark: false },
      { text: 'NEON', mark: true },
      { text: ' sign', mark: false },
    ]);
  });

  it('marks a CJK query run where it occurs, not its pairs elsewhere', () => {
    expect(highlightParts('フラットベクターのポスター', 'ja', ['ポスター', 'ポス', 'ター'])).toEqual([
      { text: 'フラットベクターの', mark: false },
      { text: 'ポスター', mark: true },
    ]);
  });

  it('falls back to the pairs of a run that does not occur as such', () => {
    expect(highlightParts('霓虹剪影肖像', 'zh-Hans', ['霓虹肖像', '霓虹', '肖像'])).toEqual([
      { text: '霓虹', mark: true },
      { text: '剪影', mark: false },
      { text: '肖像', mark: true },
    ]);
  });
});

describe('recent searches (§11.8.6, §11.6.2)', () => {
  it('keeps the newest first per locale, without repeats, up to the limit', () => {
    const s = memoryStorage();
    let t = 0;
    for (const q of ['neon', 'ink', 'NEON', 'poster']) rememberSearch('en', q, s, ++t);
    rememberSearch('zh-Hans', '海报', s, ++t);
    expect(recentSearches('en', s)).toEqual(['poster', 'NEON', 'ink']);
    expect(recentSearches('zh-Hans', s)).toEqual(['海报']);
    for (let i = 0; i < 10; i++) rememberSearch('en', `q${i}`, s, ++t);
    expect(recentSearches('en', s)).toHaveLength(RECENT_LIMIT);
  });

  it('clears one locale only', () => {
    const s = memoryStorage();
    rememberSearch('en', 'neon', s, 1);
    rememberSearch('ja', 'ポスター', s, 2);
    clearRecentSearches('en', s);
    expect(recentSearches('en', s)).toEqual([]);
    expect(recentSearches('ja', s)).toEqual(['ポスター']);
  });

  it('survives corrupt data and storage that throws', () => {
    expect(recentSearches('en', memoryStorage({ [RECENT_KEY]: '{oops' }))).toEqual([]);
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(() => rememberSearch('en', 'neon', broken)).not.toThrow();
    expect(recentSearches('en', broken)).toEqual([]);
  });
});

describe('quick search panel sections (§11.8.6)', () => {
  const hit = (kind: 'prompt' | 'template', id: string) => ({
    id: `${kind}:${id}`,
    kind,
    contentLocale: 'en',
    title: id,
    description: '',
    path: `/en/${kind}s/${id}/`,
    frame: null,
    thumb: null,
    tags: [],
    score: 1,
    matched: [],
  });
  const base = { title: (s: string) => s, popularHref: (id: string) => `/en/prompts/#use=${id}` };
  /** Every key in the ListBox: React Aria keeps sections and items in one collection. */
  const keys = (sections: ReturnType<typeof panelSections>) =>
    sections.flatMap((s) => [s.key, ...s.items.map((i) => i.id)]);

  it('gives sections and items distinct keys, "see all" included', () => {
    // A section and an item with the same key make React Aria's collection point a section at
    // itself; rendering it never ends (a renderer crash while typing in the panel).
    const sections = panelSections({
      ...base,
      query: 'neon',
      results: {
        query: 'neon',
        locale: 'en',
        total: 7,
        groups: [
          { kind: 'prompt', hits: [hit('prompt', 'p_001'), hit('prompt', 'p_002')] },
          { kind: 'template', hits: [hit('template', 't_001')] },
        ],
      },
      recent: [],
      popular: null,
    });
    expect(sections.map((s) => s.title)).toEqual(['prompt', 'template', '']);
    expect(sections.at(-1)!.items).toEqual([expect.objectContaining({ type: 'all', total: 7 })]);
    const all = keys(sections);
    expect(new Set(all).size).toBe(all.length);
  });

  it('shows recent searches and popular uses while the field is empty, with distinct keys', () => {
    const sections = panelSections({
      ...base,
      query: '',
      results: null,
      recent: ['recent', 'popular'],
      popular: [{ id: 'recent', label: 'Recent', count: 3 }],
    });
    expect(sections.map((s) => s.key)).toEqual(['section:recent', 'section:popular']);
    const all = keys(sections);
    expect(new Set(all).size).toBe(all.length);
  });
});
