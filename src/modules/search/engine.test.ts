import { describe, expect, it } from 'vitest';
import { createIndex, loadEngine, noResultHelp, search, type Engine } from './engine';
import { SEARCH_ANALYZER_VERSION, SEARCH_SCHEMA_VERSION, type SearchDocument, type SearchIndexFile } from './types';
import { createSearchCore } from './worker-core';
import { koreanFixtureCases, koreanSearchFixture } from '../../../tests/support/korean-search';

// The engine over small fixtures (design doc §13.1–§13.2, §11.8.6). The index built from the
// sample content is tested in documents.test.ts.

const doc = (id: string, fields: Partial<SearchDocument>): SearchDocument => ({
  id,
  kind: 'prompt',
  contentLocale: 'en',
  title: '',
  description: '',
  path: `/en/prompts/${id}/`,
  frame: null,
  thumb: null,
  tags: [],
  terms: '',
  model: '',
  body: '',
  ...fields,
});

function engineOf(locale: string, docs: SearchDocument[], extra: Partial<SearchIndexFile> = {}): Engine {
  const file: SearchIndexFile = {
    schemaVersion: SEARCH_SCHEMA_VERSION,
    analyzerVersion: SEARCH_ANALYZER_VERSION,
    buildId: 'b1',
    locale,
    counts: { prompt: docs.length, template: 0, collection: 0, topic: 0 },
    popular: [],
    terms: [],
    // Through JSON, as the browser receives it.
    index: JSON.parse(JSON.stringify(createIndex(docs, locale))),
    ...extra,
  };
  return loadEngine(file);
}

const en = engineOf(
  'en',
  [
    doc('neon-title', { title: 'Neon tower', terms: 'Architecture' }),
    doc('neon-body', { title: 'Night street', body: 'a neon sign glows above the street' }),
    doc('poster', { title: 'Jazz poster', terms: 'Poster 海报 flyer', model: 'Sample Renderer 1 sample-renderer-1' }),
    doc('portrait', { title: 'Ink portrait', terms: 'Portrait Ink wash' }),
    doc('tpl', { kind: 'template', title: 'Product poster', path: '/en/templates/product-poster/', terms: 'Poster' }),
  ],
  { terms: [{ kind: 'category', id: 'poster', label: 'Poster', words: ['flyer'] }] },
);

const ids = (q: string, e = en) => search(e, q).groups.flatMap((g) => g.hits.map((h) => h.id));

describe('ranking and matching (§13.1)', () => {
  it('matches Italian elisions and domain aliases after serialization without changing stored text', () => {
    const engine = engineOf('it', [
      doc('neon', { title: 'Ritratto con illuminazione neon di qualità' }),
      doc('product', { title: 'Fotografia di prodotto in studio' }),
      doc('family', { title: 'Fotografia di famiglia' }),
      doc('split', { title: 'Fotografia. Di prodotto si parla altrove.' }),
      doc('split-fields', { title: 'Fotografia', body: 'di prodotto' }),
      doc('scattered', { title: 'Fotografia di famiglia con un prodotto' }),
      doc('model', { title: 'Modello di IA per fotografia' }),
      doc('template', { kind: 'template', title: 'Ritratto ad acquerello' }),
      doc('poster', { title: 'Poster Colosseo' }),
      doc('literal', { title: 'Manifesto Colosseo' }),
    ]);
    for (const q of ['ritratti neon', 'l’illuminazione neon', "l'illuminazione neon", 'qualita', 'QUALITÀ'])
      expect(ids(q, engine)).toEqual(['neon']);
    expect(search(engine, 'qualita').groups[0]!.hits[0]!.title).toBe('Ritratto con illuminazione neon di qualità');
    expect(ids('packshot', engine)).toEqual(['product']);
    expect(ids('foto di prodotti studio', engine)).toEqual(['product']);
    expect(ids('modelli di prompt acquerello', engine)).toEqual(['template']);
    expect(ids('template', engine)).toEqual(['template']);
    expect(ids('manifesto Colosseo', engine)).toEqual(['literal', 'poster']);
    expect(ids('poster', engine)).not.toContain('literal');
  });

  it.each([' ', '\n', '\u00a0'])('accepts Italian photography phrases separated by %j', (space) => {
    const engine = engineOf('it', [doc('product', { title: ['fotografia', 'di', 'prodotto'].join(space) })]);
    expect(ids('packshot', engine)).toEqual(['product']);
  });

  it('does not synthesize an Arabic phrase across fields, punctuation or the content kind', () => {
    const engine = engineOf('ar', [
      doc('split-fields', { title: 'تصوير', body: 'المنتجات' }),
      doc('split-sentences', { title: 'تصوير. المنتجات' }),
      doc('split-kind', { title: 'نصي' }),
      doc('real-phrase', { title: 'تصوير المنتجات' }),
    ]);
    expect(ids('packshot', engine)).toEqual(['real-phrase']);
  });

  it('retrieves Arabic domain forms without confusing posters, stickers, products and AI models', () => {
    const engine = engineOf('ar', [
      doc('poster', { title: 'ملصق إعلاني لمقهى' }),
      doc('sticker', { title: 'ملصق لاصق لقطة' }),
      doc('product', { title: 'تصوير المنتجات في استوديو' }),
      doc('family', { title: 'تصوير عائلي' }),
      doc('unrelated', { title: 'وصف المنتجات', body: 'تصوير عائلي' }),
      doc('template', { kind: 'template', title: 'بورتريه بإضاءة نيون' }),
      doc('model', { title: 'نموذج ذكاء اصطناعي' }),
    ]);
    expect(ids('poster', engine)).toEqual(['poster']);
    expect(ids('sticker', engine)).toEqual(['sticker']);
    expect(ids('packshot', engine)).toEqual(['product']);
    expect(ids('تصوير منتجات', engine)).toEqual(['product']);
    expect(ids('القوالب portrait', engine)).toEqual(['template']);
    expect(ids('تصوير', engine)).toContain('family');
    expect(ids('template', engine)).not.toContain('model');
  });

  it('finds Arabic and Eastern Arabic digits without changing the displayed text', () => {
    const title = 'فرصة سوق ٢٠٢٦';
    const engine = engineOf('ar', [doc('market', { contentLocale: 'ar', title, model: 'GPT Image 2.6' })]);
    for (const query of ['2026', '٢٠٢٦', '۲۰۲۶', 'GPT Image ٢.٦', 'GPT Image ۲.۶']) {
      const hit = search(engine, query).groups[0]?.hits[0];
      expect(hit?.id, query).toBe('market');
      expect(hit?.title).toBe(title);
    }
  });

  it('finds Brazilian Portuguese aliases while keeping model and product meanings separate', () => {
    const engine = engineOf('pt-BR', [
      doc('poster', { title: 'Pôster Fuji' }),
      doc('literal', { title: 'Cartaz Fuji' }),
      doc('sticker', { title: 'Adesivo de segunda-feira' }),
      doc('template', { kind: 'template', title: 'Retrato com néon' }),
      doc('product', { title: 'Fotografia de produto em estúdio' }),
      doc('family', { title: 'Fotografia de família' }),
      doc('model', { title: 'Modelo de IA para fotografia' }),
    ]);
    expect(ids('cartaz Fuji', engine)).toEqual(['literal', 'poster']);
    expect(ids('stickers segunda', engine)).toEqual(['sticker']);
    expect(ids('modelo de prompt portrait', engine)).toEqual(['template']);
    expect(ids('packshot', engine)).toEqual(['product']);
    expect(ids('foto de produto estudio', engine)).toEqual(['product']);
    expect(ids('fotografia', engine)).toContain('family');
    expect(ids('template', engine)).not.toContain('model');
  });

  it('keeps repeated words in real Portuguese phrases when expanding aliases', () => {
    const engine = engineOf('pt-BR', [
      doc('product', { title: 'Guia de iluminação. Fotografia de produto em estúdio.' }),
      doc('template', { title: 'Modelo de IA: use este modelo de prompt para retratos.' }),
      doc('model', { title: 'Modelo de IA para fotografia' }),
    ]);
    expect(ids('packshot', engine)).toEqual(['product']);
    expect(ids('template', engine)).toEqual(['template']);
  });

  it.each(koreanFixtureCases)('matches the isolated Korean scenario: $query', ({ query, ids: expected }) => {
    expect(ids(query, loadEngine(koreanSearchFixture('b1')))).toEqual(expected);
  });

  it('folds Spanish vowels and punctuation while retaining the exact displayed title', () => {
    const title = '¿Retrato? ¡Póster de un pingüino! Fotografi\u0301a';
    const engine = engineOf('es', [doc('accented', { title })]);
    for (const query of [
      'retrato',
      'poster',
      'póster',
      'pinguino',
      'pingüino',
      'FOTOGRAFÍA',
      'fotografia',
      'fotografi\u0301a',
    ]) {
      const hit = search(engine, query).groups[0]?.hits[0];
      expect(hit?.id).toBe('accented');
      expect(hit?.title).toBe(title);
    }
  });
  it('finds Spanish domain aliases without turning family photography into packshots', () => {
    const engine = engineOf('es', [
      doc('poster', { title: 'Póster Fuji' }),
      doc('literal', { title: 'Cartel Fuji' }),
      doc('sticker', { title: 'Pegatina del lunes' }),
      doc('template', { kind: 'template', title: 'Retrato con neón' }),
      doc('product', { title: 'Fotografía de producto en estudio' }),
      doc('family', { title: 'Fotografía familiar' }),
    ]);
    expect(ids('cartel Fuji', engine)).toEqual(['literal', 'poster']);
    expect(ids('sticker lunes', engine)).toEqual(['sticker']);
    expect(ids('plantilla retrato neón', engine)).toEqual(['template']);
    expect(ids('template portrait', engine)).toEqual(['template']);
    expect(ids('packshot', engine)).toEqual(['product']);
    expect(ids('fotografía de producto estudio', engine)).toEqual(['product']);
    expect(ids('fotografía', engine)).toContain('family');
  });
  it('keeps Spanish ñ distinct after serialization, including decomposed and regional queries', () => {
    for (const locale of ['es', 'es-MX', 'es-419']) {
      const engine = engineOf(locale, [
        doc('year', { title: 'año' }),
        doc('plain', { title: 'ano' }),
        doc('cane', { title: 'caña' }),
        doc('grey', { title: 'cana' }),
      ]);
      expect(ids('AÑO', engine)).toEqual(['year']);
      expect(ids('an\u0303o', engine)).toEqual(['year']);
      expect(ids('ano', engine)).toEqual(['plain']);
      expect(ids('caña', engine)).toEqual(['cane']);
      expect(ids('cana', engine)).toEqual(['grey']);
    }
  });
  it('finds a Spanish city map without treating an ordinary camera shot as a map', () => {
    const engine = engineOf('es', [
      doc('map', { title: 'Retrato con un plano urbano' }),
      doc('shot', { title: 'Retrato en primer plano con fondo urbano' }),
    ]);
    expect(ids('retrato mapa', engine)).toEqual(['map']);
  });
  it('retains the actual language of each taxonomy label through the serialized index', () => {
    const engine = engineOf('de', [
      doc('mixed', {
        title: 'Poster',
        tags: ['Tusche', 'Editorial'],
        tagLocales: ['de', 'en'],
      }),
    ]);
    expect(search(engine, 'Poster').groups[0]!.hits[0]).toMatchObject({
      tags: ['Tusche', 'Editorial'],
      tagLocales: ['de', 'en'],
    });
  });
  it('finds maintained German compounds and ranks the original word above an alias', () => {
    const engine = engineOf('de', [
      doc('compound', { title: 'Produktfotografie' }),
      doc('literal', { title: 'Fotografie' }),
    ]);
    expect(ids('Fotografie', engine)).toEqual(['literal', 'compound']);
    expect(ids('Produktfoto', engine)).toContain('compound');
  });
  it('does not turn generic photography into product photography through aliases', () => {
    const engine = engineOf('de', [
      doc('family', { title: 'Familienporträt', body: 'Diese Fotografie zeigt eine Familie.' }),
      doc('product', { title: 'Produktfotografie' }),
    ]);
    expect(ids('Packshot', engine)).toEqual(['product']);
    expect(ids('Fotografie', engine)).toContain('product');
  });
  it('ranks title matches above prompt text', () => {
    expect(ids('neon')).toEqual(['neon-title', 'neon-body']);
  });

  it('matches the word being typed as a prefix, and longer words with a typo', () => {
    expect(ids('neo')).toContain('neon-title');
    expect(ids('portait')).toEqual(['portrait']);
    // Short words are never fuzzy: "ink" must not find "inkwell"-like noise.
    expect(ids('pink')).toEqual([]);
  });

  it('requires every word', () => {
    expect(ids('neon tower')).toEqual(['neon-title']);
    expect(ids('neon jazz')).toEqual([]);
  });

  it('finds terms by alias, other-language label and model identifier (§13.2)', () => {
    expect(ids('flyer')).toEqual(['poster']);
    expect(ids('海报')).toEqual(['poster']);
    expect(ids('sample-renderer-1')).toEqual(['poster']);
    expect(ids('sample renderer')).toEqual(['poster']);
  });

  it('groups prompts before templates and limits each group', () => {
    const r = search(en, 'poster', 1);
    expect(r.groups.map((g) => [g.kind, g.hits.length])).toEqual([
      ['prompt', 1],
      ['template', 1],
    ]);
    expect(r.total).toBe(2);
  });

  it('returns nothing for an empty query', () => {
    expect(search(en, '   ')).toMatchObject({ total: 0, groups: [] });
  });
});

describe('CJK', () => {
  it('finds Japanese voiced kana in full-width, half-width and decomposed input after index serialization', () => {
    const japanese = engineOf('ja', [doc('jazz', { title: 'ジャズクラブのポスター' })]);
    expect(ids('ｼﾞｬｽﾞｸﾗﾌﾞ ﾎﾟｽﾀｰ', japanese)).toEqual(['jazz']);
    expect(ids('ジャズクラブ', japanese)).toEqual(['jazz']);
    expect(ids('ジャズクラブ', japanese)).toEqual(['jazz']);
  });

  const zh = engineOf('zh-Hans', [
    doc('a', { title: '霓虹剪影肖像' }),
    doc('b', { title: '霓虹楼群', description: '夜晚的肖像' }),
    doc('c', { title: '水墨梅枝' }),
  ]);

  it('matches two words typed together wherever they occur', () => {
    expect(ids('霓虹肖像', zh).sort()).toEqual(['a', 'b']);
  });

  it('matches a single character', () => {
    expect(ids('墨', zh)).toEqual(['c']);
  });

  it('marks the characters the query named', () => {
    const hit = search(zh, '墨').groups[0]!.hits[0]!;
    expect(hit.matched).toEqual(['墨']);
    expect(search(zh, '水墨梅').groups[0]!.hits[0]!.matched).toEqual(['水墨梅', '水墨', '墨梅']);
  });
});

describe('no results (§11.8.6)', () => {
  const zh = engineOf('zh-Hans', [doc('z', { title: '爵士海报', terms: '海报 Poster' })]);

  it('suggests single words that find something, close labels and other languages', () => {
    expect(noResultHelp(en, [zh], 'neon zzz').broader).toEqual([{ word: 'neon', total: 2 }]);
    expect(noResultHelp(en, [zh], 'postre').terms).toEqual([]);
    expect(noResultHelp(en, [zh], 'flye').terms).toEqual([{ label: 'Poster', total: 2 }]);
    expect(noResultHelp(en, [zh], '爵士').otherLocales).toEqual([{ locale: 'zh-Hans', total: 1 }]);
  });
});

describe('worker requests (§11.6.4, §13.3)', () => {
  const file = (buildId: string): SearchIndexFile => ({
    schemaVersion: SEARCH_SCHEMA_VERSION,
    analyzerVersion: SEARCH_ANALYZER_VERSION,
    buildId,
    locale: 'en',
    counts: { prompt: 1, template: 0, collection: 0, topic: 0 },
    popular: [{ id: 'poster', label: 'Poster', count: 1 }],
    terms: [],
    index: JSON.parse(JSON.stringify(createIndex([doc('x', { title: 'Neon' })], 'en'))),
  });
  const source = { locale: 'en', url: '/generated/en/search/index.json' };

  it('answers with the request’s sequence number and loads an index once', async () => {
    let fetches = 0;
    const handle = createSearchCore(async () => (fetches++, file('b1')));
    expect(await handle({ type: 'load', seq: 1, buildId: 'b1', source })).toMatchObject({ type: 'loaded', seq: 1 });
    const res = await handle({ type: 'search', seq: 2, buildId: 'b1', source, query: 'neon', limit: 5 });
    expect(res).toMatchObject({ type: 'results', seq: 2, results: { total: 1 } });
    expect(fetches).toBe(1);
  });

  it('rejects an index from another build', async () => {
    const handle = createSearchCore(async () => file('old'));
    expect(await handle({ type: 'load', seq: 7, buildId: 'b1', source })).toEqual({
      type: 'error',
      seq: 7,
      error: 'stale',
    });
  });

  it('forgets a failed load, so a retry fetches again', async () => {
    let calls = 0;
    const handle = createSearchCore(async () => {
      calls++;
      if (calls === 1) throw new Error('offline');
      return file('b1');
    });
    expect((await handle({ type: 'load', seq: 1, buildId: 'b1', source })).type).toBe('error');
    expect((await handle({ type: 'load', seq: 2, buildId: 'b1', source })).type).toBe('loaded');
  });

  it('rejects incompatible analyzer and schema versions before loading an index', async () => {
    for (const extra of [{ analyzerVersion: -1 }, { schemaVersion: -1 }]) {
      const handle = createSearchCore(async () => ({ ...file('b1'), ...extra }));
      expect(await handle({ type: 'load', seq: 1, buildId: 'b1', source })).toMatchObject({
        type: 'error',
        error: 'stale',
      });
    }
  });

  it('leaves out other languages that fail to load', async () => {
    const handle = createSearchCore(async (url) => {
      if (url.includes('/ja/')) throw new Error('missing');
      return file('b1');
    });
    const res = await handle({
      type: 'help',
      seq: 3,
      buildId: 'b1',
      source,
      others: [{ locale: 'ja', url: '/generated/ja/search/index.json' }],
      query: 'zzz',
    });
    expect(res).toEqual({ type: 'help', seq: 3, help: { broader: [], terms: [], otherLocales: [] } });
  });
});

describe('French retrieval after serialized index loading', () => {
  const french = engineOf('fr', [
    doc('poster', { title: 'Poster Fuji', contentLocale: 'fr' }),
    doc('literal', { title: 'Affiche Fuji', contentLocale: 'fr' }),
    doc('sticker', { title: 'Autocollant du lundi', contentLocale: 'fr' }),
    doc('product', { title: 'Photographie de produit en studio', contentLocale: 'fr' }),
    doc('family', { title: 'Photographie de famille', contentLocale: 'fr' }),
    doc('scattered', { title: 'Photographie de famille et description du produit', contentLocale: 'fr' }),
    doc('model', { title: 'Modèle d’IA pour la photographie', contentLocale: 'fr' }),
    doc('template', { title: 'Portrait au néon', kind: 'template', contentLocale: 'fr' }),
    doc('light', { title: 'Éclairage du cœur de l’œuvre', contentLocale: 'fr' }),
  ]);
  it('prefers literal matches to low-weight aliases', () => {
    expect(ids('affiche Fuji', french)).toEqual(['literal', 'poster']);
    expect(ids('sticker lundi', french)).toEqual(['sticker']);
  });
  it('requires a real product-photography phrase', () => {
    expect(ids('packshot', french)).toEqual(['product']);
    expect(ids('photo de produit studio', french)).toEqual(['product']);
    expect(ids('photographie', french)).toContain('family');
  });
  it('adds template-kind vocabulary without turning an AI model into a template', () => {
    expect(ids('modèle de prompt néon', french)).toEqual(['template']);
    expect(ids('gabarit', french)).toEqual(['template']);
    expect(ids('template', french)).toEqual(['template']);
  });
  it('finds elided and ligature words using the same document/query analyzer', () => {
    expect(ids("l'eclairage coeur oeuvre", french)).toEqual(['light']);
    expect(search(french, 'zxqvnonexistent').total).toBe(0);
  });
});
