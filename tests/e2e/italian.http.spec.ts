import { expect, test } from '@playwright/test';
import { BASE, BUILD, message, publicUrl } from './support/artifact';
import { alternates, canonical, elementText, htmlElement, robots, title } from './support/html';
import { expectItalianState, italian } from './support/italian';

test.beforeEach(() => expectItalianState());

test('it: public entry points match the explicitly expected artifact state', async ({ request }) => {
  const root = await request.get(`${BASE}/`, { headers: { 'accept-language': 'it-CH,it;q=0.9' }, maxRedirects: 0 });
  expect(root.status()).toBe(200);
  const rootHtml = await root.text();
  expect(htmlElement(rootHtml).lang).toBe(
    BUILD.locales.find((locale) => locale.code === BUILD.defaultLocale)!.htmlLang,
  );
  const sitemap = await (await request.get(`${BASE}/sitemap.xml`)).text();
  const llms = await (await request.get(`${BASE}/llms.txt`)).text();
  if (!italian) {
    expect(rootHtml).not.toContain(`href="${BASE}/it/"`);
    expect(alternates(rootHtml)).not.toHaveProperty('it');
    expect(sitemap).not.toContain('/it/');
    expect(llms).not.toContain('/it/');
    for (const url of [
      '/it/',
      '/it/sitemap-pages.xml',
      '/generated/it/feed/latest/1.json',
      '/generated/it/search/index.json',
    ])
      expect((await request.get(`${BASE}${url}`)).status(), url).toBe(404);
  } else {
    expect(rootHtml).toContain(`href="${BASE}/it/"`);
    const indexable = BUILD.buildMode === 'production' && italian.enabled;
    expect(sitemap.includes(publicUrl('/it/sitemap-pages.xml'))).toBe(indexable);
    expect(llms.includes(publicUrl('/it/'))).toBe(indexable);
  }
  for (const path of ['/it-it/', '/it-IT/', '/it-ch/'])
    expect((await request.get(`${BASE}${path}`, { maxRedirects: 0 })).status(), path).toBe(404);
});

if (italian) {
  test('it: foundation pages use Italian UI and actual preview indexing rules', async ({ request }) => {
    for (const path of ['/it/', '/it/about/', '/it/license/']) {
      const response = await request.get(`${BASE}${path}`);
      expect(response.status(), path).toBe(200);
      const html = await response.text();
      expect(htmlElement(html)).toEqual({ lang: 'it', dir: 'ltr' });
      expect(canonical(html)).toBe(publicUrl(path));
      expect(robots(html).some((value) => value.includes('noindex'))).toBe(BUILD.buildMode === 'preview');
      if (path === '/it/') {
        expect(title(html)).toBe(message('it', 'home.documentTitle', { siteName: BUILD.siteName }));
        expect(elementText(html, 'h1')).toBe(message('it', 'home.hero.title'));
      }
      if (BUILD.buildMode === 'preview') expect(alternates(html)).not.toHaveProperty('it');
    }
  });
}
