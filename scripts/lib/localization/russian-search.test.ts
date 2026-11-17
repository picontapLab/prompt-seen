import path from 'node:path';
import { beforeAll, expect, it } from 'vitest';
import { loadConfig } from '../../../src/config/load';
import type { PromptDetail, TemplateDetail } from '../../../src/modules/content/types';
import { searchDocuments, suggestTerms } from '../../../src/modules/search/documents';
import { createIndex, loadEngine, search, type Engine } from '../../../src/modules/search/engine';
import { SEARCH_ANALYZER_VERSION, SEARCH_SCHEMA_VERSION } from '../../../src/modules/search/types';
import { createUrlModule, urlConfigOf } from '../../../src/modules/url/create';
import { loadContent } from '../content/load';
import { russianRankingCases } from '../../../tests/support/russian-corpus';

const root = path.resolve(import.meta.dirname, '../../..');
const cases = russianRankingCases;
let engine: Engine;
let documentCount = 0;

beforeAll(() => {
  const config = loadConfig(root, { BUILD_MODE: 'preview' });
  const loaded = loadContent({ root, config, url: createUrlModule(urlConfigOf(config)) });
  expect(loaded.findings.blocking).toBe(0);
  const content = loaded.built!;
  const details = new Map(
    content.details
      .filter((detail) => detail.locale === 'ru')
      .map((detail) => [`${detail.kind}/${detail.key}`, detail.model]),
  );
  const documents = searchDocuments({
    index: content.locales.get('ru')!,
    prompt: (id) => (details.get(`prompt/${id}`) as PromptDetail | undefined) ?? null,
    template: (id) => (details.get(`template/${id}`) as TemplateDetail | undefined) ?? null,
    pages: { collections: true, topics: true },
  });
  documentCount = documents.length;
  engine = loadEngine({
    schemaVersion: SEARCH_SCHEMA_VERSION,
    analyzerVersion: SEARCH_ANALYZER_VERSION,
    buildId: 'russian-acceptance',
    locale: 'ru',
    counts: content.manifest.counts.ru!,
    popular: [],
    terms: suggestTerms(content.locales.get('ru')!),
    index: JSON.parse(JSON.stringify(createIndex(documents, 'ru'))),
  });
  // Full multilingual corpus preparation can exceed 20 seconds on shared CI runners.
}, 60_000);

it.each(cases)(
  'finds the frozen Russian scenario: $query',
  ({ query, expectedKeys, excludedKeys, topK, expectedTotal }) => {
    // The product displays and limits each kind independently (§11.8.6: five per group).
    const keys = search(engine, query, topK).groups.flatMap((group) =>
      group.hits.map((hit) => hit.id.replaceAll(':', '/')),
    );
    for (const key of expectedKeys) expect(keys).toContain(key);
    const all = search(engine, query, documentCount);
    const allKeys = all.groups.flatMap((group) => group.hits.map((hit) => hit.id.replaceAll(':', '/')));
    for (const key of excludedKeys ?? []) expect(allKeys).not.toContain(key);
    if (expectedTotal !== undefined) expect(all.total).toBe(expectedTotal);
    if (expectedTotal === undefined && !expectedKeys.length && !excludedKeys?.length) expect(all.total).toBe(0);
  },
);
