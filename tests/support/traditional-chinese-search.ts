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
  contentLocale: 'zh-Hant',
  description: '',
  path: `/zh-hant/prompts/${id}/`,
  frame: null,
  thumb: null,
  tags: [],
  terms: '',
  model: '',
  body: '',
  ...fields,
});

export const traditionalChineseFixtureCases = [
  { query: 'packshot', ids: ['product'] },
  { query: '产品摄影 棚拍', ids: ['product'] },
  { query: '產品攝影 棚拍', ids: ['product'] },
  { query: '霓虹人像', ids: ['portrait'] },
  { query: '霓虹 肖像', ids: ['portrait'] },
  { query: '海報', ids: ['literal-poster', 'alias-poster', 'template'] },
  { query: '模板', ids: ['template'] },
  { query: '灯笼', ids: ['lantern'] },
  { query: '發', ids: ['emit'] },
  { query: '髮', ids: ['hair'] },
  { query: '後', ids: ['after'] },
  { query: '后', ids: ['queen'] },
  { query: 'zzqvnoresult984731', ids: [] },
];

export function traditionalChineseSearchFixture(buildId: string): SearchIndexFile {
  const documents = [
    document('product', '商品攝影 棚拍'),
    document('portrait', '霓虹人像', { body: 'photography' }),
    document('separated', '商品在左方，攝影師在右方'),
    document('model', 'AI 模型'),
    document('literal-poster', '海報'),
    document('alias-poster', 'poster'),
    document('posterior', 'posterior'),
    document('template', 'poster', { kind: 'template', path: '/zh-hant/templates/template/' }),
    document('lantern', '猴子 燈籠'),
    document('emit', '發'),
    document('hair', '髮'),
    document('after', '後'),
    document('queen', '后'),
  ];
  return {
    schemaVersion: SEARCH_SCHEMA_VERSION,
    analyzerVersion: SEARCH_ANALYZER_VERSION,
    buildId,
    locale: 'zh-Hant',
    counts: { prompt: documents.length - 1, template: 1, collection: 0, topic: 0 },
    popular: [],
    terms: [],
    index: JSON.parse(JSON.stringify(createIndex(documents, 'zh-Hant'))),
  };
}
