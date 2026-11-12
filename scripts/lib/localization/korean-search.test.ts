import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, expect, it } from 'vitest';
import { loadConfig } from '../../../src/config/load';
import type { PromptDetail, TemplateDetail } from '../../../src/modules/content/types';
import { searchDocuments } from '../../../src/modules/search/documents';
import { createIndex, loadEngine, search, type Engine } from '../../../src/modules/search/engine';
import { SEARCH_ANALYZER_VERSION, SEARCH_SCHEMA_VERSION } from '../../../src/modules/search/types';
import { createUrlModule, urlConfigOf } from '../../../src/modules/url/create';
import { loadContent } from '../content/load';

const root = path.resolve(import.meta.dirname, '../../..');
const cases: { query: string; expectedKeys: string[]; excludedKeys?: string[]; topK: number }[] = JSON.parse(
  fs.readFileSync(path.join(root, 'production/localization/ko/search-cases.json'), 'utf8'),
).cases;
let engine: Engine;

beforeAll(() => {
  const config = loadConfig(root, { BUILD_MODE: 'preview' });
  const loaded = loadContent({ root, config, url: createUrlModule(urlConfigOf(config)) });
  expect(loaded.findings.blocking).toBe(0);
  const content = loaded.built!;
  const details = new Map(
    content.details
      .filter((detail) => detail.locale === 'ko')
      .map((detail) => [`${detail.kind}/${detail.key}`, detail.model]),
  );
  const documents = searchDocuments({
    index: content.locales.get('ko')!,
    prompt: (id) => (details.get(`prompt/${id}`) as PromptDetail | undefined) ?? null,
    template: (id) => (details.get(`template/${id}`) as TemplateDetail | undefined) ?? null,
    pages: { collections: true, topics: true },
  });
  engine = loadEngine({
    schemaVersion: SEARCH_SCHEMA_VERSION,
    analyzerVersion: SEARCH_ANALYZER_VERSION,
    buildId: 'korean-acceptance',
    locale: 'ko',
    counts: content.manifest.counts.ko!,
    popular: [],
    terms: [],
    index: JSON.parse(JSON.stringify(createIndex(documents, 'ko'))),
  });
}, 20_000);

it.each(cases)('finds the frozen Korean scenario: $query', ({ query, expectedKeys, excludedKeys, topK }) => {
  // The product displays and limits each kind independently (§11.8.6: five per group).
  const keys = search(engine, query, topK).groups.flatMap((group) => group.hits.map((hit) => hit.id.replace(':', '/')));
  for (const key of expectedKeys) expect(keys).toContain(key);
  for (const key of excludedKeys ?? []) expect(keys).not.toContain(key);
});

it.each(['제품 사진 스튜디오', '수묵화 매화'])('keeps NFC/NFD result order: %s', (query) => {
  const ids = (value: string) => search(engine, value, 20).groups.map((group) => group.hits.map((hit) => hit.id));
  expect(ids(query.normalize('NFD'))).toEqual(ids(query));
});
