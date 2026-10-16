// Prototype 2: the static export behind the reference nginx at /prompt-seen/ (memo §3.3–§3.4,
// design doc §15.4.4). Status codes, Location headers, absolute SEO URLs, file layout, Content-Type,
// and that the browser never requests anything outside the base path.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';
import YAML from 'yaml';
import { BASE, ORIGIN, ROOT, SLUGS, card, detailUrl, expectPopupOpen, gotoGallery, listUrl } from './helpers';

const PREFIX = `${ORIGIN}${BASE}/`;
const redirects: { from: string; to: string }[] = YAML.parse(
  fs.readFileSync(path.join(ROOT, 'content/redirects.yaml'), 'utf8'),
);
const deleted: { slug: string; locales: string[] }[] = YAML.parse(
  fs.readFileSync(path.join(ROOT, 'content/deleted.yaml'), 'utf8'),
);

const raw = (request: APIRequestContext, url: string) => request.get(url, { maxRedirects: 0 });

test.describe('status codes and Location', () => {
  for (const r of redirects) {
    for (const from of [r.from, r.from.replace(/\/$/, '')]) {
      test(`301 ${BASE}${from}`, async ({ request }) => {
        const res = await raw(request, BASE + from);
        expect(res.status()).toBe(301);
        expect(res.headers()['location']).toBe(BASE + r.to);
      });
    }
  }

  test('301 for the bare base path and for directory URLs without trailing slash', async ({ request }) => {
    for (const [from, to] of [
      [BASE, `${BASE}/`],
      [`${BASE}/en/prompts`, `${BASE}/en/prompts/`],
      [`${BASE}/en/prompts/neon-alley`, `${BASE}/en/prompts/neon-alley/`],
    ]) {
      const res = await raw(request, from);
      expect(res.status(), from).toBe(301);
      expect(res.headers()['location'], from).toBe(to);
    }
  });

  for (const d of deleted) {
    for (const prefix of d.locales) {
      test(`410 ${BASE}/${prefix}/prompts/${d.slug}/ with the ${prefix} 410 page`, async ({ request }) => {
        const res = await raw(request, `${BASE}/${prefix}/prompts/${d.slug}/`);
        expect(res.status()).toBe(410);
        expect(res.headers()['content-type']).toBe('text/html; charset=utf-8');
        expect(await res.text()).toContain(`data-error="410" data-error-locale="${prefix}"`);
      });
    }
  }

  test('per-locale 404 pages, root 404 for unknown locales, error pages never answer 200', async ({ request }) => {
    for (const [url, marker] of [
      [`${BASE}/en/prompts/no-such-prompt/`, 'en'],
      [`${BASE}/zh-hans/prompts/no-such-prompt/`, 'zh-hans'],
      [`${BASE}/zh-hans/templates/nope/`, 'zh-hans'],
      [`${BASE}/fr/prompts/`, 'root'],
      [`${BASE}/en/404/`, 'en'],
      [`${BASE}/en/410/`, 'en'],
      [`${BASE}/404/`, 'root'],
      [`${BASE}/404.html`, 'root'],
      [`${BASE}/_not-found/`, 'root'],
      [`${BASE}/en/prompts/neon-alley/missing.md`, 'en'],
    ]) {
      const res = await raw(request, url);
      expect(res.status(), url).toBe(404);
      expect(res.headers()['content-type'], url).toBe('text/html; charset=utf-8');
      const body = await res.text();
      expect(body, url).toContain(`data-error="404" data-error-locale="${marker}"`);
      expect(body, url).toContain('<meta name="robots" content="noindex"/>');
    }
  });

  test('every redirect target exists and answers 200', async ({ request }) => {
    for (const r of redirects) expect((await raw(request, BASE + r.to)).status(), r.to).toBe(200);
  });
});

test.describe('export layout', () => {
  test('out/ has no basePath directory layer; dist/prompt-seen/ is the repackaged copy', () => {
    const out = path.join(ROOT, 'out');
    expect(fs.existsSync(path.join(out, BASE))).toBe(false);
    expect(fs.existsSync(path.join(out, '_next'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'dist', BASE, '_next'))).toBe(true);
  });

  test('index.md, llms.txt, sitemap.xml, robots.txt are same-name files, not trailingSlash directories', () => {
    for (const p of ['sitemap.xml', 'robots.txt', 'llms.txt', 'en/prompts/neon-alley/index.md']) {
      const f = path.join(ROOT, 'out', p);
      expect(fs.statSync(f).isFile(), p).toBe(true);
      expect(fs.existsSync(path.join(f, 'index.html')), p).toBe(false);
    }
  });
});

test.describe('Content-Type through nginx', () => {
  for (const [url, type] of [
    [`${BASE}/llms.txt`, 'text/plain; charset=utf-8'],
    [`${BASE}/sitemap.xml`, 'text/xml; charset=utf-8'],
    [`${BASE}/robots.txt`, 'text/plain; charset=utf-8'],
    [`${BASE}/en/prompts/neon-alley/index.md`, 'text/markdown; charset=utf-8'],
    [`${BASE}/zh-hans/prompts/neon-alley/index.md`, 'text/markdown; charset=utf-8'],
    [`${BASE}/generated/en/prompts/neon-alley.json`, 'application/json; charset=utf-8'],
    [`${BASE}/en/prompts/neon-alley/`, 'text/html; charset=utf-8'],
  ]) {
    test(`${url} -> ${type}`, async ({ request }) => {
      const res = await raw(request, url);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toBe(type);
    });
  }

  test('index.md carries Link rel=canonical to the HTML page; zh text survives', async ({ request }) => {
    const res = await raw(request, `${BASE}/zh-hans/prompts/neon-alley/index.md`);
    expect(res.headers()['link']).toBe(`<${PREFIX}zh-hans/prompts/neon-alley/>; rel="canonical"`);
    expect(await res.text()).toContain('# 霓虹小巷');
  });
});

function attr(html: string, re: RegExp) {
  return [...html.matchAll(re)].map((m) => m[1]);
}

test.describe('absolute URLs in raw HTML (metadataBase = origin + basePath)', () => {
  test('detail page: canonical, hreflang, x-default, markdown alternate, og:url, JSON-LD', async ({ request }) => {
    const html = await (await raw(request, detailUrl('neon-alley'))).text();
    expect(attr(html, /<link rel="canonical" href="([^"]+)"/g)).toEqual([`${PREFIX}en/prompts/neon-alley/`]);
    const alternates = Object.fromEntries(
      [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]),
    );
    expect(alternates).toEqual({
      en: `${PREFIX}en/prompts/neon-alley/`,
      'zh-Hans': `${PREFIX}zh-hans/prompts/neon-alley/`,
      'x-default': PREFIX,
    });
    expect(attr(html, /<link rel="alternate" type="text\/markdown" href="([^"]+)"/g)).toEqual([
      `${PREFIX}en/prompts/neon-alley/index.md`,
    ]);
    expect(attr(html, /<meta property="og:url" content="([^"]+)"/g)).toEqual([`${PREFIX}en/prompts/neon-alley/`]);
    const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)![1]);
    expect(ld.url).toBe(`${PREFIX}en/prompts/neon-alley/`);
    expect(ld.encoding.contentUrl).toBe(`${PREFIX}en/prompts/neon-alley/index.md`);
  });

  test('gallery, language entry and templates pages', async ({ request }) => {
    for (const [url, canonical] of [
      [listUrl('zh-hans'), `${PREFIX}zh-hans/prompts/`],
      [`${BASE}/`, PREFIX],
      [`${BASE}/en/templates/`, `${PREFIX}en/templates/`],
    ]) {
      const html = await (await raw(request, url)).text();
      expect(attr(html, /<link rel="canonical" href="([^"]+)"/g), url).toEqual([canonical]);
      for (const href of attr(html, /<link rel="alternate" hrefLang="[^"]+" href="([^"]+)"/g))
        expect(href.startsWith(PREFIX), href).toBe(true);
    }
  });

  test('sitemap.xml: every <loc> and xhtml:link is absolute with the prefix', async ({ request }) => {
    const xml = await (await raw(request, `${BASE}/sitemap.xml`)).text();
    const locs = attr(xml, /<loc>([^<]+)<\/loc>/g);
    const links = attr(xml, /<xhtml:link [^>]*href="([^"]+)"/g);
    expect(locs).toHaveLength(1 + 2 + 2 * SLUGS.length);
    expect(links.length).toBeGreaterThan(0);
    for (const u of [...locs, ...links]) expect(u.startsWith(PREFIX), u).toBe(true);
    expect(locs).toContain(`${PREFIX}zh-hans/prompts/neon-alley/`);
    const robots = await (await raw(request, `${BASE}/robots.txt`)).text();
    expect(robots).toContain(`Sitemap: ${PREFIX}sitemap.xml`);
  });

  test('every src/href to /_next/ or /generated/ in raw HTML carries the base path', async ({ request }) => {
    for (const url of [`${BASE}/`, listUrl(), detailUrl('neon-alley'), `${BASE}/en/templates/`]) {
      const html = await (await raw(request, url)).text();
      expect(html, url).not.toMatch(/(?:src|href)="\/(?:_next|generated)\//);
      expect(html, url).toMatch(/src="\/prompt-seen\/_next\/static\//);
    }
  });
});

test('Network: no request outside /prompt-seen/ (browser view + nginx access log)', async ({ page, browserName }) => {
  const since = new Date(Date.now() - 1000).toISOString();
  const seen: string[] = [];
  const failed: string[] = [];
  page.on('request', (r) => seen.push(r.url()));
  page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));

  await page.goto(`${BASE}/`);
  await page.getByRole('link', { name: 'English' }).click(); // soft navigation
  await expect(page.locator('[data-gallery][data-hydrated="true"]')).toBeAttached();
  await card(page, 'neon-alley').hover();
  await card(page, 'neon-alley').click();
  await expectPopupOpen(page, 'neon-alley');
  await page.keyboard.press('ArrowRight');
  await page.locator('dialog [data-testid="open-template"]').click();
  await expect(page.locator('[data-page="templates"]')).toBeVisible();
  await page.goBack();
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: '简体中文' }).click();
  await gotoGallery(page, 'zh-hans');
  await page.goto(detailUrl('tea-tin'));
  await page.getByTestId('back-to-list').click();
  await expect(page.locator('[data-gallery][data-hydrated="true"]')).toBeAttached();
  await page.waitForLoadState('networkidle');

  const sameOrigin = seen.map((u) => new URL(u)).filter((u) => u.origin === new URL(page.url()).origin);
  const outside = sameOrigin.filter((u) => !u.pathname.startsWith(`${BASE}/`)).map((u) => u.pathname);
  expect(outside).toEqual([]);
  expect(sameOrigin.some((u) => u.pathname.startsWith(`${BASE}/_next/`))).toBe(true);
  expect(sameOrigin.some((u) => u.pathname.startsWith(`${BASE}/generated/`))).toBe(true);
  expect(failed).toEqual([]);

  // The browser's own implicit requests (e.g. /favicon.ico) are invisible to page.on('request');
  // nginx sees them. Only this test's user agent is considered.
  const ua = await page.evaluate(() => navigator.userAgent);
  const log = execFileSync('docker', ['logs', '--since', since, 'prompt-seen-spike-nginx'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const paths = log
    .split('\n')
    .filter((l) => l.includes(`"${ua}"`))
    .map((l) => /"(?:GET|HEAD) ([^ ]+) HTTP/.exec(l)?.[1])
    .filter((p): p is string => !!p);
  expect(paths.length, `nginx saw requests from ${browserName}`).toBeGreaterThan(0);
  expect(paths.filter((p) => !p.startsWith(`${BASE}/`))).toEqual([]);
});
