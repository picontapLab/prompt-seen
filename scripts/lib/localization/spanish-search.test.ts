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

it('finds frozen Spanish queries for current targets; enabled Spanish requires the entire frozen set', () => {
  const root = path.resolve(import.meta.dirname, '../../..');
  const cases: LocalizationSearchCase[] = JSON.parse(
    fs.readFileSync(path.join(root, 'production/localization/es/search-cases.json'), 'utf8'),
  ).cases;
  const config = loadConfig(root, { BUILD_MODE: 'preview' });
  const loaded = loadContent({ root, config, url: createUrlModule(urlConfigOf(config)) });
  expect(loaded.findings.blocking).toBe(0);
  const content = loaded.built!;
  const index = content.locales.get('es')!;
  expect(index).toBeDefined();
  const details = new Map(
    content.details
      .filter((detail) => detail.locale === 'es')
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
    buildId: 'spanish-acceptance',
    locale: 'es',
    counts: content.manifest.counts.es!,
    popular: [],
    terms: [],
    index: JSON.parse(JSON.stringify(createIndex(documents, 'es'))),
  });
  const readyCases = cases.filter((example) =>
    example.expectedKeys.every((key) => searchRecord(index, key)?.localization.localStatus === 'current'),
  );
  expect(readyCases.length).toBeGreaterThan(0);
  if (config.locales.find((locale) => locale.code === 'es')!.enabled) expect(readyCases).toHaveLength(cases.length);
  for (const { query, expectedKeys, excludedKeys, topK } of readyCases) {
    const keys = search(engine, query, topK).groups.flatMap((group) =>
      group.hits.map((hit) => hit.id.replaceAll(':', '/')),
    );
    for (const key of expectedKeys) expect.soft(keys, query).toContain(key);
    for (const key of excludedKeys ?? []) expect.soft(keys, query).not.toContain(key);
  }
}, 30_000);
