import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { BASE, BUILD, ROOT, publicUrl } from './support/artifact';
import { localeIndex, promptDetail } from './support/content';
import { alternates, canonical, elementText, htmlElement, robots } from './support/html';

const russian = BUILD.locales.find((locale) => locale.code === 'ru');

test('Russian publication follows the actual artifact configuration', async ({ request }) => {
  if (process.env.RU_ACCEPTANCE === '1') expect(russian).toBeDefined();
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
