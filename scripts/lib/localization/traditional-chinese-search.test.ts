import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../../../src/config/load';
import type { PromptDetail, TemplateDetail } from '../../../src/modules/content/types';
import { searchDocuments } from '../../../src/modules/search/documents';
import { createIndex, loadEngine, search, type Engine } from '../../../src/modules/search/engine';
import { SEARCH_ANALYZER_VERSION, SEARCH_SCHEMA_VERSION } from '../../../src/modules/search/types';
import { createUrlModule, urlConfigOf } from '../../../src/modules/url/create';
import { loadContent } from '../content/load';

const root = path.resolve(import.meta.dirname, '../../..');
const cases: {
  query: string;
  expectedKeys: string[];
  excludedKeys?: string[];
  topK: number;
  expectedTotal?: number;
}[] = JSON.parse(fs.readFileSync(path.join(root, 'production/localization/zh-Hant/search-cases.json'), 'utf8')).cases;
const available = loadConfig(root, { BUILD_MODE: 'preview' }).builtLocales.some((locale) => locale.code === 'zh-Hant');
it('explicit Traditional Chinese acceptance requires its artifact', () => {
  if (process.env.ZH_HANT_ACCEPTANCE === '1') expect(available).toBe(true);
});
describe.skipIf(!available)('published Traditional Chinese corpus', () => {
  let engine: Engine;

  beforeAll(() => {
    const config = loadConfig(root, { BUILD_MODE: 'preview' });
    const loaded = loadContent({ root, config, url: createUrlModule(urlConfigOf(config)) });
    expect(loaded.findings.blocking).toBe(0);
    const content = loaded.built!;
    const details = new Map(
      content.details
        .filter((detail) => detail.locale === 'zh-Hant')
        .map((detail) => [`${detail.kind}/${detail.key}`, detail.model]),
    );
    const documents = searchDocuments({
      index: content.locales.get('zh-Hant')!,
      prompt: (id) => (details.get(`prompt/${id}`) as PromptDetail | undefined) ?? null,
      template: (id) => (details.get(`template/${id}`) as TemplateDetail | undefined) ?? null,
      pages: { collections: true, topics: true },
    });
    engine = loadEngine({
      schemaVersion: SEARCH_SCHEMA_VERSION,
      analyzerVersion: SEARCH_ANALYZER_VERSION,
      buildId: 'traditional-chinese-acceptance',
      locale: 'zh-Hant',
      counts: content.manifest.counts['zh-Hant']!,
      popular: [],
      terms: [],
      index: JSON.parse(JSON.stringify(createIndex(documents, 'zh-Hant'))),
    });
    // Full multilingual corpus preparation can exceed 20 seconds on shared CI runners.
  }, 60_000);

  it.each(cases)(
    'finds the frozen Traditional Chinese scenario: $query',
    ({ query, expectedKeys, excludedKeys, topK, expectedTotal }) => {
      // The product displays and limits each kind independently (§11.8.6: five per group).
      const keys = search(engine, query, topK).groups.flatMap((group) =>
        group.hits.map((hit) => hit.id.replaceAll(':', '/')),
      );
      for (const key of expectedKeys) expect(keys).toContain(key);
      const all = search(engine, query, Number.MAX_SAFE_INTEGER);
      const allKeys = all.groups.flatMap((group) => group.hits.map((hit) => hit.id.replaceAll(':', '/')));
      for (const key of excludedKeys ?? []) expect(allKeys).not.toContain(key);
      if (expectedTotal !== undefined) expect(all.total).toBe(expectedTotal);
    },
  );
});
