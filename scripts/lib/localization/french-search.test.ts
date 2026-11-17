import fs from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import { loadConfig } from '../../../src/config/load';
import type { PromptDetail, TemplateDetail } from '../../../src/modules/content/types';
import { searchDocuments } from '../../../src/modules/search/documents';
import { createIndex, loadEngine, search } from '../../../src/modules/search/engine';
import { SEARCH_ANALYZER_VERSION, SEARCH_SCHEMA_VERSION } from '../../../src/modules/search/types';
import { createUrlModule, urlConfigOf } from '../../../src/modules/url/create';
import { searchRecord, type LocalizationSearchCase } from '../../../tests/support/localization-search';
import { loadContent } from '../content/load';

it('finds every frozen French query in the serialized and reloaded full corpus', () => {
  const root = path.resolve(import.meta.dirname, '../../..');
  const cases: LocalizationSearchCase[] = JSON.parse(
    fs.readFileSync(path.join(root, 'production/localization/fr/search-cases.json'), 'utf8'),
  ).cases;
  const config = loadConfig(root, { BUILD_MODE: 'preview' });
  const loaded = loadContent({ root, config, url: createUrlModule(urlConfigOf(config)) });
  expect(loaded.findings.blocking).toBe(0);
  const content = loaded.built!;
  const index = content.locales.get('fr')!;
  expect(index).toBeDefined();
  const details = new Map(
    content.details
      .filter((detail) => detail.locale === 'fr')
      .map((detail) => [`${detail.kind}/${detail.key}`, detail.model]),
  );
  const documents = searchDocuments({
    index,
    prompt: (id) => (details.get(`prompt/${id}`) as PromptDetail | undefined) ?? null,
    template: (id) => (details.get(`template/${id}`) as TemplateDetail | undefined) ?? null,
    pages: { collections: true, topics: true },
  });
  const engine = loadEngine({
    schemaVersion: SEARCH_SCHEMA_VERSION,
    analyzerVersion: SEARCH_ANALYZER_VERSION,
    buildId: 'french-acceptance',
    locale: 'fr',
    counts: content.manifest.counts.fr!,
    popular: [],
    terms: [],
    index: JSON.parse(JSON.stringify(createIndex(documents, 'fr'))),
  });
  const readyCases = cases.filter((example) =>
    example.expectedKeys.every((key) => searchRecord(index, key)?.localization.localStatus === 'current'),
  );
  expect(readyCases).toHaveLength(cases.length);
  expect(cases.length).toBeGreaterThanOrEqual(24);
  for (const { query, expectedKeys, excludedKeys, topK, expectedTotal } of cases) {
    const results = search(engine, query);
    const top = results.groups.flatMap((group) => group.hits.slice(0, topK).map((hit) => hit.id.replaceAll(':', '/')));
    const all = results.groups.flatMap((group) => group.hits.map((hit) => hit.id.replaceAll(':', '/')));
    for (const key of expectedKeys) expect.soft(top, query).toContain(key);
    for (const key of excludedKeys ?? []) expect.soft(all, query).not.toContain(key);
    if (expectedTotal !== undefined) expect.soft(results.total, query).toBe(expectedTotal);
  }
}, 60_000);
