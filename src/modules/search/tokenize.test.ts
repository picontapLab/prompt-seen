import { describe, expect, it } from 'vitest';
import { normalizeTerm, queryTerms, spans, tokenize } from './tokenize';

// Tokenisation (design doc §13.2): one implementation for the index and the query.

describe('words in alphabetic scripts', () => {
  it('unifies German spelling variants while retaining whole original UTF-16 spans', () => {
    expect(['Straße', 'Strasse', 'STRASSE'].map((text) => normalizeTerm(text, 'de'))).toEqual([
      'strasse',
      'strasse',
      'strasse',
    ]);
    expect(['Größe', 'Groesse', 'Grosse'].map((text) => normalizeTerm(text, 'de'))).toEqual([
      'grosse',
      'grosse',
      'grosse',
    ]);
    expect(['Porträt', 'Portraet', 'Portrat', 'Portra\u0308t'].map((text) => normalizeTerm(text, 'de'))).toEqual([
      'portrat',
      'portrat',
      'portrat',
      'portrat',
    ]);
    expect(spans('🖼 Straße!', 'de')).toEqual([{ term: 'strasse', start: 3, end: 9 }]);
  });
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

describe('French words and original highlight positions', () => {
  it.each(['éclairage', 'eclairage', 'ÉCLAIRAGE', 'e\u0301clairage', 'l’éclairage', "l'eclairage"])(
    'finds the same core term for %s',
    (text) => {
      expect(queryTerms(text, 'fr')).toEqual(['eclairage']);
      expect(tokenize(text, 'fr')).toEqual(['eclairage']);
    },
  );
  it.each(['œuvre', 'ŒUVRE', 'oeuvre'])('folds the ligature in %s', (text) => {
    expect(queryTerms(text, 'fr')).toEqual(['oeuvre']);
  });
  it('folds both ligatures without changing original UTF-16 ranges', () => {
    const text = '🖼 L’œuvre, cœur, Æ et e\u0301clairage';
    const parts = spans(text, 'fr');
    expect(parts.map((span) => text.slice(span.start, span.end))).toEqual([
      'œuvre',
      'cœur',
      'Æ',
      'et',
      'e\u0301clairage',
    ]);
    expect(parts.map((span) => span.term)).toEqual(['oeuvre', 'coeur', 'ae', 'et', 'eclairage']);
    expect(parts[0]).toEqual({ term: 'oeuvre', start: 5, end: 10 });
  });
  it('removes complete elision prefixes only when touching an apostrophe and a word', () => {
    for (const prefix of ['c', 'd', 'j', 'l', 'm', 'n', 's', 't', 'qu']) {
      expect(queryTerms(`${prefix}’image`, 'fr')).toEqual(['image']);
      expect(queryTerms(`${prefix.toUpperCase()}'image`, 'fr-FR')).toEqual(['image']);
      expect(queryTerms(`${prefix}' image`, 'fr')).toEqual([prefix, 'image']);
    }
    expect(queryTerms('l d qu', 'fr')).toEqual(['l', 'd', 'qu']);
    expect(queryTerms('rock’n’roll aujourd’hui d’une image', 'fr')).toEqual([
      'rock',
      'roll',
      'aujourd',
      'hui',
      'une',
      'image',
    ]);
    expect(queryTerms("l’🖼 qu'", 'fr')).toEqual(['l', 'qu']);
  });
  it('treats hyphens and both French non-breaking spaces as separators', () => {
    expect(queryTerms('arc-en-ciel arrière-plan', 'fr')).toEqual(queryTerms('arc en ciel arriere plan', 'fr'));
    expect(queryTerms('1\u00a0000 1\u202f000', 'fr')).toEqual(['1', '000']);
    expect(spans('1\u202f000', 'fr')).toEqual([
      { term: '1', start: 0, end: 1 },
      { term: '000', start: 2, end: 5 },
    ]);
  });
  it('leaves other languages and model identifiers unchanged', () => {
    expect(queryTerms('l’œuvre cœur æ', 'en')).toEqual(['l', 'œuvre', 'cœur', 'æ']);
    expect(queryTerms('GPT Image p_111', 'fr')).toEqual(['gpt', 'image', 'p', '111']);
  });
});
