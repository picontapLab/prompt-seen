import { expect, test } from '@playwright/test';
import { BASE, BUILD, message, publicUrl } from './support/artifact';
import { localeIndex } from './support/content';

// Search over HTTP (design doc §9.1, §13.3, §16.2): one index per built locale with this build's
// identifier and only what the build shows; a static, noindex search page in every locale; no
// ordinary page refers to an index.

type IndexFile = { buildId: string; locale: string; counts: Record<string, number>; popular: unknown[] };

for (const locale of BUILD.locales) {
  test(`${locale.code}: the search index belongs to this build and holds its visible entries`, async ({ request }) => {
    const res = await request.get(`${BASE}/generated/${locale.code}/search/index.json`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    const file = (await res.json()) as IndexFile;
    expect(file.buildId).toBe(BUILD.buildId);
    expect(file.locale).toBe(locale.code);
    const visible = localeIndex(locale.code);
    // Production builds show published versions only, so their indexes hold no drafts (§16.2).
    expect(file.counts.prompt).toBe(visible.prompts.length);
    expect(file.counts.template).toBe(visible.templates.length);
    if (BUILD.buildMode === 'production') expect(visible.prompts.every((p) => p.visibility === 'published')).toBe(true);
  });

  test(`${locale.code}: the search page is static, noindex and in the page’s language`, async ({ request }) => {
    const path = `/${locale.pathPrefix}/search/`;
    const res = await request.get(`${BASE}${path}`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/<meta name="robots" content="noindex[^"]*"/);
    expect(html).toContain(`<link rel="canonical" href="${publicUrl(path)}"/>`);
    expect(html).toContain(`>${message(locale.code, 'search.page.title')}</h1>`);
    // The query is read in the browser (§11.6.1): the HTML is the same for every query.
    const withQuery = await (await request.get(`${BASE}${path}?q=neon`)).text();
    expect(withQuery.replace(/\s+/g, '')).toBe(html.replace(/\s+/g, ''));
    // Every built language has a search page; hreflang lets the language switch stay on it.
    for (const other of BUILD.locales)
      expect(html).toContain(`hrefLang="${other.htmlLang}" href="${publicUrl(`/${other.pathPrefix}/search/`)}"`);
  });

  test(`${locale.code}: ordinary pages do not refer to the search index (§16.4)`, async ({ request }) => {
    for (const path of [`/${locale.pathPrefix}/`, `/${locale.pathPrefix}/prompts/`, `/${locale.pathPrefix}/search/`]) {
      const html = await (await request.get(`${BASE}${path}`)).text();
      expect(html).not.toContain('/search/index.json');
      // The header's search entry works without JavaScript: a plain link to the search page.
      expect(html).toMatch(new RegExp(`<a href="${BASE}/${locale.pathPrefix}/search/"[^>]*data-search-launcher`));
    }
  });
}

test('the search page is not in any sitemap (§9.3)', async ({ request }) => {
  for (const locale of BUILD.locales.filter((l) => l.enabled)) {
    const res = await request.get(`${BASE}/${locale.pathPrefix}/sitemap-pages.xml`);
    if (res.status() !== 200) continue;
    expect(await res.text()).not.toContain('/search/');
  }
});
