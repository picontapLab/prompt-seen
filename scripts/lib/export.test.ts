import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import photoCampaign from '../../production/everyday-photo-edit-v1/campaign.json';
import { config } from '../../src/config';
import { catalogTranslator } from '../../src/i18n/translator';
import { composeFeed, type ComposedFeed } from '../../src/modules/feed/compose';
import { createGeoDocuments, type GeoSources } from '../../src/modules/geo/documents';
import { localeSitemapUrls } from '../../src/modules/seo/sitemaps';
import { createUrlModule } from '../../src/modules/url/create';
import { pageSections } from '../../src/ui/navigation/sections';
import { aspectRatioLabel, buildIndex } from './content/build-index';
import { loadContent } from './content/load';
import { builtReader, exportJson, EXPORT_VERSION } from './export';
import { analyzeLocale } from './localization/check';
import { ROOT } from './paths';

// Machine-readable documents and exports (design doc §9.10.4, §14.1) over the repository's sample
// content in a production build. External outputs only include indexable local versions.

const url = createUrlModule({
  origin: config.origin,
  basePath: config.basePath,
  urlPattern: config.urlPattern,
  localePrefixes: config.locales.map((l) => l.pathPrefix),
});
const { built, content, localization, findings } = loadContent({ root: ROOT, config, url });
if (!built) throw new Error('the sample content must build');

const sources: GeoSources = {
  buildMode: config.buildMode,
  siteName: config.siteName,
  defaultLocale: config.defaultLocale,
  locales: config.builtLocales,
  reader: builtReader(built),
  url,
  absoluteImageUrl: (v) => url.absoluteUrl(url.paths.media(v.key)),
  translator: (code) => catalogTranslator(ROOT, code),
  sections: { prompts: true, templates: false, collections: false, topics: false, pages: false },
};
const geo = createGeoDocuments(sources);
const visible = (code: string) => built.locales.get(code)!;

// The sitemap uses the app's server modules. Supply one in-memory build in place of the
// generated files so that a fixture cannot read stale content from a previous build.
let sitemapReader = sources.reader;
const sitemapFeeds = new Map<string, ComposedFeed>();
vi.mock('@/config', async () => {
  const { loadConfig } = await import('../../src/config/load');
  const { ROOT } = await import('./paths');
  const config = loadConfig(ROOT, {
    BUILD_MODE: 'production',
    BASE_PATH: '/prompt-seen',
    SITE_ORIGIN: 'https://example.com',
  });
  return { config, builtLocales: config.builtLocales };
});
vi.mock('@/modules/content', () => ({
  localeIndex: (...args: Parameters<typeof sitemapReader.localeIndex>) => sitemapReader.localeIndex(...args),
  getDetailModel: (...args: Parameters<typeof sitemapReader.getDetailModel>) => sitemapReader.getDetailModel(...args),
}));
vi.mock('@/modules/feed', () => ({
  feedIndex: (code: string) => sitemapFeeds.get(code)!.index,
  feedPage: (code: string, page: number) => sitemapFeeds.get(code)!.pages[page - 1],
  feedBand: (code: string) => sitemapFeeds.get(code)!.band,
}));

describe('Simplified Chinese discovery', () => {
  const code = 'zh-Hans';
  const zh = config.builtLocales.find((entry) => entry.code === code)!;
  const en = config.builtLocales.find((entry) => entry.code === 'en')!;
  const report = localization.find((entry) => entry.locale === code)!;
  const buildDate = '2026-11-20';

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(buildDate));
  });
  afterEach(() => {
    vi.useRealTimers();
    sitemapReader = sources.reader;
    sitemapFeeds.clear();
  });

  it('keeps the 24 reviewed entrance dependencies indexable', () => {
    const keys = [
      'p_007',
      'p_013',
      'p_019',
      'p_026',
      'p_034',
      'p_044',
      'p_048',
      'p_053',
      'p_058',
      'p_064',
      'p_066',
      'p_070',
      'p_075',
      'p_080',
      'p_084',
      'p_088',
      'p_097',
      'p_099',
      'p_123',
      'p_153',
      'p_218',
      't_001',
      't_003',
      't_017',
    ].map((id) => `${id.startsWith('p_') ? 'prompt' : 'template'}/${id}`);
    const items = new Map(report.items.map((item) => [item.key, item]));
    for (const key of keys) {
      expect(items.get(key), key).toMatchObject({ localStatus: 'current', indexable: true });
    }
  });

  it.each(['current', 'missing', 'draft', 'outdated'] as const)(
    'applies the %s p_123 translation to the sitemap, Markdown, directory and dataset',
    (status) => {
      const current = status === 'current';
      const prompt = content.prompts.get('p_123')!;
      const locales = new Map(prompt.locales);
      const original = locales.get(code)!;
      if (status === 'missing') locales.delete(code);
      if (status === 'draft') locales.set(code, { ...original, fm: { ...original.fm, status: 'draft' } });
      if (status === 'outdated') {
        const translation = { ...original.fm.translation!, sourceHash: 'sha256:0000000000000000' };
        locales.set(code, { ...original, fm: { ...original.fm, translation } });
      }
      const prompts = new Map(content.prompts).set('p_123', { ...prompt, locales });
      const fixture = { ...content, prompts };
      const zhReport = analyzeLocale({ root: ROOT, config, content: fixture, findings }, code);
      expect(zhReport.items.find((item) => item.key === 'prompt/p_123')).toMatchObject({
        localStatus: status,
        indexable: current,
      });
      const statuses = new Map(
        localization.map((entry) => [
          entry.locale,
          new Map((entry.locale === code ? zhReport : entry).items.map((item) => [item.key, item.localStatus])),
        ]),
      );
      const reader = builtReader(buildIndex(fixture, config, url, statuses));
      const sections = pageSections();
      const documents = createGeoDocuments({ ...sources, reader, sections });
      sitemapReader = reader;
      const detail = reader.getDetailModel('prompt', 'p_123', code)!;
      for (const locale of [zh, en]) {
        sitemapFeeds.set(
          locale.code,
          composeFeed({
            ...reader.localeIndex(locale.code),
            buildId: config.buildId,
            today: buildDate,
            promptDetail: (id) => reader.getDetailModel('prompt', id, locale.code),
            templateDetail: (id) => reader.getDetailModel('template', id, locale.code),
            collectionsLinked: sections.collections,
            settings: config.feed,
            ratioLabel: aspectRatioLabel,
          }),
        );
      }
      const zhUrls = new Set(localeSitemapUrls(zh, sections).map((entry) => entry.loc));
      const dependentPaths = [
        detail.path,
        url.paths.home(zh.pathPrefix),
        url.paths.promptsPage(zh.pathPrefix, 1),
        url.paths.collections(zh.pathPrefix),
        ...['c_003', 'c_005'].map((id) => reader.getDetailModel('collection', id, code)!.path),
      ];
      for (const path of dependentPaths) expect(zhUrls.has(url.absoluteUrl(path)), path).toBe(current);
      if (current) {
        const pages = sitemapFeeds.get(code)!.pages;
        expect(pages.length).toBeGreaterThanOrEqual(14);
        const restoredPaths = [
          ...pages.map(({ page }) => url.paths.promptsPage(zh.pathPrefix, page)),
          url.paths.templates(zh.pathPrefix),
          ...['c_001', 'c_002', 'c_008', 'c_009'].map((id) => reader.getDetailModel('collection', id, code)!.path),
        ];
        for (const path of restoredPaths) expect(zhUrls.has(url.absoluteUrl(path)), path).toBe(true);
      }

      const english = reader.getDetailModel('prompt', 'p_123', en.code)!;
      expect(localeSitemapUrls(en, sections).map((entry) => entry.loc)).toContain(url.absoluteUrl(english.path));
      for (const locale of [zh, en]) {
        const listed = locale === en || current;
        const markdownUrl = url.absoluteUrl(url.paths.promptMarkdown(locale.pathPrefix, prompt.data.slug));
        expect(Boolean(documents.markdown({ kind: 'prompt', locale, id: 'p_123' }))).toBe(listed);
        expect(documents.llms(locale.code).includes(markdownUrl)).toBe(listed);
        const data = exportJson({ ...sources, reader }, config.buildId, locale, ['prompt']);
        expect(data.prompts.some((entry) => entry.id === 'p_123')).toBe(listed);
      }
    },
    30_000,
  );
});

describe('Markdown versions', () => {
  it('exist for published versions in public locales only', () => {
    const entries = geo.markdownEntries('prompt');
    expect(new Set(entries.map((e) => e.locale.code))).toEqual(
      new Set(config.builtLocales.filter((l) => l.enabled).map((l) => l.code)),
    );
    const drafts = visible('en').prompts.filter((p) => p.visibility === 'draft');
    for (const d of drafts) expect(entries.some((e) => e.id === d.id && e.locale.code === 'en')).toBe(false);
    for (const { code } of config.builtLocales.filter((locale) => !locale.enabled)) {
      const shown = visible(code)?.prompts ?? [];
      expect(shown.length).toBeGreaterThan(0);
      expect(
        geo.markdown({ kind: 'prompt', locale: config.builtLocales.find((l) => l.code === code)!, id: shown[0]!.id }),
      ).toBeNull();
    }
  });

  it('say what the page says: title, summary, the full prompt and the page address', () => {
    const entry = geo.markdownEntries('prompt').find((e) => e.locale.code === 'zh-Hans')!;
    const detail = sources.reader.getDetailModel('prompt', entry.id, 'zh-Hans')!;
    const md = geo.markdown(entry)!;
    expect(md.startsWith(`# ${detail.title}\n\n${detail.description}\n\n`)).toBe(true);
    expect(md).toContain(`\`\`\`text\n${detail.prompt.text}\n\`\`\``);
    expect(md).toContain(`网页：<${url.absoluteUrl(detail.path)}>`);
    expect(md).toContain('## 测试记录');
  });

  it('link other languages only where that version is public', () => {
    for (const entry of geo.markdownEntries('prompt')) {
      const md = geo.markdown(entry)!;
      for (const locale of config.builtLocales.filter((locale) => !locale.enabled))
        expect(md).not.toContain(`/${locale.pathPrefix}/prompts/`);
    }
    // Traverse every published prompt across all enabled locales, not a small fixture.
  }, 20_000);
});

describe('llms.txt', () => {
  it('lists published Markdown versions of the default locale and no drafts', () => {
    const text = geo.llms();
    expect(text.startsWith(`# ${config.siteName}\n\n> `)).toBe(true);
    const en = visible('en');
    for (const p of en.prompts) {
      const line = url.absoluteUrl(url.paths.promptMarkdown('en', p.slug));
      expect(text.includes(line)).toBe(p.localization.indexable);
    }
    for (const locale of config.builtLocales.filter((locale) => locale.code !== config.defaultLocale))
      for (const prompt of visible(locale.code).prompts)
        expect(text).not.toContain(url.absoluteUrl(url.paths.promptMarkdown(locale.pathPrefix, prompt.slug)));
    expect(text).toContain(url.absoluteUrl(url.paths.sitemapIndex()));
  });
});

describe('content:export JSON', () => {
  it('exports the resolved body language and localized template output in one current format', () => {
    for (const code of ['en', 'zh-Hans']) {
      const locale = config.builtLocales.find((l) => l.code === code)!;
      const data = exportJson(sources, config.buildId, locale, ['prompt', 'template']);
      expect(data.version).toBe(2);
      const prompt = data.prompts.find((p) => p.kind === 'prompt' && p.prompt.language === code)!;
      expect(prompt.kind === 'prompt' && prompt.prompt).toEqual({
        text: sources.reader.getDetailModel('prompt', prompt.id, code)!.prompt.text,
        language: code,
      });
      const template = data.templates.find((t) => t.kind === 'template' && t.promptLanguage === code)!;
      expect(template.kind === 'template' && template.promptLanguage).toBe(code);
      expect(template.kind === 'template' && template.defaultPrompt).toBe(
        sources.reader.getDetailModel('template', template.id, code)!.version.defaultPrompt,
      );
    }
  });

  it('carries a format version, licences and only published records', () => {
    const locale = config.builtLocales.find((l) => l.code === 'en')!;
    const data = exportJson(sources, config.buildId, locale, ['prompt', 'template']);
    expect(data).toMatchObject({ format: 'prompt-seen/content-export', version: EXPORT_VERSION, locale: 'en' });
    const published = visible('en').prompts.filter((p) => p.localization.indexable);
    expect(data.prompts.map((p) => p.id).sort()).toEqual(published.map((p) => p.id).sort());
    const record = data.prompts.find((p) => p.kind === 'prompt' && p.source.license)!;
    expect(record).toMatchObject({ markdownUrl: expect.stringMatching(/\/index\.md$/) });
    expect(record.kind === 'prompt' && record.source.licenseUrl).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(data.templates.length).toBeGreaterThan(0);
  });

  it('exports the documented model and original assets for every public case', () => {
    const familyOnlyRuns = new Set(['x_499', ...photoCampaign.cases.flatMap((item) => item.acceptedExampleIds)]);
    for (const locale of config.builtLocales.filter((entry) => entry.enabled)) {
      const data = exportJson(sources, config.buildId, locale, ['prompt']);
      for (const record of data.prompts) {
        if (record.kind !== 'prompt') continue;
        const f = record.facts!;
        expect(f, `${locale.code}/${record.id}`).toBeDefined();
        if (familyOnlyRuns.has(f.exampleRunId)) expect(f.model.displayName).toBe('GPT Image');
        else expect(f.model.displayName).toMatch(/^GPT Image 2\.[56]$/);
        expect(f.referenceAssetIds).toEqual(f.references.map(({ assetId }) => assetId));
        expect(f.outputAssetIds).toEqual(f.outputs.map(({ assetId }) => assetId));
        expect(f.outputs.length).toBeGreaterThan(0);
        for (const output of f.outputs.filter((image) => image.mimeType === 'image/gif')) {
          expect(f.model.displayName).toBe('GPT Image 2.6');
          expect(output.animation?.frameCount).toBeGreaterThan(1);
        }
        if (f.matchingRunIds.length) {
          expect(f.matchingRunIds).toContain(f.exampleRunId);
          expect(f.examplePrompt.text).toBe(record.prompt.text);
          expect(f.examplePrompt.language).toBe(record.prompt.language);
        }
      }
    }
  });

  it.each([
    ['p_024', 'zh-Hans', 'x_499', 'en', 'GPT Image', 'zh-Hans'],
    ['p_217', 'en', 'x_281', 'zh-Hans', 'GPT Image 2.6', 'en'],
  ])('keeps %s translated copy and generation evidence separate in %s', (id, code, run, source, model, copyLocale) => {
    const locale = config.builtLocales.find((l) => l.code === code)!;
    const data = exportJson(sources, config.buildId, locale, ['prompt']);
    const record = data.prompts.find((p) => p.kind === 'prompt' && p.id === id);
    expect(record).toMatchObject({
      prompt: { language: copyLocale },
      facts: {
        matchingRunIds: [],
        exampleRunId: run,
        examplePrompt: { language: source },
        model: { displayName: model },
      },
    });
  });
});

it('excludes every external output in preview, including enabled languages', () => {
  const preview = { ...sources, buildMode: 'preview' as const };
  const documents = createGeoDocuments(preview);
  expect(documents.llms()).toBe('');
  expect(documents.markdownEntries('prompt')).toEqual([]);
  expect(exportJson(preview, config.buildId, config.builtLocales[0]!, ['prompt']).prompts).toEqual([]);
});
