import { homeAlternates } from './support/home';
import { expect, test } from '@playwright/test';
import { BASE, BUILD, homePath, message, publicUrl } from './support/artifact';
import { localeIndex, manifest } from './support/content';
import { alternates, canonical, dataAttr, elementText, htmlElement, robots } from './support/html';

// Step 3e as crawlers and hosts see it (design doc §8.2, §9.1, §9.5, §11.8.5, §11.8.7, §17.3):
// the default home never redirects; topics, collections and content pages exist exactly where
// they meet their publishing rule; redirects, 410 and 404 answer with the right status through
// the reference nginx and its generated include.

const hrefs = (html: string) => [...html.matchAll(/<a [^>]*href="([^"#]+)"/g)].map((m) => m[1]!);
const SEGMENT = { category: 'categories', style: 'styles', useCase: 'use-cases' } as const;

function graphNode(html: string, type: string) {
  const docs = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]!) as { '@graph': Record<string, unknown>[] },
  );
  return docs.flatMap((d) => d['@graph']).find((n) => n['@type'] === type) as
    { url: string; mainEntity: { itemListElement: { position: number; url: string; name: string }[] } } | undefined;
}

const decode = (text: string) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

// --- Default-language home ------------------------------------------------------------------

test('the root serves the default home for every Accept-Language and links every language', async ({ request }) => {
  for (const lang of ['en', 'ja-JP,ja;q=0.9', 'zh-CN', 'ar', 'de-DE']) {
    const res = await request.get(`${BASE}/`, { headers: { 'accept-language': lang }, maxRedirects: 0 });
    expect(res.status(), lang).toBe(200);
    const html = await res.text();
    expect(dataAttr(html, 'page')).toBe('home');
    expect(dataAttr(html, 'locale')).toBe(BUILD.defaultLocale);
    expect(elementText(html, 'h1')).toBe(message(BUILD.defaultLocale, 'home.hero.title'));
    expect(html).not.toContain('data-page="language-entry"');
    for (const l of BUILD.locales) expect(html, l.code).toContain(`href="${BASE}${homePath(l)}"`);
    expect(canonical(html)).toBe(publicUrl('/'));
    expect(alternates(html)).toEqual(homeAlternates(BUILD.defaultLocale));
  }
});

// --- Topic pages (§9.1, §11.8.5) ---------------------------------------------------------------

for (const locale of BUILD.locales) {
  const index = localeIndex(locale.code);

  test(`${locale.code}: every topic page lists its works in the order its structured data gives`, async ({
    request,
  }) => {
    for (const topic of index.topics) {
      const res = await request.get(`${BASE}${topic.path}`);
      expect(res.status(), topic.path).toBe(200);
      const html = await res.text();
      expect(dataAttr(html, 'page')).toBe('topic');
      expect(htmlElement(html)).toEqual({ lang: locale.htmlLang, dir: locale.direction });
      expect(decode(elementText(html, 'h1')!)).toBe(topic.title);
      expect(canonical(html)).toBe(publicUrl(topic.path));
      if (!topic.localization.indexable) {
        expect(graphNode(html, 'CollectionPage')).toBeUndefined();
        expect(robots(html).some((value) => value.includes('noindex'))).toBe(true);
        continue;
      }
      const list = graphNode(html, 'CollectionPage')!;
      expect(list.url).toBe(publicUrl(topic.path));
      const links = new Set(hrefs(html));
      for (const item of list.mainEntity.itemListElement) {
        expect(item.url.startsWith(`${BUILD.origin}${BASE}/${locale.pathPrefix}/prompts/`)).toBe(true);
        expect(links.has(item.url.slice(BUILD.origin.length)), item.url).toBe(true);
      }
      expect(list.mainEntity.itemListElement.length).toBe(topic.promptCount);
    }
  });

  test(`${locale.code}: terms without a published topic have no page`, async ({ request }) => {
    const missing = index.terms.filter((t) => t.path === null);
    expect(missing.length, 'the sample content has terms below the publishing rule').toBeGreaterThan(0);
    for (const term of missing) {
      const res = await request.get(`${BASE}/${locale.pathPrefix}/${SEGMENT[term.kind]}/${term.id}/`);
      expect(res.status(), `${term.kind}/${term.id}`).toBe(404);
      expect(dataAttr(await res.text(), 'locale')).toBe(locale.code);
    }
    // The placeholder a route exports for a locale without topics never answers 200.
    for (const segment of Object.values(SEGMENT))
      expect((await request.get(`${BASE}/${locale.pathPrefix}/${segment}/_none/`)).status(), segment).toBe(404);
  });

  // --- Collections ----------------------------------------------------------------------------

  test(`${locale.code}: the collection index and each collection, entries in editorial order`, async ({ request }) => {
    const res = await request.get(`${BASE}/${locale.pathPrefix}/collections/`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(dataAttr(html, 'page')).toBe('collection-index');
    expect(elementText(html, 'h1')).toBe(message(locale.code, 'pages.collections.title'));
    // An index with nothing in it stays out of search results.
    expect(robots(html).some((r) => r.includes('noindex'))).toBe(
      BUILD.buildMode === 'preview' ||
        index.collections.length === 0 ||
        index.collections.some((item) => !item.localization.indexable),
    );
    for (const c of index.collections) {
      expect(hrefs(html)).toContain(`${BASE}${c.path}`);
      const page = await (await request.get(`${BASE}${c.path}`)).text();
      expect(dataAttr(page, 'page')).toBe('collection');
      expect(decode(elementText(page, 'h1')!)).toBe(c.title);
      if (!c.localization.indexable) {
        expect(graphNode(page, 'CollectionPage')).toBeUndefined();
        expect(robots(page).some((value) => value.includes('noindex'))).toBe(true);
        continue;
      }
      const items = graphNode(page, 'CollectionPage')!.mainEntity.itemListElement;
      expect(items.length).toBe(c.itemCount);
      // The page shows the entries in the order of the structured data.
      const order = items.map((i) => page.indexOf(`href="${i.url.slice(BUILD.origin.length)}"`));
      expect(order.every((pos) => pos > 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    }
  });

  // --- About and license (§9.8, §9.10.5) --------------------------------------------------------

  test(`${locale.code}: content pages exist where they are published, and nowhere else`, async ({ request }) => {
    const slugs = new Set(index.pages.map((p) => p.slug));
    for (const slug of ['about', 'license']) {
      const res = await request.get(`${BASE}/${locale.pathPrefix}/${slug}/`);
      expect(res.status(), slug).toBe(slugs.has(slug) ? 200 : 404);
      if (!slugs.has(slug)) continue;
      const html = await res.text();
      expect(dataAttr(html, 'page')).toBe('content-page');
      if (slug === 'about')
        expect(!!graphNode(html, 'AboutPage')).toBe(
          index.pages.find((page) => page.slug === slug)!.localization.indexable,
        );
    }
    // The footer links exactly the pages this locale has.
    const home = await (await request.get(`${BASE}/${locale.pathPrefix}/`)).text();
    for (const p of index.pages) expect(hrefs(home)).toContain(`${BASE}${p.path}`);
  });

  // --- Error pages (§11.8.7) -------------------------------------------------------------------

  test(`${locale.code}: the 404 page offers search, use cases and the newest works`, async ({ request }) => {
    const res = await request.get(`${BASE}/${locale.pathPrefix}/no-such-page/`);
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html).toContain(`action="${BASE}/${locale.pathPrefix}/search/"`);
    expect(html).toContain('name="q"');
    const links = hrefs(html);
    for (const p of index.prompts.slice(0, 6)) expect(links, p.path).toContain(`${BASE}${p.path}`);
    const uses = index.terms.filter((t) => t.kind === 'useCase' && t.count > 0);
    // A use case links to its topic page, or to the list filtered by it (#use=…).
    const useLinks = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)]
      .map((m) => m[1]!)
      .filter((h) => h.includes('/prompts/#use=') || h.includes('/use-cases/'));
    expect(useLinks.length).toBe(Math.min(uses.length, 3));
  });

  test(`${locale.code}: the missing-translation page is noindex and outside the sitemap`, async ({ request }) => {
    const res = await request.get(`${BASE}/${locale.pathPrefix}/translation-missing/`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(dataAttr(html, 'page')).toBe('translation-missing');
    expect(robots(html).some((r) => r.includes('noindex'))).toBe(true);
    expect(elementText(html, 'h1')).toBe(message(locale.code, 'pages.missing.title', { language: locale.nativeName }));
    if (locale.enabled) {
      const sitemap = await (await request.get(`${BASE}/${locale.pathPrefix}/sitemap-pages.xml`)).text();
      expect(sitemap).not.toContain('translation-missing');
    }
  });
}

// --- Host rules (§9.5): redirects, 410, 404 through the reference nginx --------------------------

test('every redirect answers 301 in both slash forms, to a page that exists', async ({ request }) => {
  const { redirects } = manifest();
  expect(redirects.length).toBeGreaterThan(0);
  for (const r of redirects) {
    for (const from of [r.from, r.from.slice(0, -1)]) {
      const res = await request.get(`${BASE}${from}`, { maxRedirects: 0 });
      expect(res.status(), from).toBe(301);
      expect(res.headers()['location'], from).toBe(`${BASE}${r.to}`); // relative: absolute_redirect off
    }
    expect((await request.get(`${BASE}${r.to}`)).status(), r.to).toBe(200);
  }
});

test('removed addresses answer 410 with their language’s 410 page', async ({ request }) => {
  const { gone } = manifest();
  expect(gone.length).toBeGreaterThan(0);
  for (const g of gone) {
    const locale = BUILD.locales.find((l) => l.code === g.locale)!;
    for (const path of [g.path, g.path.slice(0, -1)]) {
      const res = await request.get(`${BASE}${path}`, { maxRedirects: 0 });
      expect(res.status(), path).toBe(410);
      expect(res.headers()['content-type']).toBe('text/html; charset=utf-8');
      const html = await res.text();
      expect(dataAttr(html, 'error')).toBe('410');
      expect(dataAttr(html, 'locale')).toBe(g.locale);
      expect(htmlElement(html)).toEqual({ lang: locale.htmlLang, dir: locale.direction });
      expect(elementText(html, 'h1')).toBe(message(g.locale, 'common.errors.gone.title'));
      expect(robots(html).some((r) => r.includes('noindex'))).toBe(true);
    }
  }
});
