import { describe, expect, it } from 'vitest';
import { highlightParts } from './highlight-parts';
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
