import { describe, expect, it } from 'vitest';
import { normalizeTerm, queryTerms, spans, tokenize } from './tokenize';

// Tokenisation (design doc §13.2): one implementation for the index and the query.

describe('words in alphabetic scripts', () => {
  it('folds case and accents, and splits on punctuation', () => {
    expect(tokenize('Café NOIR, gpt-image-2', 'en')).toEqual(['cafe', 'noir', 'gpt', 'image', '2']);
    expect(tokenize('Kühlschrank-Poster', 'de')).toEqual(['kuhlschrank', 'poster']);
    expect(tokenize('Ёлка и ЕЛЬ', 'ru')).toEqual(['елка', 'и', 'ель']);
  });

  it('uses the locale’s case rules', () => {
    expect(normalizeTerm('İSTANBUL', 'tr')).toBe('istanbul');
    expect(normalizeTerm('ISPARTA', 'tr')).toBe('ısparta');
  });

  it('folds full-width forms and keeps combining marks with their letter', () => {
    expect(tokenize('ＡＢＣ　１２３', 'ja')).toEqual(['abc', '123']);
    expect(tokenize('café au lait', 'fr')).toEqual(['cafe', 'au', 'lait']);
  });

  it('normalises Arabic letter forms and drops diacritics and tatweel', () => {
    expect(tokenize('أُمّ مـــلصق إلى', 'ar')).toEqual(['ام', 'ملصق', 'الي']);
  });
});

describe('Han, kana and Hangul', () => {
  it('indexes every character and every overlapping pair', () => {
    expect(tokenize('水墨画', 'zh-Hans')).toEqual(['水', '墨', '画', '水墨', '墨画']);
  });

  it('queries with pairs that do not overlap, so words typed together still match', () => {
    expect(queryTerms('霓虹肖像', 'zh-Hans')).toEqual(['霓虹', '肖像']);
    expect(queryTerms('水墨画', 'zh-Hans')).toEqual(['水墨', '墨画']);
    expect(queryTerms('墨', 'zh-Hans')).toEqual(['墨']);
    expect(queryTerms('ポスター', 'ja')).toEqual(['ポス', 'ター']);
  });

  it('keeps kana voicing marks, which change the word', () => {
    expect(tokenize('が', 'ja')).toEqual(['が']);
    expect(normalizeTerm('ガ', 'ja')).toBe('ガ');
    expect(normalizeTerm('ｶﾞ', 'ja')).toBe('ガ');
  });

  it('separates mixed scripts and numbers', () => {
    expect(queryTerms('4K壁纸 neon海报', 'zh-Hans')).toEqual(['4k', '壁纸', 'neon', '海报']);
  });
});

describe('positions', () => {
  it('refer to the original text', () => {
    const text = 'Neon 海报!';
    for (const s of spans(text, 'en')) expect(normalizeTerm(text.slice(s.start, s.end), 'en')).toBe(s.term);
    expect(spans('ｎｅｏｎ', 'ja')).toEqual([{ term: 'neon', start: 0, end: 4 }]);
  });

  it('never split surrogate pairs or a letter from its marks', () => {
    const text = '𠮷野家 é';
    const s = spans(text, 'ja');
    expect(s.map((x) => text.slice(x.start, x.end))).toContain('𠮷野');
    expect(spans('éx', 'fr')).toEqual([{ term: 'ex', start: 0, end: 3 }]);
  });
});
