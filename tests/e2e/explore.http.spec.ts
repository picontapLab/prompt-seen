import { expect, test } from '@playwright/test';
import { BASE, BUILD, message, publicUrl } from './support/artifact';
import { feedPage, pagePromptIds } from './support/content';

// Explore and favourites over HTTP (design doc §9.1, §9.4, §11.5, §17.3 step 4c): one static,
// noindex page per built locale, in that locale's language, outside every sitemap. Explore's
// HTML holds the newest works with real links, so it reads without JavaScript; the conditions
// never become addresses.

for (const locale of BUILD.locales) {
  test(`${locale.code}: explore is static, noindex and lists the newest works`, async ({ request }) => {
    const path = `/${locale.pathPrefix}/explore/`;
    const res = await request.get(`${BASE}${path}`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/<meta name="robots" content="noindex[^"]*"/);
    expect(html).toContain(`<link rel="canonical" href="${publicUrl(path)}"/>`);
    expect(html).toContain(`>${message(locale.code, 'explore.title')}</h1>`);
    for (const id of pagePromptIds(feedPage(locale.code, 1)).slice(0, 6)) expect(html).toContain(`data-entry="${id}"`);
    // The same page serves every combination of conditions (fragment only).
    expect(html).not.toMatch(/<link[^>]+hrefLang=/);
  });

  test(`${locale.code}: favourites is static, noindex and says that saving stays on this device`, async ({
    request,
  }) => {
    const path = `/${locale.pathPrefix}/favorites/`;
    const res = await request.get(`${BASE}${path}`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/<meta name="robots" content="noindex[^"]*"/);
    expect(html).toContain(`>${message(locale.code, 'favorites.page.title')}</h1>`);
    expect(html).toContain(message(locale.code, 'favorites.page.device'));
    // Every page in a locale links to it from the header, without JavaScript.
    const list = await (await request.get(`${BASE}/${locale.pathPrefix}/prompts/`)).text();
    const link = list.match(/<a [^>]*data-favorites-link[^>]*>/)?.[0];
    expect(link).toContain(`href="${BASE}${path}"`);
  });
}

test('explore and favourites are in no sitemap (§9.3)', async ({ request }) => {
  for (const locale of BUILD.locales.filter((l) => l.enabled)) {
    const res = await request.get(`${BASE}/${locale.pathPrefix}/sitemap-pages.xml`);
    if (res.status() !== 200) continue;
    const xml = await res.text();
    expect(xml).not.toContain('/explore/');
    expect(xml).not.toContain('/favorites/');
  }
});
