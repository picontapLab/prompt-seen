import { writeRequiredPages } from '../../../tests/support/localization-pages';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { LocaleEntry, ResolvedConfig } from '../../../src/config/schema';
import type { PromptDetail, TemplateDetail } from '../../../src/modules/content/types';
import { createUrlModule } from '../../../src/modules/url/create';
import { toCard } from '../../../src/modules/feed/compose';
import { searchDocuments } from '../../../src/modules/search/documents';
import { promptMarkdown, templateMarkdown, type MarkdownContext } from '../../../src/modules/geo/markdown';
import { createIndex, loadEngine, search } from '../../../src/modules/search/engine';
import { aspectRatioLabel, openingOf } from './build-index';
import type { Finding } from './findings';
import { loadContent } from './load';
import { sha256, sourceHashOf } from './read';
import { resolveTemplate } from './prompt-variants';
import { templateContractHash } from './template-contract';

// Content pipeline rules (design doc §5, §6.4, §8.4, §8.5, §9.1, §9.5, §14.3), checked on
// small content trees written to a temporary directory.

const LOCALES: LocaleEntry[] = [
  { code: 'en', pathPrefix: 'en', nativeName: 'English', htmlLang: 'en', direction: 'ltr', enabled: true, preview: false, phase: 1, localization: { coverage: 'incremental', review: 'metadata', promptBodies: 'optional' } },
  { code: 'zh-Hans', pathPrefix: 'zh-hans', nativeName: '简体中文', htmlLang: 'zh-Hans', direction: 'ltr', enabled: true, preview: false, phase: 1, localization: { coverage: 'incremental', review: 'metadata', promptBodies: 'optional' } },
  { code: 'ja', pathPrefix: 'ja', nativeName: '日本語', htmlLang: 'ja', direction: 'ltr', enabled: false, preview: true, phase: 1, localization: { coverage: 'incremental', review: 'metadata', promptBodies: 'optional' } },
  { code: 'tr', pathPrefix: 'tr', nativeName: 'Türkçe', htmlLang: 'tr', direction: 'ltr', enabled: false, preview: false, phase: 2, localization: { coverage: 'incremental', review: 'metadata', promptBodies: 'optional' } },
];

function configFor(buildMode: 'production' | 'preview'): ResolvedConfig {
  return {
    siteName: 'Test',
    origin: 'https://example.com',
    basePath: '/prompt-seen',
    urlPattern: '{basePath}/{locale}/{path}',
  repository: null,
    robots: { mode: 'standalone', aiTraining: 'disallow' },
    shell: { header: 'default', themeSource: 'system' },
    brand: { tokens: null },
    home: { featured: [] },
    feed: { showcase: [], interludes: [] },
    media: { baseUrl: null },
    analytics: { provider: 'none' },
    searchEngines: { verification: { google: null, bing: null, yandex: null, naver: null } },
    buildMode,
    buildId: 'test',
    defaultLocale: 'en',
    locales: LOCALES,
    builtLocales: LOCALES.filter((l) => l.enabled || (buildMode === 'preview' && l.preview)),
  };
}

const tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

const PROMPT = 'Ink wash portrait of a scholar, soft graded washes, a single red seal stamp in the lower right.';

const mdx = (fm: Record<string, unknown>, body = '## How to adjust it\n\nChange the seal colour.\n') =>
  `---\n${Object.entries(fm)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('\n')}\n---\n\n${body}`;

const media = (id: string, alt: Record<string, string> = { en: 'An ink portrait', 'zh-Hans': '水墨肖像', ja: '水墨の肖像' }) => `
id: ${id}
contentHash: sha256:${'a'.repeat(64)}
mimeType: image/jpeg
width: 1200
height: 1500
original: { key: media/${id}/x-original-aaa.jpg }
variants:
  thumbnail: { key: media/${id}/x-thumbnail-bbb.webp, width: 384, height: 480, mimeType: image/webp }
  card: { key: media/${id}/x-card-ccc.webp, width: 768, height: 960, mimeType: image/webp }
  detail: { key: media/${id}/x-detail-ddd.webp, width: 1200, height: 1500, mimeType: image/webp }
  og: { key: media/${id}/x-og-eee.jpg, width: 1200, height: 630, mimeType: image/jpeg }
placeholder: { color: "#D9D4CC" }
alt: ${JSON.stringify(alt)}
`;

const promptEntry = (id: string, slug: string, extra = '') => `
id: ${id}
slug: ${slug}
createdAt: 2026-10-0${id.slice(-1)}
updatedAt: 2026-10-0${id.slice(-1)}
promptSource: { type: literal, language: en }
categoryId: portrait
styleIds: [ink]
useCaseIds: []
coverAssetId: a_00${id.slice(-1)}
${extra}`;

const enFm = { title: 'Ink portrait', description: 'Ink portraits with a red seal.', status: 'published', updatedAt: '2026-10-02' };

function zhFor(enBody: string, enFmValues = enFm, review = 'reviewed') {
  const hash = sourceHashOf({ fm: { title: enFmValues.title, description: enFmValues.description }, body: `\n${enBody}` });
  return mdx({
    title: '水墨肖像',
    description: '带红色印章的水墨肖像。',
    status: 'published',
    updatedAt: '2026-10-02',
    translation: { sourceLocale: 'en', sourceHash: hash, reviewStatus: review },
  });
}

/** A valid content tree; `patch` replaces or deletes (null) files. */
function setup(patch: Record<string, string | null> = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-seen-content-'));
  tmpDirs.push(root);
  const body = '## How to adjust it\n\nChange the seal colour.\n';
  const files: Record<string, string | null> = {
    'content/taxonomy/categories.yaml': '- { id: portrait, labels: { en: Portrait, zh-Hans: 肖像, ja: 肖像 } }\n- { id: food, labels: { en: Food } }\n',
    'content/taxonomy/styles.yaml': '- { id: ink, labels: { en: Ink, zh-Hans: 水墨, ja: 水墨 } }\n',
    'content/taxonomy/use-cases.yaml': '[]\n',
    'content/taxonomy/field-groups.yaml': '- { id: subject, labels: { en: Subject, zh-Hans: 主体 } }\n',
    'content/taxonomy/categories/portrait/locales/en.mdx': mdx({ ...enFm, title: 'Portrait prompts' }, 'Portraits.\n'),
    'content/prompts/p_001/entry.yaml': promptEntry(
      'p_001',
      'ink-portrait',
      `annotations:\n  - phrase: a single red seal stamp in the lower right\n    region: { x: 0.8, y: 0.8, w: 0.1, h: 0.1 }\n    note: { en: Sets the seal, zh-Hans: 控制印章, ja: 印を決める }\n`,
    ),
    'content/prompts/p_001/prompt.txt': `${PROMPT}\n`,
    'content/prompts/p_001/locales/en.mdx': mdx(enFm, body),
    'content/prompts/p_001/locales/zh-Hans.mdx': zhFor(body),
    'content/prompts/p_001/locales/ja.mdx': mdx({
      ...enFm,
      title: '水墨の肖像',
      status: 'draft',
      translation: { sourceLocale: 'en', sourceHash: `sha256:${'0'.repeat(16)}`, reviewStatus: 'machine-draft' },
    }),
    'content/prompts/p_002/entry.yaml': promptEntry('p_002', 'second'),
    'content/prompts/p_002/prompt.txt': 'Another ink portrait.\n',
    'content/prompts/p_002/locales/en.mdx': mdx({ ...enFm, title: 'Second' }, body + '\nSee [the first](prompt:p_001).\n'),
    'content/prompts/p_003/entry.yaml': promptEntry('p_003', 'third'),
    'content/prompts/p_003/prompt.txt': 'A third ink portrait.\n',
    'content/prompts/p_003/locales/en.mdx': mdx({ ...enFm, title: 'Third' }, body),
    'content/media/a_001.yaml': media('a_001'),
    'content/media/a_002.yaml': media('a_002'),
    'content/media/a_003.yaml': media('a_003'),
    'content/templates/t_001/entry.yaml': 'id: t_001\nslug: poster\ncreatedAt: 2026-10-01\nupdatedAt: 2026-10-01\ncurrentVersion: v1\npromptLanguage: en\n',
    'content/templates/t_001/versions/v1/body.txt': 'Poster for {{product}} in {{palette}}.\n',
    'content/templates/t_001/versions/v1/fields.yaml':
      'fields:\n  - { name: product, type: string, required: true, maxLength: 40, group: subject, labels: { en: Product, zh-Hans: 产品 } }\n  - name: palette\n    type: enum\n    default: warm\n    labels: { en: Palette, zh-Hans: 配色 }\n    options:\n      - { value: warm, labels: { en: Warm, zh-Hans: 暖色 } }\n      - { value: cold, labels: { en: Cold, zh-Hans: 冷色 } }\n',
    'content/templates/t_001/versions/v1/samples/default.yaml': 'product: a mug\n',
    'content/templates/t_001/versions/v1/samples/second.yaml': 'product: a tin\npalette: cold\n',
    'content/templates/t_001/locales/en.mdx': mdx({ ...enFm, title: 'Poster' }, body),
    'content/examples/x_001/run.yaml': `id: x_001\npromptId: p_001\ntemplate: { id: t_001, version: v1, sample: default, values: { product: a mug, palette: warm } }\npromptSha256: ${sha256('Poster for a mug in warm.')}\noutputAssetIds: [a_001]\nrecordedAt: 2026-10-05\nmodel: { displayName: Sample Model, providerModelId: sample-1 }\nnotes: { en: Clean edges. }\n`,
    'content/examples/x_001/prompt.txt': 'Poster for a mug in warm.\n',
    'content/collections/c_001/entry.yaml': 'id: c_001\nslug: ink\ncreatedAt: 2026-10-01\nupdatedAt: 2026-10-01\ncoverAssetId: a_001\nitems: [p_001, p_002, t_001]\n',
    'content/collections/c_001/locales/en.mdx': mdx({ ...enFm, title: 'Ink', reasons: { p_001: 'The seal.' } }, 'A collection.\n'),
    'content/pages/about/locales/en.mdx': mdx({ ...enFm, title: 'About' }, 'About us.\n'),
    'content/pages/about/locales/zh-Hans.mdx': zhFor('About us.\n', { ...enFm, title: 'About' }),
    'content/redirects.yaml':
      'redirects:\n  - { kind: prompt, from: old-portrait, to: p_001 }\n  - { from: /zh/, to: /zh-hans/ }\ngone:\n  - { kind: prompt, slug: removed-one, reason: license }\n',
    ...patch,
  };
  for (const [file, contents] of Object.entries(files)) {
    if (contents === null) continue;
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), contents);
  }
  // Storage for the local media driver: every key in the media files exists.
  for (const id of ['a_001', 'a_002', 'a_003'])
    for (const v of ['x-original-aaa.jpg', 'x-thumbnail-bbb.webp', 'x-card-ccc.webp', 'x-detail-ddd.webp', 'x-og-eee.jpg']) {
      const f = path.join(root, 'public/media', id, v);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, 'x');
    }
  writeRequiredPages(root, ['en', 'zh-Hans'], ['license']);
  return root;
}

function load(root: string, mode: 'production' | 'preview' = 'production') {
  const config = configFor(mode);
  const url = createUrlModule({ origin: config.origin, basePath: config.basePath, urlPattern: config.urlPattern, localePrefixes: LOCALES.map((l) => l.pathPrefix) });
  return loadContent({ root, config, url, dir: path.join(root, 'content'), mediaRoot: path.join(root, 'public') });
}

const blocking = (list: Finding[]) => list.filter((f) => f.level === 'error' || f.level === 'publish');
const detail = <T,>(r: ReturnType<typeof load>, kind: string, locale: string, key: string) =>
  r.built!.details.find((d) => d.kind === kind && d.locale === locale && d.key === key)?.model as T | undefined;

it.each(['output', 'reference'])('derives GIF case badges from %s assets through content, feed and search', (role) => {
  const root = setup({
    'content/media/a_002.yaml': media('a_002')
      .replace('image/jpeg', 'image/gif').replace('x-original-aaa.jpg', 'x-original-aaa.gif') +
      '\nanimation: { frameCount: 2, durationMs: 360, loopCount: 0 }\n',
  });
  fs.writeFileSync(path.join(root, 'public/media/a_002/x-original-aaa.gif'), 'fixture');
  const runFile = path.join(root, 'content/examples/x_001/run.yaml');
  fs.writeFileSync(runFile, fs.readFileSync(runFile, 'utf8').replace('outputAssetIds: [a_001]',
    role === 'output' ? 'outputAssetIds: [a_001, a_002]' : 'outputAssetIds: [a_001]\nreferenceAssetIds: [a_002]'));
  const result = load(root);
  expect(blocking(result.findings.list)).toEqual([]);
  const index = result.built!.locales.get('en')!;
  const prompt = index.prompts.find((p) => p.id === 'p_001')!;
  expect(prompt.cover.mimeType).toBe('image/jpeg');
  expect(prompt.hasGifOutput).toBe(role === 'output');
  expect(index.templates[0]!.hasGifOutput).toBe(role === 'output');
  expect(toCard(prompt, aspectRatioLabel).hasGifOutput).toBe(role === 'output');
  const gifCard = toCard(index.prompts.find((p) => p.id === 'p_002')!, aspectRatioLabel);
  expect(gifCard.cover).toMatchObject({ mimeType: 'image/gif', animation: { frameCount: 2 } });
  const documents = searchDocuments({
    index,
    prompt: (id) => detail<PromptDetail>(result, 'prompt', 'en', id) ?? null,
    template: (id) => detail<TemplateDetail>(result, 'template', 'en', id) ?? null,
    pages: { collections: true, topics: true },
  });
  const engine = loadEngine({ schemaVersion: 2, analyzerVersion: 2, buildId: 'gif-test', locale: 'en', counts: { prompt: 3, template: 1, collection: 1, topic: 1 }, popular: [], terms: [], index: JSON.parse(JSON.stringify(createIndex(documents, 'en'))) });
  const hits = search(engine, 'GIF').groups.flatMap((group) => group.hits);
  expect(hits.some((hit) => hit.id === 'prompt:p_001' && hit.hasGifOutput)).toBe(role === 'output');
  expect(hits.find((hit) => hit.id === 'prompt:p_002')?.thumb?.mimeType).toBe('image/gif');
});

describe('a valid content tree', () => {
  it('validates and builds a production index', () => {
    const r = load(setup());
    expect(blocking(r.findings.list)).toEqual([]);
    const en = r.built!.locales.get('en')!;
    expect(en.prompts.map((p) => p.id)).toEqual(['p_003', 'p_002', 'p_001']);
    expect(r.built!.locales.has('ja')).toBe(false);
    expect(r.built!.locales.get('zh-Hans')!.prompts.map((p) => p.id)).toEqual(en.prompts.map((p) => p.id));
  });

  it('builds the serializable prompt detail model', () => {
    const r = load(setup());
    const p = detail<PromptDetail>(r, 'prompt', 'zh-Hans', 'p_001')!;
    expect(p.path).toBe('/zh-hans/prompts/ink-portrait/');
    expect(p.frameNumber).toBe('0001');
    expect(p.prompt.text).toBe(PROMPT);
    expect(p.annotations).toEqual([
      expect.objectContaining({ letter: 'A', start: PROMPT.indexOf('a single'), note: '控制印章' }),
    ]);
    expect(p.test).toMatchObject({ aspectRatio: '4:5', lastTestedAt: null }); // The recorded run used different text.
    expect(p.alternates).toEqual([
      { locale: 'en', path: '/en/prompts/ink-portrait/' },
      { locale: 'zh-Hans', path: '/zh-hans/prompts/ink-portrait/' },
    ]);
    expect(p.translation).toEqual({ sourceLocale: 'en', reviewStatus: 'reviewed' });
    expect(p.taxonomy.category).toEqual({ kind: 'category', id: 'portrait', label: '肖像', labelLocale: 'zh-Hans', path: '/zh-hans/categories/portrait/' });
    expect(p.body[0]).toMatchObject({ t: 'h2', id: 'how-to-adjust-it' });
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
  });

  it('resolves content links to the locale address', () => {
    const r = load(setup());
    const p = detail<PromptDetail>(r, 'prompt', 'en', 'p_002')!;
    expect(JSON.stringify(p.body)).toContain('"href":"/en/prompts/ink-portrait/","internal":true');
  });

  it('builds the template model with the rendered default prompt and localized fields', () => {
    const r = load(setup());
    const t = detail<TemplateDetail>(r, 'template', 'en', 't_001')!;
    expect(t.version.defaultPrompt).toBe('Poster for a mug in warm.');
    expect(t.version.samples.map((s) => s.name)).toEqual(['default', 'second']);
    expect(t.version.fields[0]).toMatchObject({ name: 'product', label: 'Product', groupLabel: 'Subject' });
    expect(t.cover?.assetId).toBe('a_001');
  });

  it('resolves redirects and removed addresses per built locale (§9.5)', () => {
    const r = load(setup());
    expect(r.built!.manifest.redirects).toEqual([
      { from: '/en/prompts/old-portrait/', to: '/en/prompts/ink-portrait/' },
      { from: '/zh-hans/prompts/old-portrait/', to: '/zh-hans/prompts/ink-portrait/' },
      { from: '/zh/', to: '/zh-hans/' },
      // Page 1 of the list is the list itself (§9.4).
      { from: '/en/prompts/page/1/', to: '/en/prompts/' },
      { from: '/zh-hans/prompts/page/1/', to: '/zh-hans/prompts/' },
    ]);
    expect(r.built!.manifest.gone).toContainEqual({ path: '/en/prompts/removed-one/', locale: 'en', reason: 'license' });
  });
});

describe('build modes (§8.4, §15.1)', () => {
  it('preview builds also show drafts and preview locales', () => {
    const r = load(setup(), 'preview');
    const ja = r.built!.locales.get('ja')!;
    expect(ja.prompts.map((p) => [p.id, p.visibility])).toEqual([
      ['p_003', 'published'], ['p_002', 'published'], ['p_001', 'draft'],
    ]);
  });

  it('production builds never show drafts', () => {
    const r = load(setup({ 'content/prompts/p_003/locales/en.mdx': mdx({ ...enFm, title: 'Third', status: 'draft' }) }));
    expect(r.built!.locales.get('en')!.prompts.map((p) => p.id)).not.toContain('p_003');
  });

  it('an archived version answers 410 unless redirected', () => {
    const r = load(setup({ 'content/prompts/p_003/locales/en.mdx': mdx({ ...enFm, title: 'Third', status: 'archived' }) }), 'preview');
    expect(r.built!.manifest.gone).toContainEqual({ path: '/en/prompts/third/', locale: 'en', reason: 'archived' });
    expect(r.built!.locales.get('en')!.prompts.map((p) => p.id)).not.toContain('p_003');
  });

  it('a topic page needs enough prompts in its locale (§9.1)', () => {
    const r = load(setup());
    expect(r.built!.locales.get('en')!.topics.map((t) => t.id)).toEqual(['portrait']);
    expect(r.built!.locales.get('en')!.terms.find((t) => t.id === 'portrait')).toMatchObject({ count: 3, path: '/en/categories/portrait/' });
    const fewer = load(setup({ 'content/prompts/p_003/locales/en.mdx': mdx({ ...enFm, title: 'Third', status: 'draft' }) }));
    expect(fewer.built!.locales.get('en')!.topics).toEqual([]);
  });

  it('a collection keeps only the items visible in its locale', () => {
    const r = load(setup());
    expect(r.built!.locales.get('en')!.collections[0]).toMatchObject({ id: 'c_001', itemCount: 3 });
    expect(r.built!.locales.get('zh-Hans')!.collections[0]).toMatchObject({ id: 'c_001', itemCount: 3 });
  });
});

describe('shared content across interface languages', () => {
  it.each(['production', 'preview'] as const)('keeps the same library and local links without translation files in %s', (mode) => {
    const r = load(setup({
      'content/pages/editorial/locales/en.mdx': mdx({ ...enFm, title: 'Editorial' }, 'Editorial notes.\n'),
      'content/prompts/p_001/locales/zh-Hans.mdx': null,
      'content/prompts/p_001/locales/ja.mdx': null,
      'content/media/a_001.yaml': media('a_001', { en: 'An ink portrait' }),
      'content/prompts/p_001/entry.yaml': promptEntry('p_001', 'ink-portrait',
        'annotations:\n  - phrase: a single red seal stamp in the lower right\n    region: { x: 0.8, y: 0.8, w: 0.1, h: 0.1 }\n    note: { en: Sets the seal }\n'),
    }), mode);
    expect(blocking(r.findings.list)).toEqual([]);
    const en = r.built!.locales.get('en')!;
    for (const [code, index] of r.built!.locales) {
      const prefix = LOCALES.find((l) => l.code === code)!.pathPrefix;
      for (const kind of ['prompts', 'templates', 'collections', 'topics'] as const)
        expect(index[kind].map((entry) => entry.id)).toEqual(en[kind].map((entry) => entry.id));
      const p = detail<PromptDetail>(r, 'prompt', code, 'p_001')!;
      expect(p).toMatchObject({ locale: code, title: 'Ink portrait', path: `/${prefix}/prompts/ink-portrait/` });
      expect(p.cover.alt).toBe('An ink portrait');
      expect(p.annotations[0]!.note).toBe('Sets the seal');
      expect(p.examples[0]!.notes).toBe('Clean edges.');
      expect(p.prompt).toMatchObject({ text: PROMPT, language: 'en' });
      expect(p.languageLinks.map((a) => a.locale)).toEqual([...r.built!.locales.keys()]);
      expect(p.localization).toMatchObject({ contentLocale: 'en', localStatus: code === 'en' ? 'current' : 'missing', presentation: code === 'en' ? 'local' : 'fallback', indexable: mode === 'production' && code === 'en' });
      expect(p.alternates.map((a) => a.locale)).toEqual(mode === 'production' && code === 'en' ? ['en'] : []);
      expect(toCard(p, aspectRatioLabel).path).toBe(p.path);
      const second = detail<PromptDetail>(r, 'prompt', code, 'p_002')!;
      expect(JSON.stringify(second.body)).toContain(`"href":"/${prefix}/prompts/ink-portrait/"`);
      const template = detail<TemplateDetail>(r, 'template', code, 't_001')!;
      expect(template.version.defaultPrompt).toBe('Poster for a mug in warm.');
      expect(template.version.fields[0]!.label).toBe(code === 'zh-Hans' ? '产品' : 'Product');
      const documents = searchDocuments({
        index, prompt: (id) => detail<PromptDetail>(r, 'prompt', code, id) ?? null,
        template: (id) => detail<TemplateDetail>(r, 'template', code, id) ?? null,
        pages: { collections: true, topics: true },
      });
      expect(documents.filter((d) => d.kind === 'prompt').map((d) => d.id)).toHaveLength(en.prompts.length);
      expect(documents.find((d) => d.id === 'prompt:p_001')).toMatchObject({ path: p.path, body: PROMPT });
    }
    // Standalone editorial pages retain their own publication rules.
    expect(r.built!.locales.get('zh-Hans')!.pages.map((page) => page.slug)).not.toContain('editorial');
  });

  it('uses published original text while a translation is still a draft', () => {
    const r = load(setup({
      'content/prompts/p_001/locales/zh-Hans.mdx': zhFor('', enFm, 'machine-draft').replace('status: published', 'status: draft'),
    }));
    expect(blocking(r.findings.list)).toEqual([]);
    expect(detail<PromptDetail>(r, 'prompt', 'zh-Hans', 'p_001')).toMatchObject({
      title: enFm.title, visibility: 'published', translation: { sourceLocale: 'en', reviewStatus: 'source' },
    });
  });

  it('shares a non-English source when no default-language file exists', () => {
    const r = load(setup({
      'content/prompts/p_003/locales/en.mdx': null,
      'content/prompts/p_003/locales/zh-Hans.mdx': mdx({ ...enFm, title: '第三个案例' }),
    }));
    expect(blocking(r.findings.list)).toEqual([]);
    expect(detail<PromptDetail>(r, 'prompt', 'en', 'p_003')).toMatchObject({
      title: '第三个案例', path: '/en/prompts/third/', translation: { sourceLocale: 'zh-Hans', reviewStatus: 'source' },
    });
  });

  it('allows a translated description to link to a shared case without that translation', () => {
    const r = load(setup({
      'content/prompts/p_001/locales/zh-Hans.mdx': zhFor('') + '\nSee [second](prompt:p_002).\n',
    }));
    expect(blocking(r.findings.list)).toEqual([]);
    const p = detail<PromptDetail>(r, 'prompt', 'zh-Hans', 'p_001')!;
    expect(p.title).toBe('水墨肖像');
    expect(JSON.stringify(p.body)).toContain('"href":"/zh-hans/prompts/second/"');
  });

  it('shows preview drafts only in their actual language without using them as fallback', () => {
    const root = setup({ 'content/prompts/p_003/locales/en.mdx': mdx({ ...enFm, status: 'draft' }) });
    for (const index of load(root).built!.locales.values())
      expect(index.prompts.map((p) => p.id)).not.toContain('p_003');
    for (const [code, index] of load(root, 'preview').built!.locales)
      expect(index.prompts.find((p) => p.id === 'p_003')?.visibility).toBe(code === 'en' ? 'draft' : undefined);
  });

  it('respects explicit archival even if another language remains published', () => {
    const r = load(setup({
      'content/prompts/p_001/locales/zh-Hans.mdx': zhFor('').replace('status: published', 'status: archived'),
    }));
    expect(r.built!.locales.get('en')!.prompts.some((p) => p.id === 'p_001')).toBe(true);
    expect(detail<PromptDetail>(r, 'prompt', 'zh-Hans', 'p_001')).toBeUndefined();
    expect(r.built!.manifest.gone).toContainEqual({ path: '/zh-hans/prompts/ink-portrait/', locale: 'zh-Hans', reason: 'archived' });
  });
});

describe('translations (§8.4, §8.5)', () => {
  it('reports an outdated translation with the hash to write after review, and keeps it published', () => {
    const changed = '## How to adjust it\n\nChange the seal colour and size.\n';
    const r = load(setup({ 'content/prompts/p_001/locales/en.mdx': mdx(enFm, changed) }));
    const warning = r.findings.list.find((f) => f.file.endsWith('zh-Hans.mdx') && f.level === 'warning');
    expect(warning?.fix).toContain(sourceHashOf({ fm: enFm, body: `\n${changed}` }));
    expect(detail<PromptDetail>(r, 'prompt', 'zh-Hans', 'p_001')?.translation.reviewStatus).toBe('outdated');
  });

  it('never publishes a machine translation', () => {
    const r = load(setup({ 'content/prompts/p_001/locales/zh-Hans.mdx': zhFor('', enFm, 'machine-draft').replace('status: published', 'status: published') }));
    expect(r.findings.list).toContainEqual(expect.objectContaining({ level: 'publish', field: 'translation.reviewStatus' }));
  });

  it('needs exactly one source file', () => {
    const r = load(setup({ 'content/prompts/p_003/locales/zh-Hans.mdx': mdx({ ...enFm, title: '第三' }) }));
    expect(r.findings.list.some((f) => f.level === 'error' && f.message.includes('exactly one is the source'))).toBe(true);
  });

  it('warns about published entries missing in an enabled locale, once per locale', () => {
    const r = load(setup());
    const w = r.findings.list.filter((f) => f.level === 'warning' && f.message.includes('no zh-Hans version'));
    expect(w).toHaveLength(1);
    expect(w[0]!.message).toContain('p_002');
  });
});

describe('publishing rules (§8.4)', () => {
  it('requires a description, a section, alt text and annotation notes in the locale', () => {
    const r = load(
      setup({
        'content/prompts/p_003/locales/en.mdx': mdx({ ...enFm, title: 'Third', description: "''" }, 'Just text.\n'),
        'content/media/a_001.yaml': media('a_001', { en: 'An ink portrait' }),
      }),
    );
    const pub = r.findings.list.filter((f) => f.level === 'publish').map((f) => `${path.basename(path.dirname(path.dirname(f.file)))}: ${f.message}`);
    expect(pub).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^p_003: description is required/),
        expect.stringMatching(/^p_003: the body needs at least one ## section/),
        expect.stringMatching(/^p_001: the cover image has no zh-Hans description/),
      ]),
    );
    expect(r.built).toBeNull();
  });

  it('requires template field labels in each published locale', () => {
    const r = load(
      setup({
        'content/templates/t_001/locales/ja.mdx': mdx({
          ...enFm,
          title: 'ポスター',
          translation: { sourceLocale: 'en', sourceHash: `sha256:${'0'.repeat(16)}`, reviewStatus: 'reviewed' },
        }),
      }),
    );
    expect(r.findings.list.some((f) => f.level === 'publish' && f.message.includes('field "product" has no ja label'))).toBe(true);
  });

  it('a link to an entry that is not published in the locale blocks publishing', () => {
    const r = load(
      setup({
        'content/prompts/p_003/locales/en.mdx': mdx({ ...enFm, title: 'Third' }, '## Tips\n\nSee [draft](prompt:p_002).\n'),
        'content/prompts/p_002/locales/en.mdx': mdx({ ...enFm, title: 'Second', status: 'draft' }),
      }),
    );
    expect(r.findings.list).toContainEqual(expect.objectContaining({ level: 'publish', message: expect.stringContaining('prompt:p_002') }));
  });
});

describe('build errors (§14.3)', () => {
  const errorsOf = (patch: Record<string, string | null>) =>
    blocking(load(setup(patch)).findings.list).map((f) => `${f.file.replace(/^content\//, '')}:${f.line ?? ''} ${f.message}`);

  it('rejects an annotation phrase that is not in the prompt, at its line', () => {
    const errors = errorsOf({ 'content/prompts/p_001/prompt.txt': 'A portrait without the seal.\n' });
    expect(errors).toContainEqual(expect.stringMatching(/^prompts\/p_001\/entry.yaml:12 annotation phrase .* does not appear/));
  });

  it('rejects undefined and unused template fields with positions', () => {
    const errors = errorsOf({ 'content/templates/t_001/versions/v1/body.txt': 'Poster for {{product}} and {{colour}}.\n' });
    expect(errors).toContainEqual('templates/t_001/versions/v1/body.txt:1 placeholder {{colour}} has no field definition');
    expect(errors).toContainEqual(expect.stringContaining('field "palette" is not used in body.txt'));
  });

  it('freezes template versions used by examples (§6.4)', () => {
    const errors = errorsOf({ 'content/templates/t_001/versions/v1/body.txt': 'A poster for {{product}} in {{palette}}.\n' });
    expect(errors).toContainEqual(expect.stringContaining('no longer renders this run'));
  });

  it('checks the prompt snapshot hash of a run', () => {
    const errors = errorsOf({ 'content/examples/x_001/prompt.txt': 'Poster for a mug in warm!\n' });
    expect(errors).toContainEqual(expect.stringContaining('prompt.txt does not match promptSha256'));
  });

  it('rejects duplicate slugs, missing references and missing media files', () => {
    const errors = errorsOf({
      'content/prompts/p_003/entry.yaml': promptEntry('p_003', 'second').replace('categoryId: portrait', 'categoryId: nope'),
      'content/media/a_002.yaml': media('a_002').replace('x-card-ccc', 'x-card-zzz'),
    });
    expect(errors).toContainEqual(expect.stringContaining('slug "second" is already used by p_002'));
    expect(errors).toContainEqual(expect.stringContaining('category "nope" is not defined'));
    expect(errors).toContainEqual(expect.stringContaining('image file media/a_002/x-card-zzz.webp is missing'));
  });

  it('rejects redirects that hide live pages or point nowhere', () => {
    const errors = errorsOf({
      'content/redirects.yaml': 'redirects:\n  - { kind: prompt, from: second, to: p_001 }\n  - { kind: prompt, from: gone-one, to: p_009 }\n',
    });
    expect(errors).toContainEqual(expect.stringContaining('"second" is the slug of a current prompt'));
    expect(errors).toContainEqual(expect.stringContaining('redirect target p_009 is not an existing prompt'));
  });

  it('reports an unreadable taxonomy file once instead of at every reference', () => {
    const errors = errorsOf({ 'content/taxonomy/styles.yaml': 'oops: [\n' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^taxonomy\/styles.yaml:\d* invalid YAML/);
  });

  it('reports unknown keys and bad values at their line', () => {
    const errors = errorsOf({ 'content/prompts/p_003/entry.yaml': `${promptEntry('p_003', 'third')}colour: red\n` });
    expect(errors.some((e) => e.startsWith('prompts/p_003/entry.yaml') && e.includes('colour'))).toBe(true);
  });
});

describe('restricted MDX (§3.5)', () => {
  const errorsFor = (body: string) =>
    blocking(load(setup({ 'content/prompts/p_003/locales/en.mdx': mdx({ ...enFm, title: 'Third' }, `## Tips\n\nText.\n\n${body}`) })).findings.list).map(
      (f) => `${f.line} ${f.message}`,
    );

  it.each([
    ['<div>raw</div>\n', /component <div> is not (allowed|supported)/],
    ["import X from 'x'\n", /import and export are not allowed/],
    ['Use {props.x} here.\n', /expressions are not allowed/],
    ['<Chart />\n', /component <Chart> is not allowed/],
    ['[home](/en/)\n', /link "\/en\/" is not allowed/],
    ['![img](a.png)\n', /Markdown images are not supported/],
    ['# Title\n', /"#" headings are not allowed/],
  ])('rejects %j', (body, message) => {
    const errors = errorsFor(body);
    expect(errors).toContainEqual(expect.stringMatching(message));
    expect(errors[0]).toMatch(/^1[0-9] /); // the line in the file, after the frontmatter
  });

  it('accepts figures, callouts, tables and escaped braces', () => {
    const r = load(
      setup({
        'content/prompts/p_003/locales/en.mdx': mdx(
          { ...enFm, title: 'Third' },
          '## Tips\n\n<Figure asset="a_002" caption="Before" />\n\n<Callout>\n\nKeep \\{\\{product\\}\\} short.\n\n</Callout>\n\n| a | b |\n| - | - |\n| 1 | 2 |\n',
        ),
      }),
    );
    expect(blocking(r.findings.list)).toEqual([]);
    const body = detail<PromptDetail>(r, 'prompt', 'en', 'p_003')!.body;
    expect(body.map((b) => b.t)).toEqual(['h2', 'figure', 'callout', 'table']);
    expect(JSON.stringify(body)).toContain('{{product}}');
  });
});

describe('helpers', () => {
  it('labels common aspect ratios', () => {
    expect(aspectRatioLabel(1536, 1920)).toBe('4:5');
    expect(aspectRatioLabel(2100, 900)).toBe('21:9');
    expect(aspectRatioLabel(1000, 701)).toBe('1000:701');
  });

  it('takes the first sentence of a prompt', () => {
    expect(openingOf('One sentence. Two sentences.')).toBe('One sentence.');
    expect(openingOf('水墨肖像。留白。')).toBe('水墨肖像。');
    expect(openingOf('word '.repeat(60)).length).toBeLessThanOrEqual(161);
  });
});

describe('versioned reference inputs', () => {
  it('keeps ordered reference originals and slot labels beside the matching output in both Markdown documents', () => {
    const root = setup({
      'content/prompts/p_001/prompt.txt': null,
      'content/prompts/p_001/entry.yaml': promptEntry('p_001', 'ink-portrait', 'inputRequirements: { referenceImage: required }\n').replace(
        'promptSource: { type: literal, language: en }',
        'promptSource: { type: template, templateId: t_001, version: v1, values: { product: a mug, palette: warm } }',
      ),
      'content/templates/t_001/versions/v1/inputs.yaml': [
        'referenceImage: required',
        'instructions: { en: Upload the product photo and markup overlay., zh-Hans: 上传商品照片和标注叠加图。 }',
        'slots:',
        '  - { id: photo, labels: { en: "Original [product]", zh-Hans: 商品原图 }, min: 1, max: 1 }',
        '  - { id: markup, labels: { en: Markup overlay, zh-Hans: 标注叠加图 }, min: 1, max: 1 }',
      ].join('\n'),
    });
    fs.appendFileSync(path.join(root, 'content/examples/x_001/run.yaml'),
      'referenceAssetIds: [a_003, a_002]\nreferenceBindings: [{ slotId: photo, referenceIndex: 0 }, { slotId: markup, referenceIndex: 1 }]\n');
    const r = load(root);
    expect(blocking(r.findings.list)).toEqual([]);
    const ctx: MarkdownContext = {
      absoluteUrl: (p) => `https://example.com/prompt-seen${p}`,
      absoluteImageUrl: (v) => `https://media.example.com/${v.key}`,
      t: (key, values) => key === 'geo.markdown.field' ? `${values?.label}: ${values?.value}` : key,
      languageName: (tag) => tag,
    };
    const prompt = detail<PromptDetail>(r, 'prompt', 'en', 'p_001')!;
    const template = detail<TemplateDetail>(r, 'template', 'en', 't_001')!;
    for (const markdown of [promptMarkdown(prompt, ctx), templateMarkdown(template, ctx)]) {
      const records = markdown.slice(markdown.indexOf('## detail.examples.heading'));
      expect(records).toContain('1. Original \\[product\\]');
      expect(records).toContain('2. Markup overlay');
      const first = records.indexOf('https://media.example.com/media/a_003/x-original-aaa.jpg');
      const second = records.indexOf('https://media.example.com/media/a_002/x-original-aaa.jpg');
      const output = records.indexOf('#### detail.examples.outputs');
      expect(first).toBeGreaterThan(0);
      expect(second).toBeGreaterThan(first);
      expect(output).toBeGreaterThan(second);
      expect(records.slice(output)).toContain('https://media.example.com/media/a_001/x-detail-ddd.webp');
    }
    expect(promptMarkdown({ ...prompt, examples: prompt.examples.map((run) => ({ ...run, references: [] })) }, ctx))
      .not.toContain('#### detail.examples.references');
  });

  it('inherits the selected template version input contract in prompt and template views', () => {
    const root = setup({
      'content/prompts/p_001/prompt.txt': null,
      'content/prompts/p_001/entry.yaml': promptEntry('p_001', 'ink-portrait', 'inputRequirements: { referenceImage: required }\n').replace(
        'promptSource: { type: literal, language: en }',
        'promptSource: { type: template, templateId: t_001, version: v1, values: { product: a mug, palette: warm } }',
      ),
      'content/templates/t_001/versions/v1/inputs.yaml': 'referenceImage: required\ninstructions: { en: Upload the product photo., zh-Hans: 上传产品照片。 }\nslots:\n  - { id: product, labels: { en: Product photo, zh-Hans: 产品照片 }, min: 1, max: 1 }\n',
    });
    const runFile = path.join(root, 'content/examples/x_001/run.yaml');
    fs.appendFileSync(runFile, 'referenceAssetIds: [a_002]\nreferenceBindings: [{ slotId: product, referenceIndex: 0 }]\n');
    const r = load(root);
    expect(blocking(r.findings.list)).toEqual([]);
    expect(detail<PromptDetail>(r, 'prompt', 'en', 'p_001')?.inputInstructions).toBe('Upload the product photo.');
    expect(detail<TemplateDetail>(r, 'template', 'en', 't_001')?.inputInstructions).toBe('Upload the product photo.');
    expect(detail<TemplateDetail>(r, 'template', 'en', 't_001')?.version.samples[0]?.exampleIds).toEqual(['x_001']);
    expect(detail<PromptDetail>(r, 'prompt', 'en', 'p_001')?.examples?.[0]?.referenceLabels).toEqual(['Product photo']);
  });
});

it('localizes source evidence without turning source metrics into site ratings', () => {
  const evidence = { candidateId: 'original', platform: 'Forum', author: 'Artist', url: 'https://example.com/post', publishedAt: '2025-01-01', metricObjectUrl: 'https://example.com/post', metricObjectPublishedAt: '2025-01-01', metricScope: { en: 'Whole post', 'zh-Hans': '整篇帖子' }, observedAt: '2026-10-28', cacheTimestampKnown: false, evidenceMethod: { en: 'Primary page', 'zh-Hans': '原始页面' }, evidenceUrl: 'https://example.com/post', sourcePromptStatus: { en: 'Excerpt', 'zh-Hans': '片段' }, metrics: [{ key: 'likes', value: 42, labels: { en: 'Likes', 'zh-Hans': '赞' } }] };
  const r = load(setup({ 'content/prompts/p_001/entry.yaml': promptEntry('p_001', 'ink-portrait', `promptProvenance: independent-adaptation\ninspirationSources: ${JSON.stringify([evidence])}\n`) }));
  expect(blocking(r.findings.list)).toEqual([]);
  const p = detail<PromptDetail>(r, 'prompt', 'zh-Hans', 'p_001');
  expect(p?.inspirationSources?.[0]?.metricScope).toBe('整篇帖子');
  expect(p?.inspirationSources?.[0]?.metrics).toEqual([{ key: 'likes', value: 42, label: '赞', labelLocale: 'zh-Hans' }]);
  expect(p?.promptProvenance).toBe('independent-adaptation');
});

// Prompt language is independent of the page translation workflow.
describe('prompt body languages', () => {
  const zh = '水墨学者肖像，柔和渐变，右下角的一枚红色印章。';
  const literal = {
    'content/prompts/p_001/prompt-locales/zh-Hans/prompt.txt': zh,
    'content/prompts/p_001/prompt-locales/zh-Hans/annotations.yaml': 'annotations:\n  - sourcePhrase: a single red seal stamp in the lower right\n    phrase: 右下角的一枚红色印章\n',
  };
  const translatedTemplate = {
    'content/templates/t_001/locales/zh-Hans.mdx': zhFor('## How to adjust it\n\nChange the seal colour.\n', { ...enFm, title: 'Poster' }),
    'content/templates/t_001/versions/v1/prompt-locales/zh-Hans/body.txt': '{{product}}的{{palette}}海报。',
    'content/templates/t_001/versions/v1/prompt-locales/zh-Hans/variant.yaml': 'enumText:\n  palette: { warm: 暖色, cold: 冷色 }\nsamples:\n  default: { product: 马克杯, palette: warm }\n  second: { product: 茶叶罐, palette: cold }\n',
  };
  const derived = {
    'content/prompts/p_001/entry.yaml': promptEntry('p_001', 'ink-portrait').replace('promptSource: { type: literal, language: en }', 'promptSource: { type: template, templateId: t_001, version: v1, values: { product: a mug, palette: warm } }'),
    'content/prompts/p_001/prompt.txt': null,
    'content/prompts/p_001/prompt-locales/zh-Hans/variant.yaml': 'values: { product: 蓝色马克杯, palette: cold }\n',
  };

  it('selects available bodies, preserves annotations, and falls back only to the source', () => {
    const result = load(setup(literal), 'preview');
    expect(blocking(result.findings.list)).toEqual([]);
    const chinese = detail<PromptDetail>(result, 'prompt', 'zh-Hans', 'p_001')!;
    expect(chinese.prompt).toMatchObject({ text: zh, language: 'zh-Hans' });
    expect(chinese.annotations[0]).toMatchObject({ phrase: '右下角的一枚红色印章', start: zh.indexOf('右下角'), note: '控制印章' });
    expect(chinese.test).toMatchObject({ recordedOutput: false, lastTestedAt: null, verification: 'unknown' });
    for (const locale of ['en', 'ja']) expect(detail<PromptDetail>(result, 'prompt', locale, 'p_001')!.prompt).toMatchObject({ text: PROMPT, language: 'en' });
    const index = result.built!.locales.get('zh-Hans')!;
    const documents = searchDocuments({ index, prompt: () => chinese, template: () => null, pages: { collections: true, topics: true } });
    expect(documents.find((d) => d.id === 'prompt:p_001')!.body).toBe(zh);
  });

  it('keeps a present translation after the source prompt changes', () => {
    const result = load(setup({ ...literal, 'content/prompts/p_001/prompt.txt': `${PROMPT} Keep the edges soft.` }));
    expect(blocking(result.findings.list)).toEqual([]);
    expect(detail<PromptDetail>(result, 'prompt', 'zh-Hans', 'p_001')!.prompt.text).toBe(zh);
  });

  it('uses a Chinese source when English is unavailable', () => {
    const result = load(setup({
      'content/prompts/p_001/entry.yaml': promptEntry('p_001', 'ink-portrait').replace('language: en', 'language: zh-Hans'),
      'content/prompts/p_001/prompt.txt': zh,
    }));
    expect(blocking(result.findings.list)).toEqual([]);
    expect(detail<PromptDetail>(result, 'prompt', 'en', 'p_001')!.prompt).toMatchObject({ text: zh, language: 'zh-Hans' });
  });

  it('preserves Turkish source text in both page languages without enabling Turkish routes', () => {
    const text = "Kedimiz Robin’in GIF'ini oluştur. Kameraya baksın ve gözünü kırpsın.";
    const result = load(setup({
      'content/prompts/p_001/entry.yaml': promptEntry('p_001', 'ink-portrait').replace('language: en', 'language: tr'),
      'content/prompts/p_001/prompt.txt': text,
    }), 'preview');
    expect(blocking(result.findings.list)).toEqual([]);
    for (const locale of ['en', 'zh-Hans']) {
      expect(detail<PromptDetail>(result, 'prompt', locale, 'p_001')!.prompt).toMatchObject({ text, language: 'tr' });
    }
    expect(result.built!.locales.has('tr')).toBe(false);
  });

  it('renders localized templates with stable enum values and no borrowed generation evidence', () => {
    const result = load(setup(translatedTemplate));
    expect(blocking(result.findings.list)).toEqual([]);
    const chinese = detail<TemplateDetail>(result, 'template', 'zh-Hans', 't_001')!;
    expect(chinese.version.defaultPrompt).toBe('马克杯的暖色海报。');
    expect(chinese.promptLanguage).toBe('zh-Hans');
    expect(chinese.version.fields[1]).toMatchObject({ default: 'warm', options: [{ value: 'warm', renderText: '暖色' }, { value: 'cold', renderText: '冷色' }] });
    expect(chinese.version.samples[0]!.exampleIds).toEqual([]);
    expect(detail<TemplateDetail>(result, 'template', 'en', 't_001')!.version.defaultPrompt).toBe('Poster for a mug in warm.');
  });

  it('renders a derived prompt from its fixed template version and translated values', () => {
    const result = load(setup({ ...translatedTemplate, ...derived }));
    expect(blocking(result.findings.list)).toEqual([]);
    expect(detail<PromptDetail>(result, 'prompt', 'zh-Hans', 'p_001')).toMatchObject({ prompt: { text: '蓝色马克杯的冷色海报。', language: 'zh-Hans' }, template: { version: 'v1', values: { product: '蓝色马克杯', palette: 'cold' } } });
    expect(detail<PromptDetail>(result, 'prompt', 'en', 'p_001')!.prompt.text).toBe('Poster for a mug in warm.');
    const withoutValues = load(setup({ ...translatedTemplate, ...derived, 'content/prompts/p_001/prompt-locales/zh-Hans/variant.yaml': null }));
    expect(detail<PromptDetail>(withoutValues, 'prompt', 'zh-Hans', 'p_001')!.prompt.language).toBe('en');
  });

  it.each([
    ['missing annotation', { ...literal, 'content/prompts/p_001/prompt-locales/zh-Hans/annotations.yaml': null }, 'annotations'],
    ['empty prompt', { ...literal, 'content/prompts/p_001/prompt-locales/zh-Hans/prompt.txt': '  ' }, 'empty'],
    ['invalid locale', { 'content/prompts/p_001/prompt-locales/zh-hans/prompt.txt': zh }, 'registered'],
    ['duplicate source', { 'content/prompts/p_001/prompt-locales/en/prompt.txt': PROMPT }, 'source language'],
    ['missing template dependency', derived, 'has no zh-Hans'],
    ['unknown metadata', { ...translatedTemplate, 'content/templates/t_001/versions/v1/prompt-locales/zh-Hans/variant.yaml': 'reviewStatus: reviewed\nsamples: {}' }, 'Unrecognized'],
    ['missing option', { ...translatedTemplate, 'content/templates/t_001/versions/v1/prompt-locales/zh-Hans/variant.yaml': 'enumText: { palette: { warm: 暖色 } }\nsamples: {}' }, 'enumText.palette'],
    ['wrong placeholders', { ...translatedTemplate, 'content/templates/t_001/versions/v1/prompt-locales/zh-Hans/body.txt': '{{unknown}}海报。' }, 'placeholders'],
  ] as const)('rejects %s instead of silently falling back', (_name, patch, message) => {
    const result = load(setup(patch));
    expect(result.built).toBeNull();
    expect(blocking(result.findings.list).some((f) => f.message.includes(message))).toBe(true);
  });

  it('freezes a translated template used by a run without changing the source contract', () => {
    const root = setup(translatedTemplate);
    const initial = load(root);
    const template = initial.content.templates.get('t_001')!;
    const version = template.versions.get('v1')!;
    const sourceHash = templateContractHash(version.body, version.fields, version.inputs);
    const original = load(setup()).content.templates.get('t_001')!.versions.get('v1')!;
    expect(sourceHash).toBe(templateContractHash(original.body, original.fields, original.inputs));
    const selected = resolveTemplate(template, version, 'zh-Hans');
    const run = `id: x_002
promptLanguage: zh-Hans
template: { id: t_001, version: v1, sample: default, values: { product: 马克杯, palette: warm }, contractHash: ${sourceHash}, variantHash: ${selected.variantHash} }
promptSha256: ${sha256('马克杯的暖色海报。')}
outputAssetIds: [a_001]
recordedAt: 2026-11-05
model: { displayName: Test model }
`;
    const dir = path.join(root, 'content/examples/x_002');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'run.yaml'), run);
    fs.writeFileSync(path.join(dir, 'prompt.txt'), '马克杯的暖色海报。');
    const result = load(root);
    expect(blocking(result.findings.list)).toEqual([]);
    expect(detail<TemplateDetail>(result, 'template', 'zh-Hans', 't_001')!.version.samples[0]!.exampleIds).toEqual(['x_002']);
    fs.writeFileSync(path.join(dir, 'run.yaml'), run.replace(`, variantHash: ${selected.variantHash}`, ''));
    expect(blocking(load(root).findings.list).some((f) => f.message.includes('variantHash'))).toBe(true);
    fs.writeFileSync(path.join(dir, 'run.yaml'), run);
    fs.writeFileSync(path.join(root, 'content/templates/t_001/versions/v1/prompt-locales/zh-Hans/body.txt'), '{{product}}的{{palette}}海报！');
    expect(blocking(load(root).findings.list).some((f) => f.message.includes('variantHash'))).toBe(true);
  });

  it('validates localized defaults, lists and annotation ambiguity', () => {
    const base = setup(translatedTemplate);
    const fields = fs.readFileSync(path.join(base, 'content/templates/t_001/versions/v1/fields.yaml'), 'utf8');
    const result = load(setup({
      ...translatedTemplate,
      'content/templates/t_001/versions/v1/fields.yaml': fields.replace('maxLength: 40', 'default: a mug, maxLength: 40') + '  - { name: features, type: string-list, default: [simple, clean], separator: ", ", labels: { en: Features, zh-Hans: 特点 } }\n',
      'content/templates/t_001/versions/v1/body.txt': 'Poster for {{product}} in {{palette}}: {{features}}.',
      'content/templates/t_001/versions/v1/prompt-locales/zh-Hans/body.txt': '{{product}}的{{palette}}海报：{{features}}。',
      'content/templates/t_001/versions/v1/prompt-locales/zh-Hans/variant.yaml': 'defaults: { product: 马克杯, features: [简洁, 干净] }\nenumText: { palette: source }\nseparators: { features: "；" }\nsamples: { default: { product: 马克杯, palette: warm, features: [简洁, 干净] }, second: { product: 茶罐, palette: cold, features: [质感] } }\n',
      'content/examples/x_001/run.yaml': null,
      'content/examples/x_001/prompt.txt': null,
    }));
    expect(blocking(result.findings.list)).toEqual([]);
    const template = detail<TemplateDetail>(result, 'template', 'zh-Hans', 't_001')!;
    expect(template.version.defaultPrompt).toBe('马克杯的warm海报：简洁；干净。');
    expect(template.version.fields[0]!.default).toBe('马克杯');
    const ambiguous = load(setup({ ...literal, 'content/prompts/p_001/prompt-locales/zh-Hans/prompt.txt': zh + zh }));
    expect(blocking(ambiguous.findings.list).some((f) => f.message.includes('exactly once'))).toBe(true);
  });

  it('matches only the exact language and text of a recorded literal run', () => {
    const result = load(setup({
      ...literal,
      'content/examples/x_002/prompt.txt': zh,
      'content/examples/x_002/run.yaml': `id: x_002\npromptId: p_001\npromptLanguage: zh-Hans\npromptSha256: ${sha256(zh)}\noutputAssetIds: [a_001]\nrecordedAt: 2026-11-05\nmodel: { displayName: Test model }\n`,
    }));
    expect(blocking(result.findings.list)).toEqual([]);
    expect(detail<PromptDetail>(result, 'prompt', 'zh-Hans', 'p_001')!.test).toMatchObject({ recordedOutput: true, lastTestedAt: '2026-11-05' });
    expect(detail<PromptDetail>(result, 'prompt', 'en', 'p_001')!.test.recordedOutput).toBe(false);
  });
});
