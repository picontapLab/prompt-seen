// Which built language to suggest on the language entry (design doc §8.2): the browser's
// preferred languages in order, matched to the registry. Only a suggestion: the entry never
// redirects. Pure, for tests and the client island.

type Candidate = { code: string; htmlLang: string };

/** Chinese without a script subtag: the region decides (zh-TW, zh-HK, zh-MO use Traditional). */
const TRADITIONAL_REGIONS = new Set(['tw', 'hk', 'mo']);

function normalise(tag: string): string {
  const parts = tag.toLowerCase().split('-');
  if (parts[0] === 'zh' && !parts.some((p) => p === 'hans' || p === 'hant'))
    return parts.some((p) => TRADITIONAL_REGIONS.has(p)) ? 'zh-hant' : 'zh-hans';
  return parts.filter((p) => p !== 'latn').join('-');
}

export function suggestLanguage(preferred: readonly string[], locales: readonly Candidate[]): string | null {
  const byTag = new Map(locales.map((l) => [l.htmlLang.toLowerCase(), l.code]));
  for (const raw of preferred) {
    const tag = normalise(raw);
    // Exact tag, then the tag without its region (pt-PT → pt), then any variant of the language.
    if (byTag.has(tag)) return byTag.get(tag)!;
    const [lang, second] = tag.split('-');
    const withScript = lang === 'zh' ? `${lang}-${second}` : null;
    if (withScript && byTag.has(withScript)) return byTag.get(withScript)!;
    if (lang !== 'zh') {
      if (byTag.has(lang!)) return byTag.get(lang!)!;
      const variant = locales.find((l) => l.htmlLang.toLowerCase().split('-')[0] === lang);
      if (variant) return variant.code;
    }
  }
  return null;
}
