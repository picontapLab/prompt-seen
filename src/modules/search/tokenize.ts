import { hangulUnits, normalizeKoreanQuery } from './korean';

// Tokenisation for search (design doc §13.2). One implementation, imported by the index emitter
// at build time and by the Worker in the browser, so documents and queries are split the same
// way everywhere.
//
// - Words in alphabetic scripts (Latin, Cyrillic, Greek, Arabic, Hebrew…) are runs of letters,
//   digits and combining marks; "gpt-image-2" is three words. Case folds with the locale's rules
//   (Turkish İ/ı), Latin, Greek and Cyrillic accents fold away ("café" finds "cafe"), and Arabic
//   drops diacritics and tatweel and unifies alef and yeh forms.
// - Han and kana runs, and Korean syllable runs, are split into overlapping character
//   pairs (bigrams); documents also index single characters, so a one-character query matches.
//   Queries use pairs that do not overlap (the last one overlaps when the run is odd): "霓虹肖像"
//   becomes 霓虹 + 肖像, so two words typed together still match a document where they are apart.
//   Pairs behave the same in Node and every browser, which `Intl.Segmenter` does not: its
//   dictionaries differ by ICU version, and a word split one way at build time and another in
//   Safari would never match (§13.2).
// - Positions refer to the original text, so results can be highlighted (`spans`).

export type Span = { term: string; start: number; end: number };

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}ー々]/u;
const WORD = /[\p{L}\p{N}]/u;
// Half-width dakuten/handakuten are modifier letters, but belong to the preceding kana.
// Keep their original offsets and normalize the combined character, just like decomposed marks.
const MARK = /[\p{M}‌‍︀-️ﾞﾟ]/u;
/** Accents of these scripts fold away; others (kana voicing marks, Indic vowel signs) carry meaning. */
const FOLD_SCRIPT = /[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}]/u;

const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** The search form of one word or character run: compatibility forms, case and accents folded. */
export function normalizeTerm(text: string, locale: string): string {
  const language = locale.split('-')[0]!.toLowerCase();
  let s = text.normalize('NFKC').toLocaleLowerCase(locale);
  if (language === 'de') s = s.replace(/ß/g, 'ss').replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
  if (FOLD_SCRIPT.test(s)) {
    s = s
      .normalize('NFD')
      .replace(
        /(\p{Script=Latin}|\p{Script=Greek}|\p{Script=Cyrillic})(\p{M}+)/gu,
        (_match, base: string, marks: string) =>
          // In Spanish ñ is a letter, not an accent variant of n (§9.1 Spanish spec).
          language === 'es' && base === 'n' && marks.includes('\u0303') ? 'ñ' : base,
      )
      .normalize('NFC');
  }
  if (/[؀-ۿ]/.test(s)) {
    s = s
      .replace(ARABIC_DIACRITICS, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي');
  }
  return s.replace(/[‌‍]/g, '');
}

type Kind = 'cjk' | 'word' | 'none';

function kindOf(char: string): Kind {
  // NFKC first, so full-width Latin ("ＡＢＣ") counts as a word and half-width kana as kana.
  const c = char.normalize('NFKC');
  if (CJK.test(c)) return 'cjk';
  if (WORD.test(c)) return 'word';
  return 'none';
}

type Run = { kind: Exclude<Kind, 'none'>; start: number; chars: { text: string; start: number }[] };

/** Runs of word or CJK characters, with combining marks kept on the character before them. */
function runs(text: string, locale: string): Run[] {
  const out: Run[] = [];
  let run: Run | null = null;
  let index = 0;
  const characters =
    locale.split('-')[0] === 'ko' ? hangulUnits(text).map((unit) => text.slice(unit.start, unit.end)) : text;
  for (const char of characters) {
    const start = index;
    index += char.length;
    if (MARK.test(char)) {
      // A mark never starts or splits anything: it belongs to the previous character.
      const last = run?.chars.at(-1);
      if (last) last.text += char;
      continue;
    }
    const kind = kindOf(char);
    if (kind === 'none') {
      run = null;
      continue;
    }
    if (!run || run.kind !== kind) {
      run = { kind, start, chars: [] };
      out.push(run);
    }
    run.chars.push({ text: char, start });
  }
  return out;
}

const endOf = (c: { text: string; start: number }) => c.start + c.text.length;

/**
 * Terms of a text with their positions. `mode: 'index'` (documents): every overlapping pair and
 * every single CJK character. `mode: 'query'`: non-overlapping pairs, or the character itself
 * when a run has one.
 */
export function spans(text: string, locale: string, mode: 'index' | 'query' = 'index'): Span[] {
  const out: Span[] = [];
  for (const run of runs(text, locale)) {
    if (run.kind === 'word') {
      const first = run.chars[0]!;
      const last = run.chars.at(-1)!;
      const raw = text.slice(first.start, endOf(last));
      const term = normalizeTerm(raw, locale);
      if (term) out.push({ term, start: first.start, end: endOf(last) });
      continue;
    }
    const chars = run.chars.map((c) => ({ ...c, term: normalizeTerm(c.text, locale) }));
    const pair = (i: number) =>
      out.push({ term: chars[i]!.term + chars[i + 1]!.term, start: chars[i]!.start, end: endOf(chars[i + 1]!) });
    if (chars.length === 1 || mode === 'index')
      for (const c of chars) out.push({ term: c.term, start: c.start, end: endOf(c) });
    if (mode === 'index') for (let i = 0; i + 1 < chars.length; i++) pair(i);
    else if (chars.length > 1) {
      for (let i = 0; i + 1 < chars.length; i += 2) pair(i);
      if (chars.length % 2 === 1) pair(chars.length - 2);
    }
  }
  return out;
}

/** Terms of a document field. */
export const tokenize = (text: string, locale: string): string[] => spans(text, locale, 'index').map((s) => s.term);

/** Terms of a query, in order, without repeats. */
export const queryTerms = (text: string, locale: string): string[] => [
  ...new Set(
    spans(locale.split('-')[0] === 'ko' ? normalizeKoreanQuery(text) : text, locale, 'query').map((s) => s.term),
  ),
];

/** The CJK runs of a query in search form, e.g. "ポスター" for "neon ポスター" (for highlighting). */
export const cjkRuns = (text: string, locale: string): string[] =>
  runs(text, locale)
    .filter((r) => r.kind === 'cjk')
    .map((r) => r.chars.map((c) => normalizeTerm(c.text, locale)).join(''));

/** Whether a term is a CJK character or pair (no fuzzy matching for those). */
export const isCjkTerm = (term: string) => CJK.test(term);
