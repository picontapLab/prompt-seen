import { queryTerms } from './tokenize';
import type { SearchKind } from './types';

// Maintained domain vocabulary, deliberately not an arbitrary compound-word splitter.
const GERMAN_PRODUCT_PHOTOGRAPHY = [
  'Produktfotografie',
  'Produktfoto',
  'Produktbilder',
  'Produktaufnahme',
  'Packshot',
  'product photography',
] as const;

const GERMAN_TERMS = [
  ['Porträt', 'Portrait', 'portrait'],
  ['Poster', 'Plakat', 'poster'],
  ['Sticker', 'Aufkleber', 'sticker'],
  ['Bildkomposition', 'Komposition', 'Bildaufbau', 'composition'],
  ['Hintergrund', 'background'],
  ['Beleuchtung', 'Licht', 'Lichtgestaltung', 'Konturlicht', 'lighting', 'light'],
  ['Vorlage', 'Vorlagen', 'template'],
  ['Alltag', 'Alltagsmotiv', 'natürlichen Gebrauch', 'everyday', 'lifestyle'],
  ['Tee', 'Teedose', 'tea'],
  ['Salbei', 'Salbeigrün', 'salbeigrünem', 'sage'],
] as const;

// Explicit domain compounds keep recall predictable without guessing arbitrary word splits.
const GERMAN_COMPOUNDS = [
  ['Alltagsstraße', 'Straße Alltag'],
  ['Nachbarschaftsstraße', 'Straße Nachbarschaft'],
  ['Konzertposter', 'Konzert Poster'],
  ['Produktposter', 'Produkt Poster'],
  ['Bürokatze', 'Büro Katze'],
  ['Reaktionssticker', 'Reaktion Sticker'],
] as const;

const GERMAN_KINDS: Record<SearchKind, string> = {
  prompt: 'Prompt',
  template: 'Vorlage',
  collection: 'Sammlung',
  topic: 'Thema',
};

export function domainAliases(text: string, locale: string, kind?: SearchKind): string {
  if (locale.split('-')[0] !== 'de') return '';
  const terms = new Set(queryTerms(text, locale));
  const compounds = GERMAN_COMPOUNDS.filter(([word]) => terms.has(queryTerms(word, locale)[0]!)).map(
    ([, words]) => words,
  );
  const extra = [...compounds, ...(kind ? [GERMAN_KINDS[kind]] : [])];
  for (const word of queryTerms(extra.join(' '), locale)) terms.add(word);
  const contains = (word: string) => queryTerms(word, locale).every((term) => terms.has(term));
  const synonyms = GERMAN_TERMS.filter((group) => group.some(contains)).flat();
  // Product photography is photography; the reverse would turn family portraits into packshots.
  const photography = GERMAN_PRODUCT_PHOTOGRAPHY.some(contains) ? [...GERMAN_PRODUCT_PHOTOGRAPHY, 'Fotografie'] : [];
  return [...extra, ...synonyms, ...photography].join(' ');
}
