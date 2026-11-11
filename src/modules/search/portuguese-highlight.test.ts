import { expect, it } from 'vitest';
import { highlightParts } from '../../ui/search/highlight-parts';
import { createIndex, loadEngine, search } from './engine';
import { SEARCH_ANALYZER_VERSION, SEARCH_SCHEMA_VERSION, type SearchDocument, type SearchIndexFile } from './types';
import { createSearchCore } from './worker-core';

const title = '🖼 Composic\u0327a\u0303o, iluminac\u0327a\u0303o e PÔSTER!';
const document: SearchDocument = {
  id: 'prompt:p_001',
  kind: 'prompt',
  contentLocale: 'pt-BR',
  title,
  description: 'Uma composição com iluminação suave.',
  path: '/pt-br/prompts/example/',
  frame: null,
  thumb: null,
  tags: [],
  terms: '',
  model: '',
  body: '',
};
function indexFile(): SearchIndexFile {
  return {
    schemaVersion: SEARCH_SCHEMA_VERSION,
    analyzerVersion: SEARCH_ANALYZER_VERSION,
    buildId: 'pt-candidate',
    locale: 'pt-BR',
    counts: { prompt: 1, template: 0, collection: 0, topic: 0 },
    popular: [],
    terms: [],
    index: JSON.parse(JSON.stringify(createIndex([document], 'pt-BR'))),
  };
}

it('preserves original Portuguese combining marks from serialized search result through displayed highlights', () => {
  const engine = loadEngine(indexFile());
  for (const query of [
    'composicao iluminacao poster',
    'COMPOSIÇÃO ILUMINAÇÃO PÔSTER',
    'composic\u0327a\u0303o iluminac\u0327a\u0303o po\u0302ster',
  ]) {
    const hit = search(engine, query).groups[0]?.hits[0];
    expect(hit?.id).toBe('prompt:p_001');
    expect(hit?.title).toBe(title);
    expect(highlightParts(hit!.title, 'pt-BR', hit!.matched)).toEqual([
      { text: '🖼 ', mark: false },
      { text: 'Composic\u0327a\u0303o', mark: true },
      { text: ', ', mark: false },
      { text: 'iluminac\u0327a\u0303o', mark: true },
      { text: ' e ', mark: false },
      { text: 'PÔSTER', mark: true },
      { text: '!', mark: false },
    ]);
  }
});

it.each(['analyzer', 'build'] as const)(
  'recovers a Portuguese search after rejecting a stale %s index',
  async (stale) => {
    const current = indexFile();
    let served = { ...current, ...(stale === 'analyzer' ? { analyzerVersion: -1 } : { buildId: 'previous-build' }) };
    const handle = createSearchCore(async () => served);
    const source = { locale: 'pt-BR', url: '/generated/pt-BR/search/index.json' };
    const request = { type: 'search' as const, buildId: 'pt-candidate', source, query: 'composicao', limit: 5 };
    expect(await handle({ ...request, seq: 1 })).toEqual({ type: 'error', seq: 1, error: 'stale' });
    served = current;
    expect(await handle({ ...request, seq: 2 })).toMatchObject({
      type: 'results',
      seq: 2,
      results: { total: 1, groups: [{ hits: [{ id: 'prompt:p_001', title }] }] },
    });
  },
);
