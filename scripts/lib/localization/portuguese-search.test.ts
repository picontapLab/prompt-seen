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
  fs.readFileSync(path.join(root, 'production/localization/pt-BR/search-cases.json'), 'utf8'),
).cases;
let engine: Engine;

beforeAll(() => {
  const config = loadConfig(root, { BUILD_MODE: 'preview' });
  // Exercise candidate content before enabling a production locale. All ordinary gates remain active.
  const portuguese = config.locales.find((locale) => locale.code === 'pt-BR')!;
  portuguese.preview = true;
  if (!config.builtLocales.includes(portuguese)) config.builtLocales.push(portuguese);
  const loaded = loadContent({ root, config, url: createUrlModule(urlConfigOf(config)) });
  expect(loaded.findings.blocking).toBe(0);
  const content = loaded.built!;
  const details = new Map(
    content.details
      .filter((detail) => detail.locale === 'pt-BR')
      .map((detail) => [`${detail.kind}/${detail.key}`, detail.model]),
  );
  const documents = searchDocuments({
    index: content.locales.get('pt-BR')!,
    prompt: (id) => (details.get(`prompt/${id}`) as PromptDetail | undefined) ?? null,
    template: (id) => (details.get(`template/${id}`) as TemplateDetail | undefined) ?? null,
    pages: { collections: true, topics: true },
  });
  engine = loadEngine({
    schemaVersion: SEARCH_SCHEMA_VERSION,
    analyzerVersion: SEARCH_ANALYZER_VERSION,
    buildId: 'portuguese-acceptance',
    locale: 'pt-BR',
    counts: content.manifest.counts['pt-BR']!,
    popular: [],
    terms: [],
    index: JSON.parse(JSON.stringify(createIndex(documents, 'pt-BR'))),
  });
}, 20_000);

it.each(cases)('finds the frozen Portuguese scenario: $query', ({ query, expectedKeys, excludedKeys, topK }) => {
  const results = search(engine, query, topK);
  const keys = results.groups.flatMap((group) => group.hits.map((hit) => hit.id.replace(':', '/')));
  for (const key of expectedKeys) expect(keys).toContain(key);
  for (const key of excludedKeys ?? []) expect(keys).not.toContain(key);
  if (!expectedKeys.length && !excludedKeys?.length) {
    expect(results.total).toBe(0);
    expect(keys).toEqual([]);
  }
});
