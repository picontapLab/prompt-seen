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

const SPANISH_TERMS = [
  ['póster', 'pósteres', 'cartel', 'carteles', 'poster', 'posters'],
  ['pegatina', 'pegatinas', 'sticker', 'stickers'],
  ['plantilla', 'plantillas', 'template', 'templates'],
  ['retrato', 'retratos', 'portrait', 'portraits'],
  // A city plan is a map; bare «plano» also means a camera shot and is not an alias.
  ['mapa', 'plano urbano'],
] as const;

const SPANISH_PRODUCT_PHOTOGRAPHY = [
  'fotografía de producto',
  'fotografía de productos',
  'foto de producto',
  'fotos de producto',
  'packshot',
  'product photography',
] as const;

const SPANISH_KINDS: Record<SearchKind, string> = {
  prompt: 'prompt',
  template: 'plantilla',
  collection: 'colección',
  topic: 'tema',
};

// Both languages use the same low-weight expansion contract; only vocabulary differs.
const PROFILES = {
  de: {
    terms: GERMAN_TERMS,
    compounds: GERMAN_COMPOUNDS,
    kinds: GERMAN_KINDS,
    productPhotography: GERMAN_PRODUCT_PHOTOGRAPHY,
    photography: 'Fotografie',
  },
  es: {
    terms: SPANISH_TERMS,
    compounds: [],
    kinds: SPANISH_KINDS,
    productPhotography: SPANISH_PRODUCT_PHOTOGRAPHY,
    photography: 'fotografía',
  },
} as const;

export function domainAliases(text: string, locale: string, kind?: SearchKind): string {
  const language = locale.split('-')[0]!.toLowerCase();
  if (language !== 'de' && language !== 'es') return '';
  const profile = PROFILES[language];
  const terms = new Set(queryTerms(text, locale));
  const compounds = profile.compounds
    .filter(([word]) => terms.has(queryTerms(word, locale)[0]!))
    .map(([, words]) => words);
  const extra = [...compounds, ...(kind ? [profile.kinds[kind]] : [])];
  for (const word of queryTerms(extra.join(' '), locale)) terms.add(word);
  const contains = (word: string) => queryTerms(word, locale).every((term) => terms.has(term));
  const synonyms = profile.terms.filter((group) => group.some(contains)).flat();
  // Product photography is photography; the reverse would turn family portraits into packshots.
  const photography = profile.productPhotography.some(contains)
    ? [...profile.productPhotography, profile.photography]
    : [];
  return [...extra, ...synonyms, ...photography].join(' ');
}
