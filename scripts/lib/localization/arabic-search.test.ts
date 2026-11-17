import fs from 'node:fs';
import { searchRecord, type LocalizationSearchCase } from '../../../tests/support/localization-search';
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
const cases: LocalizationSearchCase[] = JSON.parse(
  fs.readFileSync(path.join(root, 'production/localization/ar/search-cases.json'), 'utf8'),
).cases;
let engine: Engine;

beforeAll(() => {
  expect(
    new Set(cases.map((entry) => entry.query)).size,
    'Arabic acceptance requires at least 30 distinct frozen search scenarios',
  ).toBeGreaterThanOrEqual(30);
  const config = loadConfig(root, { BUILD_MODE: 'preview' });
  const loaded = loadContent({ root, config, url: createUrlModule(urlConfigOf(config)) });
  expect(loaded.findings.blocking).toBe(0);
  const content = loaded.built!;
  for (const entry of cases)
    for (const key of entry.expectedKeys)
      expect(searchRecord(content.locales.get('ar')!, key)?.localization.localStatus, key).toBe('current');
  const details = new Map(
    content.details
      .filter((detail) => detail.locale === 'ar')
      .map((detail) => [`${detail.kind}/${detail.key}`, detail.model]),
  );
  const documents = searchDocuments({
    index: content.locales.get('ar')!,
    prompt: (id) => (details.get(`prompt/${id}`) as PromptDetail | undefined) ?? null,
    template: (id) => (details.get(`template/${id}`) as TemplateDetail | undefined) ?? null,
    pages: { collections: true, topics: true },
  });
  engine = loadEngine({
    schemaVersion: SEARCH_SCHEMA_VERSION,
    analyzerVersion: SEARCH_ANALYZER_VERSION,
    buildId: 'arabic-acceptance',
    locale: 'ar',
    counts: content.manifest.counts.de!,
    popular: [],
    terms: [],
    index: JSON.parse(JSON.stringify(createIndex(documents, 'ar'))),
  });
  // Full multilingual corpus preparation can exceed 20 seconds on shared CI runners.
}, 60_000);

it.each(cases)(
  'finds the frozen Arabic scenario: $query',
  ({ query, expectedKeys, excludedKeys, expectedTotal, topK }) => {
    // The product displays and limits each kind independently (§11.8.6: five per group).
    const result = search(engine, query, topK);
    if (expectedTotal !== undefined) expect(result.total).toBe(expectedTotal);
    const keys = result.groups.flatMap((group) => group.hits.map((hit) => hit.id.replaceAll(':', '/')));
    for (const key of expectedKeys) expect(keys).toContain(key);
    for (const key of excludedKeys ?? []) expect(keys).not.toContain(key);
  },
);

it('Arabic and Persian digits preserve full model-query ordering', () => {
  const keys = (query: string) =>
    search(engine, query, 1000).groups.map((group) => [group.kind, group.hits.map((hit) => hit.id)]);
  expect(keys('GPT Image ٢.٦')).toEqual(keys('GPT Image 2.6'));
  expect(keys('GPT Image ۲.۶')).toEqual(keys('GPT Image 2.6'));
});
