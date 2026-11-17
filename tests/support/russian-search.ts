import { createIndex } from '../../src/modules/search/engine';
import {
  SEARCH_ANALYZER_VERSION,
  SEARCH_SCHEMA_VERSION,
  type SearchDocument,
  type SearchIndexFile,
} from '../../src/modules/search/types';

const document = (id: string, title: string, fields: Partial<SearchDocument> = {}): SearchDocument => ({
  id,
  title,
  kind: 'prompt',
  contentLocale: 'ru',
  description: '',
  path: `/ru/prompts/${id}/`,
  frame: null,
  thumb: null,
  tags: [],
  terms: '',
  model: '',
  body: '',
  ...fields,
});

export const russianFixtureCases = [
  { query: 'предметная съёмка студия', ids: ['product'] },
  { query: 'предметная съемка студия', ids: ['product'] },
  { query: 'предметная съёмка студия'.normalize('NFD'), ids: ['product'] },
  { query: 'предметной съёмки студия', ids: ['product'] },
  { query: 'packshot studio', ids: ['product'] },
  { query: 'packshot', ids: ['product'] },
  { query: 'шаблоны постеров', ids: ['template'] },
  { query: 'май', ids: ['may', 'may-decomposed'] },
  { query: 'маи', ids: ['mai'] },
  // Prefix matching also finds ИИ, but must never match й.
  { query: 'и', ids: ['i', 'ai-model'] },
  { query: 'й', ids: ['short-i'] },
  { query: 'zxqvnonexistent', ids: [] },
];

export function russianSearchFixture(buildId: string): SearchIndexFile {
  const documents = [
    document('product', 'Предметная съёмка в студии'),
    document('family', 'Портретная фотография'),
    document('separated', 'Предметная композиция, затем съёмка'),
    document('split-fields', 'Предметная', { body: 'съёмка' }),
    document('split-sentences', 'Предметная. Съёмка'),
    document('ai-model', 'Модель ИИ'),
    document('template', 'Постер товара', { kind: 'template' }),
    document('may', 'май'),
    document('may-decomposed', 'маи\u0306'),
    document('mai', 'маи'),
    document('i', 'и'),
    document('short-i', 'й'),
  ];
  return {
    schemaVersion: SEARCH_SCHEMA_VERSION,
    analyzerVersion: SEARCH_ANALYZER_VERSION,
    buildId,
    locale: 'ru',
    counts: { prompt: documents.filter((doc) => doc.kind === 'prompt').length, template: 1, collection: 0, topic: 0 },
    popular: [],
    terms: [],
    index: JSON.parse(JSON.stringify(createIndex(documents, 'ru'))),
  };
}
