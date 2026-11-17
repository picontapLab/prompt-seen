import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, expect, it } from 'vitest';
import { loadConfig } from '../../../src/config/load';
import type { PromptDetail, TemplateDetail } from '../../../src/modules/content/types';
import { searchDocuments, suggestTerms } from '../../../src/modules/search/documents';
import { createIndex, loadEngine, noResultHelp, search, type Engine } from '../../../src/modules/search/engine';
import { SEARCH_ANALYZER_VERSION, SEARCH_SCHEMA_VERSION } from '../../../src/modules/search/types';
import { createUrlModule, urlConfigOf } from '../../../src/modules/url/create';
import { loadContent } from '../content/load';

const root = path.resolve(import.meta.dirname, '../../..');
const cases: { query: string; expectedKeys: string[]; excludedKeys?: string[]; topK: number }[] = JSON.parse(
  fs.readFileSync(path.join(root, 'production/localization/it/search-cases.json'), 'utf8'),
).cases;
let engine: Engine;
let documentCount = 0;

beforeAll(() => {
  const config = loadConfig(root, { BUILD_MODE: 'preview' });
  const loaded = loadContent({ root, config, url: createUrlModule(urlConfigOf(config)) });
  expect(loaded.findings.blocking).toBe(0);
  const content = loaded.built!;
  const details = new Map(
    content.details
      .filter((detail) => detail.locale === 'it')
      .map((detail) => [`${detail.kind}/${detail.key}`, detail.model]),
  );
  const documents = searchDocuments({
    index: content.locales.get('it')!,
    prompt: (id) => (details.get(`prompt/${id}`) as PromptDetail | undefined) ?? null,
    template: (id) => (details.get(`template/${id}`) as TemplateDetail | undefined) ?? null,
    pages: { collections: true, topics: true },
  });
  documentCount = documents.length;
  engine = loadEngine({
    schemaVersion: SEARCH_SCHEMA_VERSION,
    analyzerVersion: SEARCH_ANALYZER_VERSION,
    buildId: 'italian-acceptance',
    locale: 'it',
    counts: content.manifest.counts.de!,
    popular: [],
    terms: suggestTerms(content.locales.get('it')!),
    index: JSON.parse(JSON.stringify(createIndex(documents, 'it'))),
  });
  // Full multilingual corpus preparation can exceed 20 seconds on shared CI runners.
}, 60_000);

it.each(cases)('finds the frozen Italian scenario: $query', ({ query, expectedKeys, excludedKeys, topK }) => {
  // The product displays and limits each kind independently (§11.8.6: five per group).
  const keys = search(engine, query, topK).groups.flatMap((group) =>
    group.hits.map((hit) => hit.id.replaceAll(':', '/')),
  );
  for (const key of expectedKeys) expect(keys).toContain(key);
  const all = search(engine, query, documentCount);
  const allKeys = all.groups.flatMap((group) => group.hits.map((hit) => hit.id.replaceAll(':', '/')));
  for (const key of excludedKeys ?? []) expect(allKeys).not.toContain(key);
  if (!expectedKeys.length && !excludedKeys?.length) expect(all.total).toBe(0);
});

it('offers an actual Italian taxonomy label for a nearby spelling', () => {
  const help = noResultHelp(engine, [], 'ritrat');
  expect(help.terms.some((term) => term.label.toLocaleLowerCase('it') === 'ritratto' && term.total > 0)).toBe(true);
});
