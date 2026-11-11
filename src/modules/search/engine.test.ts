import { describe, expect, it } from 'vitest';
import { createIndex, loadEngine, noResultHelp, search, type Engine } from './engine';
import type { SearchDocument, SearchIndexFile } from './types';
import { createSearchCore } from './worker-core';

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
    schemaVersion: 2,
    analyzerVersion: 2,
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
    schemaVersion: 2,
    analyzerVersion: 2,
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
