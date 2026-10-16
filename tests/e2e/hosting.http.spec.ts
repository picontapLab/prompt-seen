import { expect, test } from '@playwright/test';
import { BASE, BUILD, publicUrl } from './support/artifact';
import { alternates, canonical, dataAttr, htmlElement, localReferences, robots } from './support/html';

// Raw HTTP through the reference nginx: status codes, headers and the HTML crawlers receive.
// Step 1a pass conditions (design doc §17.3): every built locale has a page whose canonical is
// an absolute URL with the base path; nothing is requested outside the base path.

const isPreview = BUILD.buildMode === 'preview';
const expectedAlternates = {
  ...Object.fromEntries(BUILD.locales.map((l) => [l.htmlLang, publicUrl(`/${l.pathPrefix}/`)])),
  'x-default': publicUrl('/'),
};

function expectIndexing(html: string) {
  if (isPreview) expect(robots(html)).toContain('noindex, nofollow');
  else expect(robots(html).filter((r) => r.includes('noindex'))).toEqual([]);
}

function expectPrefixedReferences(html: string) {
  const outside = localReferences(html).filter((ref) => !(BASE ? ref.startsWith(`${BASE}/`) : true));
  expect(outside, 'same-host references outside the base path').toEqual([]);
}

test('language entry at the base path is the x-default', async ({ request }) => {
  const res = await request.get(`${BASE}/`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('text/html; charset=utf-8');
  const html = await res.text();
  expect(dataAttr(html, 'page')).toBe('language-entry');
  expect(canonical(html)).toBe(publicUrl('/'));
  expect(alternates(html)).toEqual(expectedAlternates);
  expectIndexing(html);
  expectPrefixedReferences(html);
});

for (const locale of BUILD.locales) {
  test(`${locale.code}: placeholder home with lang, dir and an absolute canonical`, async ({ request }) => {
    const res = await request.get(`${BASE}/${locale.pathPrefix}/`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(htmlElement(html)).toEqual({ lang: locale.htmlLang, dir: locale.direction });
    expect(dataAttr(html, 'locale')).toBe(locale.code);
    expect(canonical(html)).toBe(publicUrl(`/${locale.pathPrefix}/`));
    expect(canonical(html)).toMatch(new RegExp(`^${BUILD.origin}${BASE}/`));
    expect(alternates(html)).toEqual(expectedAlternates);
    expectIndexing(html);
    expectPrefixedReferences(html);
  });

  test(`${locale.code}: unknown address answers 404 with the ${locale.code} error page`, async ({ request }) => {
    const res = await request.get(`${BASE}/${locale.pathPrefix}/no-such-page/`);
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(dataAttr(html, 'error')).toBe('404');
    expect(dataAttr(html, 'locale')).toBe(locale.code);
    expect(htmlElement(html)).toEqual({ lang: locale.htmlLang, dir: locale.direction });
    expect(robots(html).some((r) => r.includes('noindex'))).toBe(true);
  });

  test(`${locale.code}: error pages never answer 200 directly`, async ({ request }) => {
    for (const page of ['404', '410']) {
      expect((await request.get(`${BASE}/${locale.pathPrefix}/${page}/`)).status(), page).toBe(404);
    }
  });
}

test('addresses outside every built locale answer 404 with the root error page', async ({ request }) => {
  for (const path of ['/xx/', '/no-such-page', '/404.html', '/404/', '/_not-found/']) {
    const res = await request.get(`${BASE}${path}`);
    expect(res.status(), path).toBe(404);
    expect(dataAttr(await res.text(), 'locale'), path).toBe('root');
  }
});

test('locales that are not built in this mode do not exist', async ({ request }) => {
  const built = new Set(BUILD.locales.map((l) => l.pathPrefix));
  for (const prefix of ['es', 'de', 'ar', 'ja'].filter((p) => !built.has(p))) {
    expect((await request.get(`${BASE}/${prefix}/`)).status(), prefix).toBe(404);
  }
});

test('the bare base path and directory URLs without a slash redirect to the slash form', async ({ request }) => {
  const prefix = BUILD.locales[0]!.pathPrefix;
  const cases = [...(BASE ? [[BASE, `${BASE}/`]] : []), [`${BASE}/${prefix}`, `${BASE}/${prefix}/`]];
  for (const [from, to] of cases) {
    const res = await request.get(from!, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    expect(res.headers()['location'], from).toBe(to); // relative: absolute_redirect off
  }
});

test('generated data is served under the base path as UTF-8 JSON', async ({ request }) => {
  const res = await request.get(`${BASE}/generated/build.json`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('application/json; charset=utf-8');
  expect((await res.json()).buildId).toBe(BUILD.buildId);
});

test('the site icon is declared and served under the base path (memo §7.4 item 2)', async ({ request }) => {
  const html = await (await request.get(`${BASE}/`)).text();
  const icon = /<link rel="icon" href="([^"]+)"/.exec(html)?.[1];
  expect(icon).toMatch(new RegExp(`^${BASE}/icon\\.svg`));
  expect((await request.get(icon!)).status()).toBe(200);
});
