import { homeIsIndexable } from './support/home';
import { createHash } from 'node:crypto';
import { promptJsonFile } from '../../src/modules/feed/files';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';
import type { PromptDetail, TemplateDetail } from '../../src/modules/content/types';
import { BASE, BUILD, homePath, ROOT, message, publicUrl } from './support/artifact';
import {
  listIsIndexable,
  feedIndex,
  feedPage,
  localeIndex,
  pagePromptIds,
  promptDetail,
  samplePrompt,
  sampleTemplate,
  templateDetail,
} from './support/content';
import { alternates, canonical, elementText } from './support/html';

// Search engines and AI tools as the artifact serves them (design doc §9.3, §9.6, §9.7, §9.10,
// §16.2 "元数据" "结构化数据" "图片搜索" "AI 可见性", §17.3 step 3b): sitemaps list every published
// page and nothing else, structured data and Markdown versions say what the visible page says,
// and drafts and preview-only locales never reach a sitemap, index.md or llms.txt.

const publicLocales = BUILD.buildMode === 'production' ? BUILD.locales.filter((l) => l.enabled) : [];
const previewOnly = BUILD.locales.filter((l) => !l.enabled);
const origin = `${BUILD.origin}${BASE}/`;

/** Local path to request for a public URL of this build. */
const local = (url: string) => {
  expect(url.startsWith(origin), `${url} is on the canonical host under the base path`).toBe(true);
  return url.slice(BUILD.origin.length);
};

const xmlValues = (xml: string, tag: string) =>
  [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g'))].map((m) => m[1]!.replace(/&amp;/g, '&'));

/** Every <url> of a sitemap with its date and images. */
function urlEntries(xml: string) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: xmlValues(m[1]!, 'loc')[0]!,
    lastmod: xmlValues(m[1]!, 'lastmod')[0] ?? null,
    images: xmlValues(m[1]!, 'image:loc'),
  }));
}

function jsonLd(html: string): Record<string, unknown>[] {
  const docs = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]!) as { '@graph': Record<string, unknown>[] },
  );
  return docs.flatMap((d) => d['@graph']);
}
/** The first node of a type. JSON-LD is read back loosely: the assertions name the fields they need. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const node = (html: string, type: string) => jsonLd(html).find((n) => n['@type'] === type) as Record<string, any>;

const markdownLink = (html: string) =>
  /<link rel="alternate" type="text\/markdown" href="([^"]+)"\/>/.exec(html)?.[1] ?? null;

const decode = (text: string) =>
  text
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** The visible breadcrumb: label and link of each item. */
function breadcrumb(html: string, label: string) {
  const nav = new RegExp(`<nav aria-label="${label}"[^>]*>([\\s\\S]*?)</nav>`).exec(html)?.[1] ?? '';
  return [...nav.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => ({
    name: decode(m[1]!),
    href: /href="([^"]+)"/.exec(m[1]!)?.[1] ?? null,
  }));
}

/** The text of the prompt sheet (its id ends in "-prompt"). */
const promptText = (html: string) => {
  const inner = /<div id="[^"]*-prompt"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1];
  return inner === undefined ? null : decode(inner);
};

/** The first fenced block of a Markdown document. */
const firstCodeBlock = (md: string) => /^(`{3,})text\n([\s\S]*?)\n\1$/m.exec(md)?.[2] ?? null;
const unescapeMd = (text: string) => text.replace(/\\([\\`*_[\]<>|])/g, '$1');

/** "Updated {date}" as the page formats it (§11.9: absolute dates in UTC). */
const visibleDate = (code: string, date: string) =>
  new Intl.DateTimeFormat(`${code}-u-nu-latn`, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );

async function get(request: APIRequestContext, url: string) {
  const res = await request.get(url);
  expect(res.status(), url).toBe(200);
  return res;
}

// ---------------------------------------------------------------------------------------------
// Sitemaps (§9.3, §9.7)

test('the sitemap index lists one sitemap per public locale, and only those', async ({ request }) => {
  const res = await get(request, `${BASE}/sitemap.xml`);
  expect(res.headers()['content-type']).toMatch(/xml/);
  const locs = xmlValues(await res.text(), 'loc');
  expect(locs).toEqual(publicLocales.map((l) => publicUrl(`/${l.pathPrefix}/sitemap-pages.xml`)));
  for (const l of previewOnly)
    expect((await request.get(`${BASE}/${l.pathPrefix}/sitemap-pages.xml`)).status()).toBe(404);
});

for (const locale of publicLocales) {
  test(`${locale.code}: the sitemap lists every published page with its content date and main image`, async ({
    request,
  }) => {
    const entries = urlEntries(await (await get(request, `${BASE}/${locale.pathPrefix}/sitemap-pages.xml`)).text());
    const byLoc = new Map(entries.map((e) => [e.loc, e]));
    expect(byLoc.size, 'no address twice').toBe(entries.length);
    expect(byLoc.has(publicUrl(homePath(locale)))).toBe(homeIsIndexable(locale.code));
    if (locale.code === BUILD.defaultLocale) expect(byLoc.has(publicUrl(`/${locale.pathPrefix}/`))).toBe(false);

    // Every published prompt and template is there, with its date and main image; no draft is.
    const index = localeIndex(locale.code);
    for (const e of [...index.prompts, ...index.templates]) {
      const entry = byLoc.get(publicUrl(e.path));
      if (!e.localization.indexable) {
        expect(entry, `draft ${e.id}`).toBeUndefined();
        continue;
      }
      expect(entry, e.id).toBeDefined();
      expect(entry!.lastmod).toBe(e.updatedAt);
      if (e.cover) expect(entry!.images).toEqual([publicUrl(`/${e.cover.variants.detail!.key}`)]);
    }
    // Every page of the list, newest work first.
    for (let n = 1; n <= feedIndex(locale.code).pageCount; n++)
      expect(
        byLoc.has(publicUrl(n === 1 ? `/${locale.pathPrefix}/prompts/` : `/${locale.pathPrefix}/prompts/page/${n}/`)),
      ).toBe(listIsIndexable(locale.code, n));
  });

  test(`${locale.code}: every sitemap address is a page whose canonical is that address`, async ({ request }) => {
    const entries = urlEntries(await (await get(request, `${BASE}/${locale.pathPrefix}/sitemap-pages.xml`)).text());
    const all = new Set<string>();
    for (const l of publicLocales)
      for (const e of urlEntries(await (await get(request, `${BASE}/${l.pathPrefix}/sitemap-pages.xml`)).text()))
        all.add(e.loc);
    // Drafts of a preview build are built (and listed in hreflang, noindex) but never in a sitemap.
    const drafts = new Set(
      publicLocales.flatMap((l) => {
        const index = localeIndex(l.code);
        return [...index.prompts, ...index.templates]
          .filter((x) => x.visibility !== 'published')
          .map((x) => publicUrl(x.path));
      }),
    );
    const publicLangs = new Set(publicLocales.map((l) => l.htmlLang));
    await Promise.all(
      entries.map(async (e) => {
        const html = await (await get(request, local(e.loc))).text();
        expect(canonical(html), e.loc).toBe(e.loc);
        // Published versions in public locales that hreflang names are listed too (§16.2 "元数据").
        for (const [lang, href] of Object.entries(alternates(html)))
          if (lang !== 'x-default' && publicLangs.has(lang) && !drafts.has(href))
            expect(all.has(href), `${e.loc} → ${href}`).toBe(true);
        for (const image of e.images) expect((await request.head(local(image))).status(), image).toBe(200);
      }),
    );
  });
}

// ---------------------------------------------------------------------------------------------
// robots.txt (§9.10.2, §15.4.3)

test('robots.txt allows search and AI search, applies the training policy and names the sitemap', async ({
  request,
}) => {
  const res = await get(request, `${BASE}/robots.txt`);
  expect(res.headers()['content-type']).toMatch(/^text\/plain/);
  const text = await res.text();
  const scope = `${BASE}/`;
  const group = (agent: string) =>
    text
      .split(/\n\n+/)
      .find((block) => block.split('\n').includes(`User-agent: ${agent}`))
      ?.split('\n')
      .filter((l) => !l.startsWith('#') && !l.startsWith('User-agent:'));
  for (const agent of ['*', 'OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'ChatGPT-User', 'Claude-User'])
    expect(group(agent), agent).toEqual([`Allow: ${scope}`]);
  for (const agent of ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'])
    expect(group(agent)?.[0], agent).toMatch(new RegExp(`^(Allow|Disallow): ${scope}$`));
  expect(text).toContain(`Sitemap: ${publicUrl('/sitemap.xml')}`);

  // Under a subpath crawlers never read this file: the host merges the generated snippet (snippet
  // mode), which holds the same rules. At the root the file is the host's own.
  const snippet = path.join(ROOT, 'deploy/generated/robots-snippet.txt');
  if (!BASE) expect(fs.existsSync(snippet)).toBe(false);
  if (fs.existsSync(snippet)) expect(fs.readFileSync(snippet, 'utf8')).toBe(text);
});

// ---------------------------------------------------------------------------------------------
// Markdown versions (§9.10.4)

for (const locale of publicLocales) {
  test(`${locale.code}: a prompt's index.md is Markdown, canonical to its page, and says what the page says`, async ({
    request,
  }) => {
    const d = samplePrompt(locale.code);
    const html = await (await get(request, `${BASE}${d.path}`)).text();
    const mdUrl = markdownLink(html);
    expect(mdUrl).toBe(publicUrl(`${d.path}index.md`));

    const res = await get(request, local(mdUrl!));
    expect(res.headers()['content-type']).toMatch(/^text\/markdown/);
    expect(res.headers()['link']).toBe(`<${publicUrl(d.path)}>; rel="canonical"`);
    const md = await res.text();
    const [h1, summary] = md.split('\n\n');
    expect(unescapeMd(h1!.replace(/^# /, ''))).toBe(elementText(html, 'h1'));
    expect(unescapeMd(summary!)).toBe(d.description);
    expect(firstCodeBlock(md)).toBe(promptText(html));
    expect(md).toContain(`<${publicUrl(d.path)}>`);
    if (d.test.lastTestedAt) expect(md).toContain(d.test.lastTestedAt);
  });

  test(`${locale.code}: a template's index.md holds the default prompt the page shows`, async ({ request }) => {
    const summary = localeIndex(locale.code).templates.find((x) => x.visibility === 'published');
    test.skip(!summary, 'no published template in this locale');
    const t = templateDetail(locale.code, summary!.id);
    const html = await (await get(request, `${BASE}${t!.path}`)).text();
    const res = await get(request, local(markdownLink(html)!));
    const md = await res.text();
    expect(unescapeMd(md.split('\n\n')[0]!.replace(/^# /, ''))).toBe(elementText(html, 'h1'));
    expect(firstCodeBlock(md)).toBe(t!.version.defaultPrompt);
    expect(promptText(html)).toBe(t!.version.defaultPrompt);
  });
}

test('drafts and preview-only locales have no index.md and no Markdown alternate', async ({ request }) => {
  const hidden: { path: string }[] = [];
  for (const l of BUILD.locales) {
    const index = localeIndex(l.code);
    hidden.push(...[...index.prompts, ...index.templates].filter((e) => !e.localization.indexable));
  }
  test.skip(!hidden.length, 'this build has no drafts');
  for (const e of hidden.slice(0, 12)) {
    const html = await (await get(request, `${BASE}${e.path}`)).text();
    expect(markdownLink(html), e.path).toBeNull();
    expect((await request.get(`${BASE}${e.path}index.md`)).status(), e.path).toBe(404);
  }
});

// ---------------------------------------------------------------------------------------------
// llms.txt (§9.10.4)

for (const code of [BUILD.defaultLocale, 'zh-Hans'])
  test(`${code}: llms.txt links only published, reachable content`, async ({ request }) => {
    const locale = BUILD.locales.find((entry) => entry.code === code && entry.enabled);
    test.skip(!locale);
    const directory = code === BUILD.defaultLocale ? '/llms.txt' : `/${locale!.pathPrefix}/llms.txt`;
    const res = await get(request, `${BASE}${directory}`);
    expect(res.headers()['content-type']).toMatch(/^text\/plain/);
    const text = await res.text();
    if (BUILD.buildMode === 'preview') {
      expect(text).toBe('');
      return;
    }
    expect(text.startsWith(`# ${BUILD.siteName}\n\n> `)).toBe(true);
    const links = [...text.matchAll(/\]\((https?:[^)\s]+)\)/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThan(0);
    const internal = links.filter((url) => url.startsWith(origin));
    for (const group of Array.from({ length: Math.ceil(internal.length / 24) }, (_, i) =>
      internal.slice(i * 24, (i + 1) * 24),
    ))
      await Promise.all(
        group.map(async (url) => expect((await request.head(local(url.split('#')[0]!))).status(), url).toBe(200)),
      );
    for (const l of previewOnly) expect(text).not.toContain(`${origin}${l.pathPrefix}/`);
    const index = localeIndex(code);
    for (const entry of [...index.prompts, ...index.templates])
      expect(internal.includes(publicUrl(`${entry.path}index.md`)), entry.id).toBe(entry.localization.indexable);
  });

test('datasets match their byte hashes and complete indexable prompt and template inventories', async ({ request }) => {
  const directory = `${BASE}/generated/datasets/v2`;
  if (BUILD.buildMode === 'preview') {
    for (const file of ['manifest.json', 'en.json', 'zh-Hans.json']) {
      expect(fs.existsSync(path.join(ROOT, 'dist', directory, file))).toBe(false);
      expect((await request.get(`${directory}/${file}`)).status()).toBe(404);
    }
    return;
  }
  const res = await get(request, `${directory}/manifest.json`);
  expect(res.headers()['content-type']).toMatch(/^application\/json/);
  const manifest = (await res.json()) as {
    files: { locale: string; url: string; prompts: number; templates: number; sha256: string }[];
  };
  expect(manifest).toMatchObject({ format: 'prompt-seen/content-export', version: 2, buildId: BUILD.buildId });
  expect(manifest.files.map((file) => file.locale)).toEqual(
    publicLocales.filter((entry) => ['en', 'zh-Hans'].includes(entry.code)).map((entry) => entry.code),
  );
  for (const info of manifest.files) {
    const data = await get(request, local(info.url));
    expect(data.headers()['content-type']).toMatch(/^application\/json/);
    expect(
      createHash('sha256')
        .update(await data.body())
        .digest('hex'),
    ).toBe(info.sha256);
    const payload = await data.json();
    const entry = localeIndex(info.locale);
    expect(payload).toMatchObject({
      format: 'prompt-seen/content-export',
      version: 2,
      locale: info.locale,
      buildId: BUILD.buildId,
    });
    expect(payload.prompts).toHaveLength(info.prompts);
    expect(payload.templates).toHaveLength(info.templates);
    for (const kind of ['prompts', 'templates'] as const) {
      const expected = entry[kind].filter((item) => item.localization.indexable);
      expect(payload[kind].map((item: { url: string }) => item.url)).toEqual(
        expected.map((item) => publicUrl(item.path)),
      );
    }
  }
});

const featuredRuns = {
  p_123: 'x_168',
  p_153: 'x_269',
  p_053: 'x_097',
  p_043: 'x_087',
  p_024: 'x_068',
  p_045: 'x_089',
  p_097: 'x_141',
  p_217: 'x_281',
  p_019: 'x_063',
  p_084: 'x_128',
  p_138: 'x_183',
  p_218: 'x_282',
  p_146: 'x_191',
  p_274: 'x_338',
  p_275: 'x_339',
  p_279: 'x_343',
  p_287: 'x_351',
  p_398: 'x_462',
  p_389: 'x_453',
  p_370: 'x_434',
};

test('Simplified Chinese: recovered translations restore their aggregate entry points', async ({ request }) => {
  test.skip(BUILD.buildMode !== 'production');
  const locale = publicLocales.find((entry) => entry.code === 'zh-Hans');
  test.skip(!locale);
  const index = localeIndex('zh-Hans');
  const required = [
    'p_013',
    'p_019',
    'p_026',
    'p_034',
    'p_044',
    'p_048',
    'p_053',
    'p_064',
    'p_070',
    'p_075',
    'p_080',
    'p_084',
    'p_088',
    'p_097',
    'p_099',
    'p_066',
    'p_007',
    'p_058',
    'p_123',
    'p_153',
    'p_218',
    't_003',
    't_001',
    't_017',
  ];
  const library = [...index.prompts, ...index.templates];
  for (const id of required)
    expect(library.find((entry) => entry.id === id)?.localization, id).toMatchObject({
      localStatus: 'current',
      indexable: true,
      contentLocale: 'zh-Hans',
    });
  const prefix = `/${locale!.pathPrefix}`;
  const sitemap = urlEntries(await (await get(request, `${BASE}${prefix}/sitemap-pages.xml`)).text());
  const expected = [
    `${prefix}/`,
    `${prefix}/prompts/`,
    `${prefix}/templates/`,
    `${prefix}/collections/`,
    ...Array.from({ length: feedIndex(locale!.code).pageCount - 1 }, (_, i) => `${prefix}/prompts/page/${i + 2}/`),
    ...['c_001', 'c_002', 'c_003', 'c_005', 'c_008', 'c_009'].map(
      (id) => index.collections.find((item) => item.id === id)!.path,
    ),
  ];
  for (const internal of expected) {
    const url = publicUrl(internal);
    expect(
      sitemap.some((entry) => entry.loc === url),
      internal,
    ).toBe(true);
    const page = await get(request, `${BASE}${internal}`);
    const html = await page.text();
    expect(page.headers()['x-robots-tag'] ?? '').not.toContain('noindex');
    expect(canonical(html)).toBe(url);
    expect(alternates(html)[locale!.htmlLang]).toBe(url);
    expect(jsonLd(html).length).toBeGreaterThan(0);
  }
});

for (const code of ['en', 'zh-Hans']) {
  test(`${code}: editorial topics, collections and testing method are discoverable`, async ({ request }) => {
    const locale = publicLocales.find((entry) => entry.code === code);
    test.skip(!locale);
    const prefix = `/${locale!.pathPrefix}`;
    const sitemap = urlEntries(await (await get(request, `${BASE}${prefix}/sitemap-pages.xml`)).text());
    const entries = [
      'categories/product',
      'categories/poster',
      'categories/portrait',
      'use-cases/social-post',
      'use-cases/packaging',
      'collections/design-ai-product-commercial',
      'collections/english-social-reactions',
      'collections/social-nine-frame-composed-gifs',
    ];
    for (const entry of entries) {
      const internal = `${prefix}/${entry}/`;
      const url = publicUrl(internal);
      expect(
        sitemap.some((item) => item.loc === url),
        internal,
      ).toBe(true);
      const html = await (await get(request, `${BASE}${internal}`)).text();
      expect(canonical(html)).toBe(url);
      expect(node(html, 'CollectionPage')?.mainEntity.numberOfItems).toBeGreaterThanOrEqual(3);
    }
    const about = await (await get(request, `${BASE}${prefix}/about/`)).text();
    expect(about).toContain('id="testing-method"');
    for (const [id, run] of Object.entries({ p_123: 'x_168', p_217: 'x_281', p_287: 'x_351' })) {
      const path = `${BASE}${promptDetail(code, id).path}`;
      expect(about).toContain(`href="${path}#run-${run}"`);
      expect(await (await get(request, path)).text()).toContain(`id="run-${run}"`);
    }
  });
}

for (const code of ['en', 'zh-Hans']) {
  test(`${code}: 20 cases agree across HTML, Markdown, popup and dataset`, async ({ request }) => {
    test.skip(BUILD.buildMode !== 'production' || !publicLocales.some((locale) => locale.code === code));
    const data = await (await get(request, `${BASE}/generated/datasets/v2/${code}.json`)).json();
    const locale = publicLocales.find((locale) => locale.code === code)!;
    const sitemap = urlEntries(await (await get(request, `${BASE}/${locale.pathPrefix}/sitemap-pages.xml`)).text());
    for (const [id, runId] of Object.entries(featuredRuns)) {
      const d = promptDetail(code, id);
      const f = d.facts!;
      const canonicalUrl = publicUrl(d.path);
      expect(d.localization.indexable, id).toBe(true);
      expect(
        sitemap.some(({ loc }) => loc === canonicalUrl),
        id,
      ).toBe(true);
      expect(f, id).toMatchObject({
        exampleRunId: runId,
        observation: expect.stringMatching(/\S/),
        limitation: expect.stringMatching(/\S/),
      });
      const run = d.examples.find((example) => example.id === runId)!;
      const exported = data.prompts.find((record: { id: string }) => record.id === id);
      expect(exported).toMatchObject({ url: canonicalUrl, facts: f });
      expect(exported.facts.references.map((img: { assetId: string }) => img.assetId)).toEqual(f.referenceAssetIds);
      expect(exported.facts.outputs.map((img: { assetId: string }) => img.assetId)).toEqual(f.outputAssetIds);
      const [page, markdown, popup] = await Promise.all([
        get(request, `${BASE}${d.path}`),
        get(request, `${BASE}${d.path}index.md`),
        get(request, `${BASE}/generated/${promptJsonFile(code, d.slug)}`),
      ]);
      const html = await page.text();
      const md = await markdown.text();
      expect(page.headers()['x-robots-tag'] ?? '').not.toContain('noindex');
      expect(canonical(html)).toBe(canonicalUrl);
      expect(markdown.headers()['content-type']).toMatch(/^text\/markdown/);
      expect(markdown.headers()['link']).toContain(`<${canonicalUrl}>; rel="canonical"`);
      expect(html).toContain(`data-example-run="${runId}"`);
      expect(decode(html)).toContain(f.observation);
      expect(decode(html)).toContain(f.limitation);
      expect(md).toContain(f.model.displayName);
      expect(unescapeMd(md)).toContain(f.observation);
      expect(unescapeMd(md)).toContain(f.limitation);
      expect(md).toContain(f.examplePrompt.text);
      expect(await popup.json()).toMatchObject({ facts: f });
      expect(run.outputs.map(({ assetId }) => assetId)).toEqual(f.outputAssetIds);
      expect(node(html, 'WebPage')).toMatchObject({
        '@id': `${canonicalUrl}#webpage`,
        inLanguage: locale.htmlLang,
        mainEntity: { '@id': `${canonicalUrl}#work` },
      });
      expect(node(html, 'CreativeWork').inLanguage).toBe(d.prompt.language);
      if (id === 'p_123') expect(f.matchingRunIds).toEqual(['x_168']);
      if (id === 'p_218') {
        expect(f.referenceAssetIds).toEqual(['a_373', 'a_374']);
        expect(f.outputAssetIds).toEqual(['a_372']);
      }
      if (id === 'p_053') {
        expect(d.test.referenceImage).toBe('optional');
        expect(f.referenceAssetIds).toEqual([]);
      }
      if (id === 'p_287' || id === 'p_398') {
        const expected = id === 'p_287' ? { frameCount: 9, durationMs: 2400 } : { frameCount: 12, durationMs: 1920 };
        expect(exported.facts.outputs[0]).toMatchObject({ mimeType: 'image/gif', animation: expected });
        expect(md).toContain(message(code, 'primitives.media.gifGenerated', { model: 'GPT Image 2.6' }));
      }
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Structured data (§9.6): consistent with the visible page

for (const locale of BUILD.locales) {
  test(`${locale.code}: a prompt's structured data matches its title, dates, author and breadcrumb`, async ({
    request,
  }) => {
    const d: PromptDetail = samplePrompt(locale.code);
    const html = await (await get(request, `${BASE}${d.path}`)).text();
    const work = node(html, 'CreativeWork');
    if (!d.localization.indexable) {
      expect(work).toBeUndefined();
      return;
    }
    expect(work).toMatchObject({
      url: publicUrl(d.path),
      name: elementText(html, 'h1'),
      description: d.description,
      text: promptText(html),
      inLanguage: d.prompt.language,
      datePublished: d.createdAt,
      dateModified: d.updatedAt,
    });
    expect(node(html, 'WebPage')).toMatchObject({
      '@id': `${publicUrl(d.path)}#webpage`,
      inLanguage: locale.htmlLang,
      mainEntity: { '@id': `${publicUrl(d.path)}#work` },
    });
    expect(decode(html)).toContain(
      message(locale.code, 'detail.test.updated', { date: visibleDate(locale.code, d.updatedAt) }),
    );
    if (d.source.author) {
      expect(work.creditText ?? work.author?.name).toBe(d.source.author);
      expect(decode(html)).toContain(message(locale.code, 'detail.source.author', { author: d.source.author }));
    } else expect(work.author).toBeUndefined();
    // The main image is reachable and sized as the variant it names.
    const image = work.image;
    expect((await request.head(local(image.contentUrl))).status()).toBe(200);
    expect([image.width, image.height]).toEqual([d.cover.variants.detail!.width, d.cover.variants.detail!.height]);

    const crumbs = breadcrumb(html, message(locale.code, 'detail.breadcrumb.label'));
    expect(crumbs.at(-1)).toMatchObject({ name: d.title, href: null });
    const list = node(html, 'BreadcrumbList');
    expect(list.itemListElement.map((i: { name: string }) => i.name)).toEqual(crumbs.map((c) => c.name));
    expect(list.itemListElement.map((i: { item?: string }) => i.item ?? null)).toEqual(
      crumbs.map((c) => (c.href ? `${BUILD.origin}${c.href}` : null)),
    );
  });

  test(`${locale.code}: a template's structured data is its default prompt and current version`, async ({
    request,
  }) => {
    const t: TemplateDetail | null = sampleTemplate(locale.code);
    test.skip(!t, 'no template in this locale');
    const html = await (await get(request, `${BASE}${t!.path}`)).text();
    if (!t!.localization.indexable) {
      expect(node(html, 'CreativeWork')).toBeUndefined();
      return;
    }
    expect(node(html, 'CreativeWork')).toMatchObject({
      name: elementText(html, 'h1'),
      text: promptText(html),
      version: t!.version.id,
      inLanguage: t!.promptLanguage,
    });
  });

  test(`${locale.code}: list pages describe their works in visible order`, async ({ request }) => {
    const pages = feedIndex(locale.code).pageCount;
    for (const n of [1, pages]) {
      const page = feedPage(locale.code, n);
      const html = await (
        await get(
          request,
          n === 1 ? `${BASE}/${locale.pathPrefix}/prompts/` : `${BASE}/${locale.pathPrefix}/prompts/page/${n}/`,
        )
      ).text();
      if (!listIsIndexable(locale.code, n)) {
        expect(node(html, 'CollectionPage')).toBeUndefined();
        expect(html).toMatch(/<meta name="robots" content="noindex/);
        continue;
      }
      const collection = node(html, 'CollectionPage');
      expect(collection.url).toBe(canonical(html));
      const items = collection.mainEntity.itemListElement as { position: number; url: string }[];
      const ids = pagePromptIds(page);
      expect(items.map((i) => i.url)).toEqual(ids.map((id) => publicUrl(promptDetail(locale.code, id).path)));
      expect(items.map((i) => i.position)).toEqual(ids.map((_, i) => page.offset + i + 1));
    }
  });

  test(`${locale.code}: the home page names the site and its publisher`, async ({ request }) => {
    const html = await (await get(request, `${BASE}/${locale.pathPrefix}/`)).text();
    if (!homeIsIndexable(locale.code)) {
      expect(node(html, 'WebSite')).toBeUndefined();
      return;
    }
    expect(node(html, 'WebSite')).toMatchObject({
      url: publicUrl(homePath(locale)),
      inLanguage: locale.htmlLang,
    });
    expect(node(html, 'Organization')).toMatchObject({ name: BUILD.siteName, url: publicUrl('/') });
    expect((await request.head(local(node(html, 'Organization').logo))).status()).toBe(200);
  });
}

// ---------------------------------------------------------------------------------------------
// Share images (§9.3, §9.7)

test('share images are the og crop: 1200 × 630, or that ratio when the original is smaller', async ({ request }) => {
  const d = samplePrompt(BUILD.defaultLocale);
  const html = await (await get(request, `${BASE}${d.path}`)).text();
  const meta = (property: string) => new RegExp(`<meta property="${property}" content="([^"]*)"`).exec(html)?.[1];
  const [w, h] = [Number(meta('og:image:width')), Number(meta('og:image:height'))];
  expect(w).toBeLessThanOrEqual(1200);
  expect(Math.abs(w / h - 1200 / 630)).toBeLessThan(0.01);
  expect((await request.head(local(meta('og:image')!))).status()).toBe(200);
});

for (const code of ['en', 'zh-Hans']) {
  test(`${code}: translated prompt HTML, popup, Markdown and structured data agree`, async ({ request }) => {
    for (const id of ['p_217', 'p_024']) {
      const detail = promptDetail(code, id);
      const html = await (await get(request, `${BASE}${detail.path}`)).text();
      expect(promptText(html)).toBe(detail.prompt.text);
      const work = node(html, 'CreativeWork');
      if (detail.localization.indexable) {
        expect(work.text).toBe(detail.prompt.text);
        expect(work.inLanguage).toBe(detail.prompt.language);
      } else expect(work).toBeUndefined();
      const popup = await (await get(request, `${BASE}/generated/${code}/prompts/${detail.slug}.json`)).json();
      expect(popup.prompt).toEqual(detail.prompt);
      expect(popup.annotations).toEqual(detail.annotations);
      if (detail.localization.indexable) {
        const md = await (await get(request, `${BASE}${detail.path}index.md`)).text();
        expect(firstCodeBlock(md)).toBe(detail.prompt.text);
      } else expect((await request.get(`${BASE}${detail.path}index.md`)).status()).toBe(404);
    }
  });
}
