import { expect, it } from 'vitest';
import { highlightParts } from '../../ui/search/highlight-parts';
import { createIndex, loadEngine, search } from './engine';
import { SEARCH_ANALYZER_VERSION, SEARCH_SCHEMA_VERSION, type SearchDocument, type SearchIndexFile } from './types';

const title = '🖼 إِضَــاءَةٌ ٢٠٢٦!';
const document: SearchDocument = {
  id: 'prompt:p_001',
  kind: 'prompt',
  contentLocale: 'ar',
  title,
  description: 'وصف إضاءة ناعمة.',
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
    buildId: 'ar-candidate',
    locale: 'ar',
    counts: { prompt: 1, template: 0, collection: 0, topic: 0 },
    popular: [],
    terms: [],
    index: JSON.parse(JSON.stringify(createIndex([document], 'ar'))),
  };
}

it('preserves Arabic diacritics, tatweel and digit glyphs through search and highlighting', () => {
  const engine = loadEngine(indexFile());
  const hit = search(engine, 'اضاءة 2026').groups[0]?.hits[0];
  expect(hit?.id).toBe('prompt:p_001');
  expect(hit?.title).toBe(title);
  const parts = highlightParts(hit!.title, 'ar', hit!.matched);
  expect(parts).toEqual([
    { text: '🖼 ', mark: false },
    { text: 'إِضَــاءَةٌ', mark: true },
    { text: ' ', mark: false },
    { text: '٢٠٢٦', mark: true },
    { text: '!', mark: false },
  ]);
  expect(parts.map((part) => part.text).join('')).toBe(title);
});
