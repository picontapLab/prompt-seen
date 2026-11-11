import path from 'node:path';
import { expect, it } from 'vitest';
import { loadConfig } from '../../../src/config/load';
import type { PromptDetail, TemplateDetail } from '../../../src/modules/content/types';
import { searchDocuments } from '../../../src/modules/search/documents';
import { createIndex, loadEngine, search } from '../../../src/modules/search/engine';
import { createUrlModule, urlConfigOf } from '../../../src/modules/url/create';
import { loadContent } from '../content/load';

it('finds public prompts and templates by their stable identifiers after serializing the search index', () => {
  const root = path.resolve(import.meta.dirname, '../../..');
  const config = loadConfig(root, { BUILD_MODE: 'production' });
  const loaded = loadContent({ root, config, url: createUrlModule(urlConfigOf(config)) });
  expect(loaded.findings.blocking).toBe(0);
  const content = loaded.built!;
  const documents = searchDocuments({
    index: content.locales.get('en')!,
    prompt: (id) =>
      (content.details.find((d) => d.locale === 'en' && d.kind === 'prompt' && d.key === id)?.model as PromptDetail) ??
      null,
    template: (id) =>
      (content.details.find((d) => d.locale === 'en' && d.kind === 'template' && d.key === id)
        ?.model as TemplateDetail) ?? null,
    pages: { collections: true, topics: true },
  });
  const engine = loadEngine({
    schemaVersion: 2,
    analyzerVersion: 2,
    buildId: 'fixture',
    locale: 'en',
    counts: content.manifest.counts.en!,
    popular: [],
    terms: [],
    index: JSON.parse(JSON.stringify(createIndex(documents, 'en'))),
  });
  for (const [query, expected] of [
    ['p_111', 'prompt:p_111'],
    ['0111', 'prompt:p_111'],
    ['t_001', 'template:t_001'],
  ])
    expect(
      search(engine, query!)
        .groups.flatMap((g) => g.hits.map((h) => h.id))
        .slice(0, 5),
    ).toContain(expected);
}, 15000);
