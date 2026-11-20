import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { fieldsFileSchema, promptEntrySchema, templateEntrySchema } from '../../scripts/lib/content/schemas';
import { renderTemplate } from '../../src/modules/template';
import { BASE, BUILD, ROOT, publicUrl } from './support/artifact';
import { localeIndex, promptDetail } from './support/content';
import { alternates, canonical, elementText, htmlElement, robots } from './support/html';

const russian = BUILD.locales.find((locale) => locale.code === 'ru');

test('Russian publication follows the actual artifact configuration', async ({ request }) => {
  if (process.env.RU_EXPECT_STATE === 'enabled') expect(russian?.enabled).toBe(true);
  if (['RU_ACCEPTANCE', 'RU_FULL_ACCEPTANCE', 'RU_PILOT_ACCEPTANCE'].some((flag) => process.env[flag] === '1')) {
    expect(russian).toBeDefined();
  }
  if (!russian) {
    expect((await request.get(`${BASE}/ru/`)).status()).toBe(404);
    expect((await request.get(`${BASE}/generated/ru/search/index.json`)).status()).toBe(404);
    const home = await (await request.get(`${BASE}/`)).text();
    expect(home).not.toContain(`href="${BASE}/ru/"`);
    const sitemap = await (await request.get(`${BASE}/sitemap.xml`)).text();
    expect(sitemap).not.toContain('/ru/');
    return;
  }
  if (BUILD.buildMode === 'production') expect(russian.enabled).toBe(true);
  const response = await request.get(`${BASE}/ru/`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(htmlElement(html)).toEqual({ lang: 'ru', dir: 'ltr' });
  expect(html).toContain('Промпты');
  expect(canonical(html)).toBe(publicUrl('/ru/'));
  if (BUILD.buildMode === 'preview') expect(robots(html).join(',')).toContain('noindex');
});

test.describe('Russian pages and original Prompt text', () => {
  test.skip(!russian, 'Russian is not part of this artifact');
  test('full Russian corpus has every source entry, localized HTML and unchanged original Prompts', async ({
    request,
  }) => {
    test.setTimeout(120_000);
    const index = localeIndex('ru');
    const source = localeIndex('en');
    const scope: { items: { key: string }[] } = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'production/localization/ru/scope.json'), 'utf8'),
    );
    expect(scope.items.length).toBeGreaterThan(0);
    const servedPrompts = new Map<string, { text: string; language: string }>();
    for (const kind of ['prompts', 'templates', 'collections', 'topics', 'pages'] as const) {
      const scopedId = (entry: (typeof index)[typeof kind][number]) =>
        entry.kind === 'topic' ? `${entry.taxonomy}/${entry.id}` : entry.id;
      expect(source[kind].length, kind).toBeGreaterThan(0);
      // English preview also includes unpublished drafts, outside the frozen localization scope.
      const scopedIds = scope.items
        .filter((item) => item.key.startsWith(`${kind.slice(0, -1)}/`))
        .map((item) => item.key.split('/').slice(1).join('/'))
        .sort();
      expect(scopedIds.length, kind).toBeGreaterThan(0);
      expect(source[kind].map(scopedId), kind).toEqual(expect.arrayContaining(scopedIds));
      const publishedSourceIds = source[kind].filter((entry) => entry.visibility === 'published').map(scopedId);
      const expectedIds = [...new Set([...scopedIds, ...publishedSourceIds])].sort();
      expect(index[kind].map(scopedId).sort(), kind).toEqual(expectedIds);
      for (const entry of index[kind]) {
        expect(entry.localization.contentLocale, `${kind}/${entry.id}`).toBe('ru');
        const response = await request.get(`${BASE}${entry.path}`);
        expect(response.status(), entry.path).toBe(200);
        const html = await response.text();
        if (kind === 'prompts') {
          const block = /<div id="[^"]*-prompt"([^>]*)>([\s\S]*?)<\/div>/.exec(html);
          expect(block, entry.id).not.toBeNull();
          const text = block![2]!
            .replace(/<!-- -->/g, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;|&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
          servedPrompts.set(entry.id, { text, language: /lang="([^"]+)"/.exec(block![1]!)?.[1] ?? '' });
        }
        expect(htmlElement(html), entry.path).toEqual({ lang: 'ru', dir: 'ltr' });
        expect(elementText(html, 'h1'), entry.path).toBe(entry.title);
        if (BUILD.buildMode === 'preview') expect(robots(html).join(','), entry.path).toContain('noindex');
      }
    }
    for (const entry of index.prompts) {
      const directory = path.join(ROOT, 'content/prompts', entry.id);
      const data = promptEntrySchema.parse(YAML.parse(fs.readFileSync(path.join(directory, 'entry.yaml'), 'utf8')));
      const original = data.promptSource;
      const readPrompt = (file: string) => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n').trim();
      let expected: { text: string; language: string };
      if (original.type === 'literal') {
        expected = { text: readPrompt(path.join(directory, original.file)), language: original.language };
      } else {
        const templateDir = path.join(ROOT, 'content/templates', original.templateId);
        const versionDir = path.join(templateDir, 'versions', original.version);
        const template = templateEntrySchema.parse(
          YAML.parse(fs.readFileSync(path.join(templateDir, 'entry.yaml'), 'utf8')),
        );
        const fields = fieldsFileSchema.parse(
          YAML.parse(fs.readFileSync(path.join(versionDir, 'fields.yaml'), 'utf8')),
        ).fields;
        const rendered = renderTemplate(
          { body: readPrompt(path.join(versionDir, 'body.txt')), fields },
          original.values,
        );
        expect(rendered.ok, entry.id).toBe(true);
        if (rendered.text === null) throw new Error(`Invalid source template: ${entry.id}`);
        expected = { text: rendered.text, language: template.promptLanguage };
      }
      const detail = promptDetail('ru', entry.id);
      expect(detail.prompt, entry.id).toMatchObject(expected);
      expect(servedPrompts.get(entry.id), entry.id).toEqual(expected);
      const response = await request.get(`${BASE}/generated/ru/prompts/${detail.slug}.json`);
      expect(response.status(), entry.id).toBe(200);
      const popup = await response.json();
      expect(popup.prompt, entry.id).toEqual(detail.prompt);
      expect(popup.prompt, entry.id).toMatchObject(expected);
    }
  });
  for (const slug of ['about', 'license']) {
    test(slug, async ({ request }) => {
      const response = await request.get(`${BASE}/ru/${slug}/`);
      expect(response.status()).toBe(200);
      expect(htmlElement(await response.text())).toEqual({ lang: 'ru', dir: 'ltr' });
    });
  }
  test('browsing fallbacks keep their true language and stay out of external outputs', async ({ request }) => {
    const index = localeIndex('ru');
    const fallback = index.prompts.find((prompt) => prompt.localization.contentLocale !== 'ru');
    if (BUILD.buildMode === 'production') {
      expect(fallback).toBeUndefined();
      return;
    }
    test.skip(!fallback, 'Full candidate has no fallback');
    const html = await (await request.get(`${BASE}${fallback!.path}`)).text();
    expect(robots(html).join(',')).toContain('noindex');
    expect(alternates(html)).toEqual({});
    expect((await request.get(`${BASE}${fallback!.path}index.md`)).status()).toBe(404);
  });
  test('localized details, popup payloads and canonical URLs agree', async ({ request }) => {
    const translated = localeIndex('ru').prompts.filter((prompt) => prompt.localization.contentLocale === 'ru');
    const pilotIds = ['p_005', 'p_012', 'p_111', 'p_115', 'p_151', 'p_217', 'p_224', 'p_290'];
    if (process.env.RU_FULL_ACCEPTANCE === '1' || process.env.RU_PILOT_ACCEPTANCE === '1') {
      expect(translated.map((p) => p.id)).toEqual(expect.arrayContaining(pilotIds));
    }
    for (const entry of translated.filter((p) => pilotIds.includes(p.id))) {
      const detail = promptDetail('ru', entry.id);
      const response = await request.get(`${BASE}${detail.path}`);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(elementText(html, 'h1')).toBe(detail.title);
      expect(canonical(html)).toBe(publicUrl(detail.path));
      expect(html).toContain('content="ru_RU"');
      const popup = await (await request.get(`${BASE}/generated/ru/prompts/${detail.slug}.json`)).json();
      expect(popup.prompt).toEqual(detail.prompt);
      // English editions may select translated Prompt bodies; ru must keep the source.
      if (['p_217', 'p_224'].includes(entry.id)) {
        expect(detail.prompt.language).toBe('zh-Hans');
        expect(detail.prompt.text).toBe(
          fs.readFileSync(path.join(ROOT, 'content/prompts', entry.id, 'prompt.txt'), 'utf8').trim(),
        );
      } else expect(detail.prompt).toEqual(promptDetail('en', entry.id).prompt);
      if (BUILD.buildMode === 'production') expect(alternates(html).ru).toBe(publicUrl(detail.path));
    }
  });
});
