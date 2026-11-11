import { queryTerms } from './tokenize';

// Maintained domain vocabulary, deliberately not an arbitrary compound-word splitter.
const GERMAN_TERMS = [
  ['Produktfotografie', 'Produktfoto', 'Produktbilder', 'Fotografie', 'product photography'],
  ['Porträt', 'Portrait', 'portrait'],
  ['Poster', 'Plakat', 'poster'],
  ['Sticker', 'Aufkleber', 'sticker'],
  ['Bildkomposition', 'Komposition', 'Bildaufbau', 'composition'],
  ['Hintergrund', 'background'],
  ['Beleuchtung', 'Licht', 'Lichtgestaltung', 'lighting'],
  ['Vorlage', 'Vorlagen', 'template'],
] as const;

export function domainAliases(text: string, locale: string): string {
  if (locale.split('-')[0] !== 'de') return '';
  const terms = new Set(queryTerms(text, locale));
  return GERMAN_TERMS.filter((group) => group.some((word) => queryTerms(word, locale).every((term) => terms.has(term))))
    .flat()
    .join(' ');
}
