import { koreanAliases } from './korean';
import { traditionalChineseAliases } from './traditional-chinese';
import { normalizeTerm, queryTerms, tokenize } from './tokenize';
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

const PORTUGUESE_TERMS = [
  ['retrato', 'retratos', 'portrait', 'portraits'],
  ['cartaz', 'cartazes', 'pôster', 'pôsteres', 'poster', 'posters'],
  ['adesivo', 'adesivos', 'sticker', 'stickers'],
  ['template', 'templates', 'modelo de prompt', 'modelos de prompt'],
  ['coleção', 'coleções', 'collection', 'collections'],
  ['composição', 'composições', 'composition'],
  ['fundo', 'fundos', 'background'],
  ['iluminação', 'lighting'],
  ['imagem de referência', 'imagens de referência', 'reference image'],
] as const;

const PORTUGUESE_PRODUCT_PHOTOGRAPHY = [
  'fotografia de produto',
  'fotografia de produtos',
  'foto de produto',
  'fotos de produto',
  'packshot',
  'product photography',
] as const;

const PORTUGUESE_KINDS: Record<SearchKind, string> = {
  prompt: 'prompt',
  template: 'template',
  collection: 'coleção',
  topic: 'tema',
};

const FRENCH_TERMS = [
  ['affiche', 'poster'],
  ['autocollant', 'sticker'],
  ['éclairage', 'lighting'],
  ['portrait', 'portraits'],
  ['modèle de prompt', 'gabarit', 'template'],
] as const;

const FRENCH_PRODUCT_PHOTOGRAPHY = [
  'photographie de produit',
  'photographie de produits',
  'photo de produit',
  'photo de produits',
  'photos de produits',
  'packshot',
  'product photography',
] as const;

const FRENCH_KINDS: Record<SearchKind, string> = {
  prompt: 'prompt',
  template: 'modèle de prompt gabarit template',
  collection: 'collection',
  topic: 'thème',
};

const ITALIAN_TERMS = [
  ['ritratto', 'ritratti', 'portrait', 'portraits'],
  ['adesivo', 'adesivi', 'sticker', 'stickers'],
  ['modello di prompt', 'modelli di prompt', 'template', 'templates'],
  ['raccolta', 'raccolte', 'collection', 'collections'],
  ['tema', 'temi', 'topic', 'topics'],
  ['illuminazione', 'lighting'],
  ['sfondo', 'sfondi', 'background'],
] as const;

const ITALIAN_PRODUCT_PHOTOGRAPHY = [
  'fotografia di prodotto',
  'fotografia di prodotti',
  'foto di prodotto',
  'foto di prodotti',
  'product photography',
  'packshot',
] as const;

const ITALIAN_KINDS: Record<SearchKind, string> = {
  prompt: 'prompt',
  template: 'modello di prompt modelli di prompt template templates',
  collection: 'raccolta raccolte collection collections',
  topic: 'tema temi topic topics',
};

// Explicit inflections, not suffix stripping: arbitrary Russian words and model IDs stay intact.
const RUSSIAN_TERMS = [
  ['портрет', 'портрета', 'портреты', 'портретов', 'портретом', 'портрете', 'portrait', 'portraits'],
  ['неоновый', 'неоновая', 'неоновое', 'неоновой', 'неонового', 'неоновым', 'неоновые', 'neon'],
  ['шаблон', 'шаблона', 'шаблоны', 'шаблонов', 'template', 'templates'],
  ['постер', 'постера', 'постеры', 'постеров', 'плакат', 'плакаты', 'плаката', 'poster', 'posters'],
  ['стикер', 'стикеры', 'наклейка', 'наклейки', 'sticker', 'stickers'],
  ['освещение', 'освещения', 'lighting'],
  ['студия', 'студии', 'студийный', 'студийная', 'студийное', 'студийной', 'studio'],
  ['подборка', 'подборки', 'подборок', 'collection', 'collections'],
  ['тема', 'темы', 'topic', 'topics'],
  ['тушь', 'тушью', 'туши', 'ink'],
] as const;

const RUSSIAN_PRODUCT_PHOTOGRAPHY = [
  'предметная съёмка',
  'предметной съёмки',
  'предметную съёмку',
  'съёмка товаров',
  'packshot',
  'product photography',
] as const;

const RUSSIAN_KINDS: Record<SearchKind, string> = {
  prompt: 'промпт промпты',
  template: 'шаблон',
  collection: 'подборка',
  topic: 'тема',
};

// Each language uses the same low-weight expansion contract; only vocabulary differs.
const PROFILES = {
  fr: {
    terms: FRENCH_TERMS,
    compounds: [],
    kinds: FRENCH_KINDS,
    productPhotography: FRENCH_PRODUCT_PHOTOGRAPHY,
    photography: 'photographie',
  },
  it: {
    terms: ITALIAN_TERMS,
    compounds: [],
    kinds: ITALIAN_KINDS,
    productPhotography: ITALIAN_PRODUCT_PHOTOGRAPHY,
    photography: 'fotografia',
  },
  ru: {
    terms: RUSSIAN_TERMS,
    compounds: [],
    kinds: RUSSIAN_KINDS,
    productPhotography: RUSSIAN_PRODUCT_PHOTOGRAPHY,
    photography: 'фотография',
  },
  ar: {
    terms: [
      ['قالب', 'قوالب', 'القالب', 'القوالب', 'template', 'templates'],
      ['أمر نصي', 'أوامر نصية', 'الأوامر النصية', 'prompt', 'prompts'],
      ['مجموعة', 'مجموعات', 'المجموعة', 'المجموعات', 'collection', 'collections'],
      ['موضوع', 'موضوعات', 'الموضوع', 'الموضوعات', 'topic', 'topics'],
      ['بورتريه', 'صورة شخصية', 'صور شخصية', 'portrait', 'portraits'],
      ['ملصق إعلاني', 'ملصقات إعلانية', 'الملصق الإعلاني', 'poster', 'posters'],
      ['ملصق لاصق', 'ملصقات لاصقة', 'الملصق اللاصق', 'sticker', 'stickers'],
      ['إضاءة', 'الإضاءة', 'بالإضاءة', 'بإضاءة', 'lighting'],
      ['خلفية', 'خلفيات', 'الخلفية', 'الخلفيات', 'background'],
      ['صورة مرجعية', 'صور مرجعية', 'الصورة المرجعية', 'reference image'],
      ['حملة منتجات', 'حملة منتج', 'لحملة منتج', 'حملة المنتجات', 'حملة المنتج', 'product campaign'],
      ['استوديو', 'الاستوديو', 'studio'],
      ['غلاف', 'الغلاف', 'لغلاف', 'أغلفة'],
      ['حملة', 'الحملة', 'لحملة'],
      ['فرصة', 'الفرصة', 'لفرصة', 'فرص'],
      ['سوق', 'السوق', 'سوقية', 'السوقية'],
      ['3x3', '3×3'],
    ],
    compounds: [],
    kinds: {
      prompt: 'أمر نصي',
      template: 'قالب قوالب القالب القوالب template templates',
      collection: 'مجموعة مجموعات المجموعة المجموعات collection collections',
      topic: 'موضوع موضوعات الموضوع الموضوعات topic topics',
    },
    productPhotography: ['تصوير المنتجات', 'تصوير منتجات', 'تصوير المنتج', 'product photography', 'packshot'],
    photography: 'تصوير',
  },
  pt: {
    terms: PORTUGUESE_TERMS,
    compounds: [],
    kinds: PORTUGUESE_KINDS,
    productPhotography: PORTUGUESE_PRODUCT_PHOTOGRAPHY,
    photography: 'fotografia',
  },
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
  if (locale === 'zh-Hant') return traditionalChineseAliases(text, kind);
  const language = locale.split('-')[0]!.toLowerCase();
  if (language === 'ko')
    return (
      koreanAliases(text) +
      (kind ? ` ${{ prompt: '프롬프트', template: '템플릿', collection: '컬렉션', topic: '주제' }[kind]}` : '')
    );
  if (language !== 'de' && language !== 'es' && language !== 'pt' && language !== 'fr' && language !== 'it' && language !== 'ru' && language !== 'ar') return '';
  const profile = PROFILES[language];
  const terms = new Set(queryTerms(text, locale));
  const compounds = profile.compounds
    .filter(([word]) => terms.has(queryTerms(word, locale)[0]!))
    .map(([, words]) => words);
  const extra = [...compounds, ...(kind ? [profile.kinds[kind]] : [])];
  for (const word of queryTerms(extra.join(' '), locale)) terms.add(word);
  const phraseText = ` ${tokenize(text, locale).join(' ')} `;
  const contains = (word: string) => {
    // Separate mentions of «primer plano» and «fondo urbano» do not describe a city map.
    if (language === 'es' && word === 'plano urbano')
      return /(?:^|[^\p{L}\p{N}])plano[ \t]+urbano(?=$|[^\p{L}\p{N}])/u.test(normalizeTerm(text, locale));
    // Preserve repeated words in contiguous French phrases, without synthetic kind tokens.
    const words = language === 'fr' ? tokenize(word, locale) : queryTerms(word, locale);
    // Match a phrase in actual prose, without crossing punctuation or synthetic kind text.
    if (language === 'it' && words.length > 1)
      return new RegExp(`(?:^|[^\\p{L}\\p{N}])${words.join('\\s+')}(?=$|[^\\p{L}\\p{N}])`, 'u').test(
        normalizeTerm(text, locale),
      );
    if (language === 'ar' && words.length > 1) {
      const phrase = normalizeTerm(word, locale)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/[ \t]+/g, '[ \\t]+');
      return new RegExp(`(?:^|[^\\p{L}\\p{N}])${phrase}(?=$|[^\\p{L}\\p{N}])`, 'u').test(normalizeTerm(text, locale));
    }
    // A Portuguese phrase must occur in the prose. The synthetic kind "prompt"
    // must not turn "modelo de IA" into "modelo de prompt" (a template).
    return (language === 'pt' || language === 'fr' || language === 'ru') && words.length > 1
      ? phraseText.includes(` ${words.join(' ')} `)
      : words.every((term) => terms.has(term));
  };
  const synonyms = profile.terms.filter((group) => group.some(contains)).flat();
  // Product photography is photography; the reverse would turn family portraits into packshots.
  const photography = profile.productPhotography.some(contains)
    ? [...profile.productPhotography, profile.photography]
    : [];
  // Bare manifesto may mean a declaration; only known posters get these aliases.
  const posters = language === 'it' && contains('poster') ? ['manifesto', 'manifesti'] : [];
  return [...extra, ...synonyms, ...photography, ...posters].join(' ');
}
