import { expect, test } from '@playwright/test';
import { BASE, BUILD, publicUrl } from './support/artifact';
import { localeIndex, promptDetail } from './support/content';
import { alternates, canonical, elementText, htmlElement, robots } from './support/html';

const traditionalChinese = BUILD.locales.find((locale) => locale.code === 'zh-Hant');

test('Traditional Chinese artifact follows preview and production registration', async ({ request }) => {
  if (process.env.ZH_HANT_ACCEPTANCE === '1') expect(traditionalChinese).toBeDefined();
  if (!traditionalChinese) {
    expect((await request.get(`${BASE}/zh-hant/`)).status()).toBe(404);
    return;
  }
  if (BUILD.buildMode === 'production') expect(traditionalChinese.enabled).toBe(true);
  const response = await request.get(`${BASE}/zh-hant/`);
  expect(response.status()).toBe(200);
  expect(htmlElement(await response.text())).toEqual({ lang: 'zh-Hant', dir: 'ltr' });
});

test.describe('Traditional Chinese raw HTML and original prompt language', () => {
  test.skip(!traditionalChinese, 'Traditional Chinese is not part of this artifact');
  for (const id of ['p_005', 'p_012', 'p_151', 'p_217']) {
    test(id, async ({ request }) => {
      const detail = promptDetail('zh-Hant', id);
      const response = await request.get(`${BASE}${detail.path}`);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(htmlElement(html)).toEqual({ lang: 'zh-Hant', dir: 'ltr' });
      expect(elementText(html, 'h1')).toBe(detail.title);
      expect(detail.localization.contentLocale).toBe('zh-Hant');
      expect(canonical(html)).toBe(publicUrl(detail.path));
      expect(html).toContain('content="zh_TW"');
      if (BUILD.buildMode === 'preview') expect(robots(html).join(',')).toContain('noindex');
      else {
        expect(detail.localization.indexable).toBe(true);
        expect(robots(html).join(',')).not.toContain('noindex');
        expect(alternates(html)['zh-Hant']).toBe(publicUrl(detail.path));
      }
      const popup = await (await request.get(`${BASE}/generated/zh-Hant/prompts/${detail.slug}.json`)).json();
      expect(popup.prompt).toEqual(detail.prompt);
      expect(detail.prompt.language).toBe(id === 'p_217' ? 'zh-Hans' : 'en');
    });
  }
  test('fallbacks remain noindex and absent from external Markdown export', async ({ request }) => {
    const fallback = localeIndex('zh-Hant').prompts.find((prompt) => prompt.localization.contentLocale !== 'zh-Hant');
    if (BUILD.buildMode === 'production') {
      expect(fallback).toBeUndefined();
      return;
    }
    test.skip(!fallback, 'the full corpus has no fallback');
    const html = await (await request.get(`${BASE}${fallback!.path}`)).text();
    expect(robots(html).join(',')).toContain('noindex');
    expect(alternates(html)).toEqual({});
    expect((await request.get(`${BASE}${fallback!.path}index.md`)).status()).toBe(404);
  });
  test('search stays noindex and unknown Traditional Chinese addresses return 404', async ({ request }) => {
    const html = await (await request.get(`${BASE}/zh-hant/search/`)).text();
    expect(robots(html).join(',')).toContain('noindex');
    expect((await request.get(`${BASE}/zh-hant/unknown-traditionalChinese-acceptance-page/`)).status()).toBe(404);
  });
});
