import { expect, test } from '@playwright/test';
import { BASE, BUILD, publicUrl } from './support/artifact';
import { localeIndex, promptDetail } from './support/content';
import { alternates, canonical, elementText, htmlElement, robots } from './support/html';

const korean = BUILD.locales.find((locale) => locale.code === 'ko');

test('Korean artifact follows preview and production registration', async ({ request }) => {
  if (process.env.KO_ACCEPTANCE === '1') expect(korean).toBeDefined();
  if (!korean) {
    expect((await request.get(`${BASE}/ko/`)).status()).toBe(404);
    return;
  }
  if (BUILD.buildMode === 'production') expect(korean.enabled).toBe(true);
  const response = await request.get(`${BASE}/ko/`);
  expect(response.status()).toBe(200);
  expect(htmlElement(await response.text())).toEqual({ lang: 'ko', dir: 'ltr' });
});

test.describe('Korean raw HTML and original prompt language', () => {
  test.skip(!korean, 'Korean is not part of this artifact');
  for (const id of ['p_005', 'p_012', 'p_151']) {
    test(id, async ({ request }) => {
      const detail = promptDetail('ko', id);
      const response = await request.get(`${BASE}${detail.path}`);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(htmlElement(html)).toEqual({ lang: 'ko', dir: 'ltr' });
      expect(elementText(html, 'h1')).toBe(detail.title);
      expect(detail.localization.contentLocale).toBe('ko');
      expect(canonical(html)).toBe(publicUrl(detail.path));
      expect(html).toContain('content="ko_KR"');
      if (BUILD.buildMode === 'preview') expect(robots(html).join(',')).toContain('noindex');
      else {
        expect(detail.localization.indexable).toBe(true);
        expect(robots(html).join(',')).not.toContain('noindex');
        expect(alternates(html).ko).toBe(publicUrl(detail.path));
      }
      const popup = await (await request.get(`${BASE}/generated/ko/prompts/${detail.slug}.json`)).json();
      expect(popup.prompt).toEqual(detail.prompt);
      expect(detail.prompt.language).not.toBe('ko');
    });
  }
  test('fallbacks remain noindex and absent from external Markdown export', async ({ request }) => {
    const fallback = localeIndex('ko').prompts.find((prompt) => prompt.localization.contentLocale !== 'ko');
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
  test('search stays noindex and unknown Korean addresses return 404', async ({ request }) => {
    const html = await (await request.get(`${BASE}/ko/search/`)).text();
    expect(robots(html).join(',')).toContain('noindex');
    expect((await request.get(`${BASE}/ko/unknown-korean-acceptance-page/`)).status()).toBe(404);
  });
});
