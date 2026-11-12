import { createIndex } from '../../src/modules/search/engine';
import {
  SEARCH_ANALYZER_VERSION,
  SEARCH_SCHEMA_VERSION,
  type SearchDocument,
  type SearchIndexFile,
} from '../../src/modules/search/types';

// Korean spec §6.3: isolate semantics from real Prompt bodies, which may legitimately
// contain the terms a negative case excludes. Node and the actual Worker use this corpus.
const document = (id: string, title: string, fields: Partial<SearchDocument> = {}): SearchDocument => ({
  id,
  title,
  kind: 'prompt',
  contentLocale: 'ko',
  description: '',
  path: `/ko/prompts/${id}/`,
  frame: null,
  thumb: null,
  tags: [],
  terms: '',
  model: '',
  body: '',
  ...fields,
});

export const koreanFixtureCases = [
  { query: '제품사진 스튜디오', ids: ['product'] },
  { query: '제품 사진을 스튜디오', ids: ['product'] },
  { query: '제품사진을 스튜디오', ids: ['product'] },
  { query: 'product photography studio', ids: ['product'] },
  { query: 'packshot', ids: ['product'] },
  { query: '제품 포스터를 템플릿', ids: ['template'] },
  { query: '종이', ids: ['paper'] },
  { query: '포트레이트', ids: ['family'] },
  { query: '한글', ids: ['composed', 'decomposed'] },
  { query: '한글', ids: ['composed', 'decomposed'] },
  { query: '빛', ids: ['composed', 'decomposed'] },
  { query: 'zxqvnonexistent', ids: [] },
];

export function koreanSearchFixture(buildId: string): SearchIndexFile {
  const documents = [
    document('product', '제품 사진 스튜디오'),
    document('family', '가족 인물 사진', { body: 'photography' }),
    document('unrelated', '제품 설명과 사진 전시'),
    document('paper', '종이'),
    document('template', '제품 포스터', { kind: 'template' }),
    document('composed', '한글 빛'),
    document('decomposed', '한글 빛'),
  ];
  return {
    schemaVersion: SEARCH_SCHEMA_VERSION,
    analyzerVersion: SEARCH_ANALYZER_VERSION,
    buildId,
    locale: 'ko',
    counts: { prompt: 6, template: 1, collection: 0, topic: 0 },
    popular: [],
    terms: [],
    index: JSON.parse(JSON.stringify(createIndex(documents, 'ko'))),
  };
}
