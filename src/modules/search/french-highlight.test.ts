import { expect, it } from 'vitest';
import { highlightParts } from '../../ui/search/highlight-parts';
import { createIndex, loadEngine, search } from './engine';
import { SEARCH_ANALYZER_VERSION, SEARCH_SCHEMA_VERSION, type SearchDocument, type SearchIndexFile } from './types';
import { createSearchCore } from './worker-core';

const title = '🖼 L’œuvre au cœur de l’e\u0301clairage';
const document: SearchDocument = {
  id: 'prompt:ligatures',
  kind: 'prompt',
  contentLocale: 'fr',
  title,
  description: '',
  path: '/fr/prompts/ligatures/',
  frame: null,
  thumb: null,
  tags: [],
  terms: '',
  model: '',
  body: '',
};
const file: SearchIndexFile = {
  schemaVersion: SEARCH_SCHEMA_VERSION,
  analyzerVersion: SEARCH_ANALYZER_VERSION,
  buildId: 'french-fixture',
  locale: 'fr',
  counts: { prompt: 1, template: 0, collection: 0, topic: 0 },
  popular: [],
  terms: [],
  index: JSON.parse(JSON.stringify(createIndex([document], 'fr'))),
};

it('highlights original ligatures and decomposed marks, keeping elision and emoji intact', () => {
  const hit = search(loadEngine(file), "l'oeuvre coeur eclairage").groups[0]!.hits[0]!;
  expect(hit.title).toBe(title);
  expect(highlightParts(hit.title, 'fr', hit.matched)).toEqual([
    { text: '🖼 L’', mark: false },
    { text: 'œuvre', mark: true },
    { text: ' au ', mark: false },
    { text: 'cœur', mark: true },
    { text: ' de l’', mark: false },
    { text: 'e\u0301clairage', mark: true },
  ]);
});

it.each(['analyzer', 'build'] as const)(
  'rejects stale French %s data and retries the current artifact',
  async (stale) => {
    let served = { ...file, ...(stale === 'analyzer' ? { analyzerVersion: -1 } : { buildId: 'old' }) };
    const handle = createSearchCore(async () => served);
    const request = {
      type: 'search' as const,
      buildId: file.buildId,
      source: { locale: 'fr', url: '/generated/fr/search/index.json' },
      query: "l'oeuvre",
      limit: 5,
    };
    expect(await handle({ ...request, seq: 1 })).toEqual({ type: 'error', error: 'stale', seq: 1 });
    served = file;
    expect(await handle({ ...request, seq: 2 })).toMatchObject({
      type: 'results',
      seq: 2,
      results: { total: 1, groups: [{ hits: [{ id: document.id, title }] }] },
    });
  },
);
