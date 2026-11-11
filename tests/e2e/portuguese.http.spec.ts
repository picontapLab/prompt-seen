import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';
import type { PromptDetail } from '../../src/modules/content/types';
import { BASE, BUILD, ROOT, message, publicUrl } from './support/artifact';
import { feedIndex, feedPage, localeIndex, pagePromptIds, promptDetail, templateDetail } from './support/content';
import {
  alternates,
  canonical,
  dataAttr,
  elementText,
  htmlElement,
  localReferences,
  robots,
  title,
} from './support/html';
import { homeAlternates, worksOnShow } from './support/home';

// Portuguese spec PT01/PT13–PT15: use the actual packaged artifact in root, subpath and
// preview builds. Release runs set PT_BR_REQUIRE_ENABLED=1 so a missing locale cannot pass
// by exercising only the preparation-state branch. No Portuguese acceptance test is skipped.
const code = 'pt-BR';
const prefix = '/pt-br';
const portuguese = BUILD.locales.find((locale) => locale.code === code);
const production = BUILD.buildMode === 'production';
const decode = (text: string) =>
  text
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const meta = (html: string, name: string) =>
  new RegExp(`<meta (?:property|name)="${name}" content="([^"]*)"`).exec(html)?.[1] ?? null;
const xmlLocations = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]!));
const promptBlock = (html: string) => /<div id="[^"]*-prompt"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1];
const firstCodeBlock = (markdown: string) => /^(`{3,})text\n([\s\S]*?)\n\1$/m.exec(markdown)?.[2] ?? null;
const graphNodes = (html: string): Record<string, unknown>[] =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(
    (m) => (JSON.parse(m[1]!) as { '@graph': Record<string, unknown>[] })['@graph'],
  );
async function get(request: APIRequestContext, internal: string) {
  const response = await request.get(`${BASE}${internal}`);
  expect(response.status(), internal).toBe(200);
  return response;
}
function expectPrefix(html: string) {
  if (BASE) expect(localReferences(html).filter((ref) => !ref.startsWith(`${BASE}/`))).toEqual([]);
  expect(localReferences(html).filter((ref) => /^\/(?:pt|pt-PT|pt-pt|pt-BR)\//.test(ref.slice(BASE.length)))).toEqual(
    [],
  );
}

test('pt-BR: build availability and public entry points match the release state', async ({ request }) => {
  if (process.env.PT_BR_REQUIRE_ENABLED === '1') {
    expect(portuguese, 'release artifact must actually include Portuguese').toBeDefined();
    expect(portuguese?.enabled, 'release artifact must enable Portuguese').toBe(true);
  }
  const root = await (await get(request, '/')).text();
  const sitemap = await (await get(request, '/sitemap.xml')).text();
  const llms = await (await get(request, '/llms.txt')).text();
  if (!portuguese) {
    expect(root).not.toContain(`href="${BASE}${prefix}/"`);
    expect(alternates(root)).not.toHaveProperty(code);
    expect(sitemap).not.toContain(`${prefix}/`);
    expect(llms).not.toContain(`${prefix}/`);
    for (const url of [`${prefix}/`, `${prefix}/sitemap-pages.xml`, '/generated/pt-BR/feed/latest/1.json'])
      expect((await request.get(`${BASE}${url}`)).status(), url).toBe(404);
    return;
  }
  expect(portuguese).toMatchObject({
    pathPrefix: 'pt-br',
    htmlLang: 'pt-BR',
    direction: 'ltr',
    nativeName: 'Português (Brasil)',
  });
  expect(root).toContain(`href="${BASE}${prefix}/"`);
  expect(sitemap.includes(publicUrl(`${prefix}/sitemap-pages.xml`))).toBe(production && portuguese.enabled);
  expect(llms.includes(publicUrl(`${prefix}/`))).toBe(production && portuguese.enabled);
  for (const unsupported of ['/pt/', '/pt-pt/', '/pt-PT/'])
    expect((await request.get(`${BASE}${unsupported}`, { maxRedirects: 0 })).status(), unsupported).toBe(404);
});

if (portuguese) {
  test('pt-BR: home has localized SEO, a real showcase and reciprocal hreflang', async ({ request }) => {
    const response = await request.get(`${BASE}${prefix}/`, {
      headers: { 'accept-language': 'pt-PT,pt;q=0.9,en;q=0.8' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(htmlElement(html)).toEqual({ lang: code, dir: 'ltr' });
    expect(title(html)).toBe(message(code, 'home.documentTitle', { siteName: BUILD.siteName }));
    expect(elementText(html, 'h1')).toBe(message(code, 'home.hero.title'));
    expect(canonical(html)).toBe(publicUrl(`${prefix}/`));
    expect(meta(html, 'og:locale')).toBe('pt_BR');
    expect(alternates(html)).toEqual(homeAlternates(code));
    expect(robots(html).some((value) => value.includes('noindex'))).toBe(!production);
    const showcase = worksOnShow(code);
    expect(showcase.length, 'source-only Portuguese still has work on show').toBeGreaterThan(0);
    expect(dataAttr(html, 'on-show')).toBe(showcase[0]);
    expectPrefix(html);
    for (const [lang, url] of Object.entries(alternates(html))) {
      if (lang === 'x-default') continue;
      expect(url.startsWith(`${BUILD.origin}${BASE}/`)).toBe(true);
      const other = await request.get(url.slice(BUILD.origin.length));
      expect(other.status()).toBe(200);
      expect(alternates(await other.text())[code], lang).toBe(publicUrl(`${prefix}/`));
    }
    const root = await request.get(`${BASE}/`, {
      headers: { 'accept-language': 'pt-BR' },
      maxRedirects: 0,
    });
    expect(root.status()).toBe(200);
    expect(htmlElement(await root.text()).lang).toBe(
      BUILD.locales.find((l) => l.code === BUILD.defaultLocale)!.htmlLang,
    );
  });

  for (const [id, language] of [
    ['p_217', 'zh-Hans'],
    ['p_024', 'en'],
  ] as const) {
    test(`pt-BR: ${id} HTML, popup JSON and Markdown retain the original ${language} prompt`, async ({ request }) => {
      const detail = promptDetail(code, id);
      expect(detail.locale).toBe(code);
      expect(detail.localization.contentLocale).toBe(code);
      expect(detail.prompt.language).toBe(language);
      if (id === 'p_217')
        expect(detail.prompt.text).toBe(
          fs.readFileSync(path.join(ROOT, 'content/prompts/p_217/prompt.txt'), 'utf8').trim(),
        );
      else expect(detail.prompt).toEqual(promptDetail('en', id).prompt);
      const html = await (await get(request, detail.path)).text();
      expect(htmlElement(html)).toEqual({ lang: code, dir: 'ltr' });
      expect(elementText(html, 'h1')).toBe(detail.title);
      expect(title(html)).toBe(
        message(code, 'detail.documentTitle', {
          title: detail.seo.title,
          kind: message(code, 'detail.kinds.prompt'),
          siteName: BUILD.siteName,
        }),
      );
      expect(decode(meta(html, 'description') ?? '')).toBe(detail.seo.description);
      expect(decode(promptBlock(html) ?? '')).toBe(detail.prompt.text);
      expect(html).toMatch(new RegExp(`<div id="[^"]*-prompt"[^>]*lang="${language}"`));
      expect(canonical(html)).toBe(publicUrl(detail.path));
      expect(meta(html, 'og:locale')).toBe('pt_BR');
      expect(robots(html).some((value) => value.includes('noindex'))).toBe(!production);
      expectPrefix(html);
      const response = await get(request, `/generated/${code}/prompts/${detail.slug}.json`);
      expect(response.headers()['content-type']).toContain('application/json');
      const popup: PromptDetail = await response.json();
      expect(popup.prompt).toEqual(detail.prompt);
      expect(popup.body).toEqual(detail.body);
      expect(popup.annotations).toEqual(detail.annotations);
      expect(
        popup.examples.map((run) => ({
          prompt: run.prompt,
          hash: run.promptSha256,
        })),
      ).toEqual(
        detail.examples.map((run) => ({
          prompt: run.prompt,
          hash: run.promptSha256,
        })),
      );
      const markdown = await request.get(`${BASE}${detail.path}index.md`);
      const work = graphNodes(html).find((entry) => entry['@type'] === 'CreativeWork');
      if (production) {
        expect(markdown.status()).toBe(200);
        expect(markdown.headers()['content-type']).toContain('text/markdown');
        expect(markdown.headers().link).toBe(`<${publicUrl(detail.path)}>; rel="canonical"`);
        expect(firstCodeBlock(await markdown.text())).toBe(detail.prompt.text);
        expect(work).toMatchObject({
          inLanguage: language,
          text: detail.prompt.text,
        });
        expect(alternates(html)[code]).toBe(publicUrl(detail.path));
        for (const alternate of detail.alternates) {
          const other = await (await get(request, alternate.path)).text();
          expect(alternates(other)[code], alternate.locale).toBe(publicUrl(detail.path));
        }
      } else {
        expect(markdown.status()).toBe(404);
        expect(work).toBeUndefined();
        expect(alternates(html)).toEqual({});
      }
    });
  }

  test('pt-BR: machine-readable coverage includes every public target and no system page', async ({ request }) => {
    const index = localeIndex(code);
    const entries = [...index.prompts, ...index.templates, ...index.collections, ...index.topics, ...index.pages];
    expect(entries.length).toBeGreaterThan(0);
    const sitemap = await request.get(`${BASE}${prefix}/sitemap-pages.xml`);
    if (!production) {
      expect(sitemap.status()).toBe(portuguese.enabled ? 200 : 404);
      expect(xmlLocations(await sitemap.text())).toEqual([]);
      expect(await (await get(request, '/llms.txt')).text()).toBe('');
    } else {
      expect(sitemap.status()).toBe(200);
      expect(sitemap.headers()['content-type']).toMatch(/xml/);
      for (const entry of entries) {
        expect(entry.localization, entry.path).toMatchObject({
          contentLocale: code,
          localStatus: 'current',
          indexable: true,
        });
        expect(entry.visibility, entry.path).toBe('published');
      }
      const expected = [
        `${prefix}/`,
        `${prefix}/templates/`,
        `${prefix}/collections/`,
        ...entries.map((entry) => entry.path),
        ...Array.from({ length: feedIndex(code).pageCount }, (_, n) =>
          n === 0 ? `${prefix}/prompts/` : `${prefix}/prompts/page/${n + 1}/`,
        ),
      ].map(publicUrl);
      const locations = xmlLocations(await sitemap.text());
      expect(locations.length).toBe(new Set(locations).size);
      expect(locations.sort()).toEqual(expected.sort());
    }
    // Every Markdown twin agrees with the indexing state, including in preview.
    for (const entry of [...index.prompts, ...index.templates]) {
      const response = await request.head(`${BASE}${entry.path}index.md`);
      expect(response.status(), entry.path).toBe(production ? 200 : 404);
      if (production) expect(response.headers()['content-type'], entry.path).toContain('text/markdown');
    }
    for (const slug of ['search', 'favorites', 'translation-missing']) {
      const html = await (await get(request, `${prefix}/${slug}/`)).text();
      expect(
        robots(html).some((value) => value.includes('noindex')),
        slug,
      ).toBe(true);
      expect(alternates(html)).toEqual({});
    }
  });

  test('pt-BR: pagination, template defaults, 404 and static assets respect the base path', async ({ request }) => {
    expect(feedIndex(code).pageCount).toBeGreaterThan(1);
    const pagePath = `${prefix}/prompts/page/2/`;
    const html = await (await get(request, pagePath)).text();
    expect(htmlElement(html)).toEqual({ lang: code, dir: 'ltr' });
    expect(canonical(html)).toBe(publicUrl(pagePath));
    expect(title(html)).toBe(`${message(code, 'feed.documentTitlePage', { page: '2' })} · ${BUILD.siteName}`);
    const response = await get(request, `/generated/${code}/feed/latest/2.json`);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(pagePromptIds(await response.json())).toEqual(pagePromptIds(feedPage(code, 2)));
    for (const id of pagePromptIds(feedPage(code, 2))) {
      expect(html).toContain(`data-entry="${id}"`);
      expect(html).toContain(`href="${BASE}${promptDetail(code, id).path}"`);
    }
    expectPrefix(html);
    const template = templateDetail(code, 't_001');
    const source = templateDetail('en', 't_001');
    expect(template.version.body).toBe(source.version.body);
    expect(template.version.samples).toEqual(source.version.samples);
    expect(template.version.defaultPrompt).toBe(source.version.defaultPrompt);
    const templateHtml = await (await get(request, template.path)).text();
    expect(decode(promptBlock(templateHtml) ?? '')).toBe(source.version.defaultPrompt);
    expectPrefix(templateHtml);
    const missing = await request.get(`${BASE}${prefix}/no-such-portuguese-page/`);
    expect(missing.status()).toBe(404);
    expect(htmlElement(await missing.text())).toEqual({
      lang: code,
      dir: 'ltr',
    });
    const css = localReferences(html).find((ref) => ref.endsWith('.css'));
    expect(css).toBeDefined();
    const stylesheet = await request.get(css!);
    expect(stylesheet.status()).toBe(200);
    expect(stylesheet.headers()['content-type']).toContain('text/css');
    expect((await request.get(`${BASE}${prefix}/prompts/page/${feedIndex(code).pageCount + 1}/`)).status()).toBe(404);
  });
}
