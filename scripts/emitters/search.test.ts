import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/load';
import type { PromptDetail, TemplateDetail } from '../../src/modules/content/types';
import { popularUseCases, searchDocuments, suggestTerms } from '../../src/modules/search/documents';
import { createIndex, loadEngine, search } from '../../src/modules/search/engine';
import type { SearchIndexFile } from '../../src/modules/search/types';
import { createUrlModule } from '../../src/modules/url/create';
import { loadContent } from '../lib/content/load';
import { ROOT } from '../lib/paths';

// The index over the repository's content (design doc §13, §16.3 搜索样本): typical
// queries per language find their entry, drafts stay out of production indexes, and kinds
// without pages in this build are left out.

function build(mode: 'production' | 'preview') {
  const config = loadConfig(ROOT, { BUILD_MODE: mode, BASE_PATH: '/prompt-seen', SITE_ORIGIN: 'https://example.com' });
  const url = createUrlModule({
    origin: config.origin,
    basePath: config.basePath,
    urlPattern: config.urlPattern,
    localePrefixes: config.locales.map((l) => l.pathPrefix),
  });
  const { built } = loadContent({ root: ROOT, config, url });
  if (!built) throw new Error('the sample content must build');
  const details = new Map(built.details.map((d) => [`${d.locale}/${d.kind}/${d.key}`, d.model]));
  const engine = (code: string, pages = { collections: false, topics: false }) => {
    const index = built.locales.get(code)!;
    const docs = searchDocuments({
      index,
      prompt: (id) => (details.get(`${code}/prompt/${id}`) as PromptDetail | undefined) ?? null,
      template: (id) => (details.get(`${code}/template/${id}`) as TemplateDetail | undefined) ?? null,
      pages,
    });
    const file: SearchIndexFile = {
      buildId: config.buildId,
      locale: code,
      counts: { prompt: 0, template: 0, collection: 0, topic: 0 },
      popular: popularUseCases(index),
      terms: suggestTerms(index),
      index: JSON.parse(JSON.stringify(createIndex(docs, code))),
    };
    return { engine: loadEngine(file), docs, index };
  };
  return { built, engine };
}

const production = build('production');
const preview = build('preview');

const titles = (code: string, q: string, b = production) =>
  search(b.engine(code).engine, q).groups.flatMap((g) => g.hits.map((h) => h.title));

describe('typical queries (§16.3)', () => {
  it('find entries by title in every language', () => {
    expect(titles('en', 'neon portrait')).toContain('Neon portrait wallpaper');
    expect(titles('zh-Hans', '霓虹肖像')).toContain('霓虹肖像手机壁纸');
    expect(titles('zh-Hans', '水墨')).toContain('水墨梅枝');
    expect(titles('ja', 'ポスター', preview)).toContain('夕日の旅行ポスター');
  });

  it('find entries by English words and model names in other languages (mixed text)', () => {
    // Query one loaded index, as the application does; rebuilding it for all six
    // assertions made this corpus-sized test exceed CI's five-second limit.
    const { engine, docs } = production.engine('zh-Hans');
    const matches = (q: string) => search(engine, q).groups.flatMap((g) => g.hits.map((h) => h.title));
    expect(matches('neon').length).toBeGreaterThan(0);
    expect(matches('neon 肖像')).toContain('霓虹肖像手机壁纸');
    expect(matches('GPT Image').length).toBeGreaterThan(0);
    expect(
      docs
        .filter((d) => d.kind === 'prompt' && Number(d.id.split('_').at(-1)) <= 100)
        .every((d) => d.model === (d.id === 'prompt:p_024' ? '' : 'GPT Image 2.5')),
    ).toBe(true);
    const top50 = docs.filter(
      (d) => d.kind === 'prompt' && Number(d.id.split('_').at(-1)) >= 101 && Number(d.id.split('_').at(-1)) <= 150,
    );
    expect(top50).toHaveLength(50);
    expect(top50.every((d) => d.model === 'GPT Image 2.5')).toBe(true);
    const latest = docs.filter(
      (d) => d.kind === 'prompt' && Number(d.id.split('_').at(-1)) >= 209 && Number(d.id.split('_').at(-1)) <= 235,
    );
    expect(latest).toHaveLength(27);
    expect(latest.every((d) => d.model === 'GPT Image 2.6')).toBe(true);
  });

  it('find entries through taxonomy aliases (§13.2)', () => {
    const viaAlias = titles('en', 'sumi-e');
    expect(viaAlias.length).toBeGreaterThan(0);
    expect(viaAlias).toEqual(expect.arrayContaining(titles('en', 'ink wash').slice(0, 1)));
    expect(titles('zh-Hans', '国画').length).toBeGreaterThan(0);
  });
});

describe('what goes into an index', () => {
  it('only entries this build shows: no drafts in production', () => {
    for (const [code, index] of production.built.locales) {
      const { docs } = production.engine(code);
      expect(docs.filter((d) => d.kind === 'prompt')).toHaveLength(index.prompts.length);
      expect(index.prompts.every((p) => p.visibility === 'published')).toBe(true);
    }
    const enabled = loadConfig(ROOT, { BUILD_MODE: 'production' }).locales.filter((locale) => locale.enabled);
    expect([...production.built.locales.keys()].sort()).toEqual(enabled.map((locale) => locale.code).sort());
  });

  it('collections and topics only when their pages exist', () => {
    const without = production.engine('en').docs;
    expect(without.some((d) => d.kind === 'collection' || d.kind === 'topic')).toBe(false);
    const withPages = production.engine('en', { collections: true, topics: true }).docs;
    expect(withPages.some((d) => d.kind === 'collection')).toBe(true);
    expect(withPages.some((d) => d.kind === 'topic')).toBe(true);
  });

  it('offers the most used use cases as popular', () => {
    const popular = popularUseCases(production.built.locales.get('en')!);
    expect(popular.length).toBeGreaterThan(0);
    expect(popular.map((p) => p.count)).toEqual([...popular.map((p) => p.count)].sort((a, b) => b - a));
  });
});
