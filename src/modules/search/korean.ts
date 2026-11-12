// Compose modern Hangul before tokenisation while retaining offsets into the original text.
// NFC combines L + V and LV + T deterministically; no ICU word dictionary is involved.
export function hangulUnits(text: string): { term: string; start: number; end: number }[] {
  const units: { term: string; start: number; end: number }[] = [];
  let offset = 0;
  for (const character of text) {
    const start = offset;
    offset += character.length;
    const term = character.normalize('NFKC');
    const previous = units.at(-1);
    if (previous && /\p{Script=Hangul}/u.test(previous.term) && /\p{Script=Hangul}/u.test(term)) {
      const composed = (previous.term + term).normalize('NFC');
      if ([...composed].length === 1) {
        previous.term = composed;
        previous.end = offset;
        continue;
      }
    }
    units.push({ term, start, end: offset });
  }
  return units;
}

// A bounded vocabulary: unknown words are never stemmed, and photography alone is not a packshot.
const GROUPS = [
  ['제품 사진', '제품사진', 'product photography', 'packshot'],
  ['인물 사진', '인물사진', '포트레이트', 'portrait'],
  ['제품 포스터', '제품포스터', 'product poster'],
  ['포스터', 'poster'],
  ['스티커', 'sticker'],
  ['수묵화', 'ink wash'],
  ['조명', 'lighting'],
  ['템플릿', 'template'],
  ['스튜디오', 'studio'],
  ['네온', 'neon'],
] as const;
const NOUNS = [...GROUPS.flat().filter((word) => /[가-힣]/u.test(word)), '사진', '제품', '종이', '매화', '빛'];
const PARTICLES = '에서|으로|은|는|이|가|을|를|의|에|로|와|과';
const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
const boundaryPattern = (words: readonly string[], particles = false) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}\\p{M}])(${[...words]
      .sort((a, b) => b.length - a.length)
      .map(escape)
      .join('|')})${particles ? `(?:${PARTICLES})?` : ''}(?![\\p{L}\\p{N}\\p{M}])`,
    'giu',
  );
const nounPattern = boundaryPattern(NOUNS, true);
const canonicalForms = new Map<string, string>(
  GROUPS.flatMap((group) => group.filter((form) => /[가-힣]/u.test(form)).map((form) => [form, group[0]] as const)),
);
const aliasPatterns = GROUPS.map((group) => ({ words: group, pattern: boundaryPattern(group) }));

/** Query-only rewrites: do not use these offsets to highlight the original document. */
export function normalizeKoreanQuery(text: string): string {
  return text.normalize('NFKC').replace(nounPattern, (_match, noun: string) => {
    const word = noun.replace(/\s+/g, ' ');
    return canonicalForms.get(word) ?? word;
  });
}

/** Index-side semantic aliases, requiring a complete word or phrase rather than scattered bigrams. */
export function koreanAliases(text: string): string {
  const normalized = normalizeKoreanQuery(text);
  return aliasPatterns
    .filter(({ pattern }) => {
      pattern.lastIndex = 0;
      return pattern.test(normalized);
    })
    .flatMap(({ words }) => words)
    .join(' ');
}
