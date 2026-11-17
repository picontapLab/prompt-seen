import { expect, test } from '@playwright/test';
import { BASE, BUILD, publicUrl } from './support/artifact';
import { arabic, expectArabicState } from './support/arabic';
import { promptDetail } from './support/content';
import { alternates, canonical, elementText, htmlElement, robots } from './support/html';

test('Arabic HTTP artifact matches its explicitly requested state', async ({ request }) => {
  expectArabicState();
  const response = await request.get(`${BASE}/ar/`);
  expect(response.status()).toBe(arabic ? 200 : 404);
  if (!arabic) {
    expect((await request.get(`${BASE}/generated/ar/search/index.json`)).status()).toBe(404);
    const english = await (await request.get(`${BASE}/en/`)).text();
    expect(alternates(english).ar).toBeUndefined();
    return;
  }
  const html = await response.text();
  expect(htmlElement(html)).toEqual({ lang: 'ar', dir: 'rtl' });
  if (BUILD.buildMode === 'preview') expect(robots(html).join(',')).toContain('noindex');
});

test.describe('Arabic raw HTML and source-only Prompt', () => {
  test.skip(!arabic, 'Arabic is absent from this production artifact');
  for (const id of ['p_012', 'p_151', 'p_290']) {
    test(id, async ({ request }) => {
      const detail = promptDetail('ar', id);
      const source = promptDetail('en', id);
      const response = await request.get(`${BASE}${detail.path}`);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(htmlElement(html)).toEqual({ lang: 'ar', dir: 'rtl' });
      expect(html).toContain('content="ar_AR"');
      expect(elementText(html, 'h1')).toBe(detail.title);
      expect(canonical(html)).toBe(publicUrl(detail.path));
      expect(detail.prompt).toEqual(source.prompt);
      const popup = await (await request.get(`${BASE}/generated/ar/prompts/${detail.slug}.json`)).json();
      expect(popup.prompt).toEqual(detail.prompt);
      if (BUILD.buildMode === 'preview') expect(robots(html).join(',')).toContain('noindex');
      else {
        expect(detail.localization.contentLocale).toBe('ar');
        expect(detail.localization.indexable).toBe(true);
        expect(robots(html).join(',')).not.toContain('noindex');
        expect(alternates(html).ar).toBe(publicUrl(detail.path));
      }
    });
  }
  test('base pages exist, search is noindex and unknown Arabic routes return 404', async ({ request }) => {
    for (const path of ['/ar/about/', '/ar/license/', '/ar/search/']) {
      const response = await request.get(`${BASE}${path}`);
      expect(response.status()).toBe(200);
      if (BUILD.buildMode === 'preview' || path.includes('/search/'))
        expect(robots(await response.text()).join(',')).toContain('noindex');
    }
    expect((await request.get(`${BASE}/ar/unknown-arabic-acceptance-page/`)).status()).toBe(404);
  });
});
