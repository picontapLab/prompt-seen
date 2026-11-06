import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/load';
import { catalogTranslator } from '../../src/i18n/translator';
import { createGeoDocuments, type GeoSources } from '../../src/modules/geo/documents';
import { createUrlModule } from '../../src/modules/url/create';
import { loadContent } from './content/load';
import { builtReader, exportJson, EXPORT_VERSION } from './export';
import { ROOT } from './paths';

// Machine-readable documents and exports (design doc §9.10.4, §14.1) over the repository's sample
// content in a preview build: it has drafts and preview-only locales (ja, ar), which must never
// get a Markdown version, an llms.txt line or an export record.

const config = loadConfig(ROOT, {
  BUILD_MODE: 'preview',
  BASE_PATH: '/prompt-seen',
  SITE_ORIGIN: 'https://example.com',
});
const url = createUrlModule({
  origin: config.origin,
  basePath: config.basePath,
  urlPattern: config.urlPattern,
  localePrefixes: config.locales.map((l) => l.pathPrefix),
});
const { built } = loadContent({ root: ROOT, config, url });
if (!built) throw new Error('the sample content must build');

const sources: GeoSources = {
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

describe('Markdown versions', () => {
  it('exist for published versions in public locales only', () => {
    const entries = geo.markdownEntries('prompt');
    expect(new Set(entries.map((e) => e.locale.code))).toEqual(
      new Set(config.builtLocales.filter((l) => l.enabled).map((l) => l.code)),
    );
    const drafts = visible('en').prompts.filter((p) => p.visibility === 'draft');
    expect(drafts.length).toBeGreaterThan(0);
    for (const d of drafts) expect(entries.some((e) => e.id === d.id && e.locale.code === 'en')).toBe(false);
    for (const code of ['ja', 'ar']) {
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
      expect(md).not.toMatch(/\/(ja|ar)\/prompts\//);
    }
  });
});

describe('llms.txt', () => {
  it('lists published Markdown versions of the default locale and no drafts', () => {
    const text = geo.llms();
    expect(text.startsWith(`# ${config.siteName}\n\n> `)).toBe(true);
    const en = visible('en');
    for (const p of en.prompts) {
      const line = url.absoluteUrl(url.paths.promptMarkdown('en', p.slug));
      expect(text.includes(line)).toBe(p.visibility === 'published');
    }
    expect(text).not.toContain('/ja/');
    expect(text).toContain(url.absoluteUrl(url.paths.sitemapIndex()));
  });
});

describe('content:export JSON', () => {
  it('exports the resolved body language and localized template output in one current format', () => {
    for (const code of ['en', 'zh-Hans']) {
      const locale = config.builtLocales.find((l) => l.code === code)!;
      const data = exportJson(sources, config.buildId, locale, ['prompt', 'template']);
      expect(data.version).toBe(2);
      const prompt = data.prompts.find((p) => p.id === 'p_217')!;
      expect(prompt.kind === 'prompt' && prompt.prompt).toEqual({
        text: sources.reader.getDetailModel('prompt', 'p_217', code)!.prompt.text,
        language: code,
      });
      const template = data.templates.find((t) => t.id === 't_001')!;
      expect(template.kind === 'template' && template.promptLanguage).toBe(code);
      expect(template.kind === 'template' && template.defaultPrompt).toBe(
        sources.reader.getDetailModel('template', 't_001', code)!.version.defaultPrompt,
      );
    }
  });

  it('carries a format version, licences and only published records', () => {
    const locale = config.builtLocales.find((l) => l.code === 'en')!;
    const data = exportJson(sources, config.buildId, locale, ['prompt', 'template']);
    expect(data).toMatchObject({ format: 'prompt-seen/content-export', version: EXPORT_VERSION, locale: 'en' });
    const published = visible('en').prompts.filter((p) => p.visibility === 'published');
    expect(data.prompts.map((p) => p.id).sort()).toEqual(published.map((p) => p.id).sort());
    const record = data.prompts.find((p) => p.kind === 'prompt' && p.source.license)!;
    expect(record).toMatchObject({ markdownUrl: expect.stringMatching(/\/index\.md$/) });
    expect(record.kind === 'prompt' && record.source.licenseUrl).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(data.templates.length).toBeGreaterThan(0);
  });
});
