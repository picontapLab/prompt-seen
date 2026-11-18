import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { readBuildInfo } from '../e2e/support/artifact';

const artifact = path.resolve('.deploy/cloudflare');
const build = readBuildInfo(artifact);
const locale = build.locales.find((entry) => entry.code === build.defaultLocale)!;
const site = path.join(artifact, build.basePath);
const list = `${build.basePath}/${locale.pathPrefix}/prompts/`;
const listHtml = fs.readFileSync(path.join(artifact, list, 'index.html'), 'utf8');
const detail = listHtml.match(/href="([^"]*\/prompts\/[^/"?#]+\/)"/)?.[1];
if (!detail) throw new Error('Prepared artifact has no prompt detail to smoke-test.');
const expectedIntegration = process.env.EXPECT_DEPLOY_INTEGRATION === 'true';
const fullPayloadSuffix = '/__next._full.txt';
const layoutPayloadName = '__next.$d$locale.!KHB1YmxpYyk.txt';
const payloadRules = fs.readFileSync(path.join(artifact, '_redirects'), 'utf8').split('\n');
const exactProxies = new Map(
  payloadRules
    .map((line) => line.trim().split(/\s+/))
    .filter(([from, , code]) => code === '200' && !/[*:]/.test(from!))
    .map(([from, to]) => [from!, to!]),
);
type PayloadWorker = {
  fetch(req: Request, env: { ASSETS: { fetch(req: Request): Promise<Response> } }): Promise<Response>;
};
const workerFile = path.join(artifact, '_worker.js');
const worker: Promise<PayloadWorker | null> = fs.existsSync(workerFile)
  ? import(pathToFileURL(workerFile).href).then((module) => module.default)
  : Promise.resolve(null);
// Exercise both full-pack and byte-range responses. Keep one pack in memory for the exhaustive check.
let cachedPack: { file: string; bytes: Buffer } = { file: '', bytes: Buffer.alloc(0) };
const assets = {
  async fetch(req: Request) {
    const file = path.join(artifact, new URL(req.url).pathname);
    if (!file.endsWith('.bin') || !fs.existsSync(file)) return new Response(null, { status: 404 });
    if (cachedPack.file !== file) cachedPack = { file, bytes: fs.readFileSync(file) };
    const range = /^bytes=(\d+)-(\d+)$/.exec(req.headers.get('Range') ?? '');
    if (range && Number(range[1]) > 0) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      return new Response(new Uint8Array(cachedPack.bytes.subarray(start, end + 1)), {
        status: 206,
        headers: { 'Content-Range': `bytes ${start}-${end}/${cachedPack.bytes.length}` },
      });
    }
    return new Response(req.method === 'HEAD' ? null : new Uint8Array(cachedPack.bytes));
  },
};
const mime: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.txt': 'text/x-component',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

test('prepared build identity matches the release', () => {
  expect(fs.existsSync(path.join(site, '404.html'))).toBe(true);
  if (process.env.BUILD_ID) expect(build.buildId).toBe(process.env.BUILD_ID);
  if (process.env.BUILD_MODE) expect(build.buildMode).toBe(process.env.BUILD_MODE);
});

test('prepared upload fits the Cloudflare Pages file limit', () => {
  const files = fs.readdirSync(artifact, { recursive: true, withFileTypes: true });
  expect(files.filter((file) => file.isFile()).length).toBeLessThanOrEqual(20_000);
});

test('both full navigation URLs revalidate the same uncompressed representation', async () => {
  const service = await worker;
  test.skip(!service || fs.existsSync(path.join(site, 'index.txt')), 'Root navigation is served as a static file');
  const get = (file: string, init?: RequestInit) =>
    service!.fetch(new Request(new URL(`${build.basePath}/${file}`, build.origin), init), { ASSETS: assets });
  const original = fs.readFileSync(path.join('dist', build.basePath, 'index.txt'));
  const head = await get('index.txt', { method: 'HEAD' });
  expect(head.status).toBe(200);
  expect(head.headers.get('content-length')).toBe(String(original.length));
  expect(await head.text()).toBe('');
  const etag = head.headers.get('etag');
  expect(etag).toBeTruthy();
  const cached = await get('__next._full.txt', { headers: { 'If-None-Match': `W/${etag}` } });
  expect(cached.status).toBe(304);
  expect(await cached.text()).toBe('');
  const missing = await get('no-such-navigation-route/__next._full.txt');
  expect(missing.status).toBe(404);
});

test('locale aliases and packed responses preserve every exported payload', async () => {
  test.setTimeout(120_000);
  const service = await worker;
  const routes: string[] = service
    ? JSON.parse(fs.readFileSync(path.join(artifact, '_routes.json'), 'utf8')).include
    : [];
  const matchers = routes.map((route) => new RegExp('^' + route.replaceAll('.', '\\.').replaceAll('*', '.*') + '$'));
  const packaged = path.join(path.resolve('dist'), build.basePath);
  const files = fs.readdirSync(packaged, { recursive: true, encoding: 'utf8' }).toSorted();
  for (const file of files) {
    if (
      !/(?:__next\.\$d\$locale\.txt|__next\._tree\.txt|\.__PAGE__\.txt)$/.test(file) &&
      path.basename(file) !== 'index.txt' &&
      path.basename(file) !== '__next._full.txt' &&
      !/^generated[/\\][^/\\]+[/\\]prompts[/\\][^/\\]+\.json$/.test(file)
    )
      continue;
    if (fs.existsSync(path.join(site, file))) continue;
    // A small export, or an oversized full payload, keeps the original Pages 200 proxy.
    if (path.basename(file) === '__next._full.txt' && fs.existsSync(path.join(site, path.dirname(file), 'index.txt')))
      continue;
    const pathname = build.basePath + '/' + file.split(path.sep).join('/');
    const expected = fs.readFileSync(path.join(packaged, file));
    const proxy = exactProxies.get(pathname);
    if (file.endsWith('__next.$d$locale.txt')) {
      assert(proxy && fs.readFileSync(path.join(artifact, proxy)).equals(expected), pathname);
    } else {
      assert(
        matchers.some((pattern) => pattern.test(pathname)),
        pathname,
      );
      const result = await service!.fetch(new Request(new URL(pathname, build.origin)), { ASSETS: assets });
      assert.equal(result.status, 200, pathname);
      assert(Buffer.from(await result.arrayBuffer()).equals(expected), pathname);
    }
  }
});

test('every compacted RSC address has a byte-identical payload and a Pages proxy rule', () => {
  expect(payloadRules).toContain(`${build.basePath}/__next._full.txt ${build.basePath}/index.txt 200`);
  expect(payloadRules).toContain(`${build.basePath}/*/__next._full.txt ${build.basePath}/:splat/index.txt 200`);
  for (const kind of ['prompts', 'templates']) {
    expect(payloadRules).toContain(
      `${build.basePath}/:locale/${kind}/:slug/__next._index.txt ${build.basePath}/generated/rsc/${kind}-index.txt 200`,
    );
    expect(payloadRules).toContain(
      `${build.basePath}/:locale/${kind}/:slug/${layoutPayloadName} ${build.basePath}/generated/rsc/:locale/${kind}-layout.txt 200`,
    );
  }
  const packagedSite = path.resolve('dist', `.${build.basePath}`);
  const copies = fs.readdirSync(packagedSite, { recursive: true, encoding: 'utf8' }).filter((file) => {
    const parts = file.split(path.sep);
    return (
      path.basename(file) === '__next._full.txt' ||
      (parts.length === 4 &&
        ['prompts', 'templates'].includes(parts[1]!) &&
        ['__next._index.txt', layoutPayloadName].includes(parts[3]!))
    );
  });
  expect(copies.length).toBeGreaterThan(0);
  for (const file of copies) {
    const parts = file.split(path.sep);
    const payload =
      path.basename(file) === '__next._full.txt'
        ? path.join(site, path.dirname(file), 'index.txt')
        : path.basename(file) === layoutPayloadName
          ? path.join(site, 'generated/rsc', parts[0]!, `${parts[1]}-layout.txt`)
          : path.join(site, 'generated/rsc', `${parts[1]}-index.txt`);
    expect(fs.existsSync(path.join(site, file)), file).toBe(false);
    if (path.basename(file) === '__next._full.txt' && !fs.existsSync(payload)) continue; // checked through the Function above
    expect(fs.readFileSync(payload).equals(fs.readFileSync(path.join(packagedSite, file))), file).toBe(true);
  }
});

// Serve the actual upload bytes at the browser's canonical or Pages origin. No traffic reaches
// production or analytics providers. Host rules/statuses are covered separately by check:live.
for (const host of ['canonical', 'pages-preview'] as const) {
  for (const [name, routePath] of [
    ['home', `${build.basePath}/`],
    ['list', list],
    ['detail', detail],
    ...build.locales
      .filter((l) => ['ja', 'ko'].includes(l.code) && host === 'canonical')
      .map((l) => ['templates', `${build.basePath}/${l.pathPrefix}/templates/`] as const),
  ] as const) {
    test(`${host}: ${routePath} hydrates without runtime errors and respects integration isolation`, async ({
      page,
      context,
    }) => {
      const origin = host === 'canonical' ? build.origin : 'https://artifact-smoke.pages.dev';
      let runtimeErrors = 0;
      let missingFiles = 0;
      let integrations = 0;
      page.on('pageerror', () => runtimeErrors++);
      page.on('console', (message) => {
        if (message.type() === 'error') runtimeErrors++;
      });
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        const script = route.request().resourceType() === 'script';
        const appChunk = url.origin === origin && url.pathname.startsWith(`${build.basePath}/_next/`);
        if (script && !appChunk) integrations++;
        if (script && url.origin !== origin) {
          // Execute a stub so loader/ordering errors surface without emitting real page views.
          await route.fulfill({
            contentType: 'application/javascript',
            body: 'window.__deployIntegrationExecuted = true;',
          });
          return;
        }
        if (url.origin !== origin) {
          await route.fulfill({
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
          });
          return;
        }
        // Apply the generated Pages 200 proxies when serving the compacted upload bytes.
        const pathname = decodeURIComponent(url.pathname);
        let payloadPath = pathname.endsWith(fullPayloadSuffix)
          ? `${pathname.slice(0, -fullPayloadSuffix.length)}/index.txt`
          : pathname;
        const parts = pathname.slice(build.basePath.length + 1).split('/');
        if (parts.length === 4 && ['prompts', 'templates'].includes(parts[1]!) && parts[3] === '__next._index.txt') {
          payloadPath = `${build.basePath}/generated/rsc/${parts[1]}-index.txt`;
        }
        if (parts.length === 4 && ['prompts', 'templates'].includes(parts[1]!) && parts[3] === layoutPayloadName) {
          payloadPath = `${build.basePath}/generated/rsc/${parts[0]}/${parts[1]}-layout.txt`;
        }
        payloadPath = exactProxies.get(pathname) ?? payloadPath;
        let file = path.resolve(artifact, `.${payloadPath}`);
        if (
          (file === artifact || file.startsWith(`${artifact}${path.sep}`)) &&
          fs.existsSync(file) &&
          fs.statSync(file).isDirectory()
        ) {
          file = path.join(file, route.request().headers().rsc ? 'index.txt' : 'index.html');
        }
        if (!file.startsWith(`${artifact}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          const service = await worker;
          const result = await service?.fetch(new Request(url, { method: route.request().method() }), {
            ASSETS: assets,
          });
          if (result?.ok) {
            await route.fulfill({
              status: result.status,
              contentType: result.headers.get('content-type')!,
              body: Buffer.from(await result.arrayBuffer()),
            });
            return;
          }
          missingFiles++;
          await route.fulfill({ status: 404, body: '' });
          return;
        }
        await route.fulfill({ path: file, contentType: mime[path.extname(file)] ?? 'application/octet-stream' });
      });
      await page.goto(`${origin}${routePath}`);
      await expect(page.locator('main')).toBeVisible();
      await page.waitForFunction(() => !!history.state?.__NA);
      if (name === 'templates') {
        const link = page.locator(`main article a[href^="${routePath}"]`).first();
        const href = await link.getAttribute('href');
        await page.evaluate(() => {
          document.documentElement.dataset.navigationProbe = 'true';
        });
        await link.hover();
        await link.click();
        await expect(page).toHaveURL(new URL(href!, origin).href);
        await expect(page.locator('html')).toHaveAttribute('data-navigation-probe', 'true');
        await expect(page.locator('main h1')).toBeVisible();
      }
      if (name === 'list') {
        await page.waitForFunction(() => history.scrollRestoration === 'manual');
        await page.locator(`a[href="${detail}"]`).first().click();
        await expect(page.locator('dialog[open]')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('dialog[open]')).toHaveCount(0);
      }
      // The standard loader can wait up to 4 seconds for idle; negative checks need that window.
      await page.waitForTimeout(4_500);
      const enabled = host === 'canonical' && build.buildMode === 'production';
      if (!enabled) expect(integrations, 'Preview must not request integration scripts').toBe(0);
      else if (expectedIntegration) {
        expect(integrations, 'Configured production integration did not start').toBeGreaterThan(0);
        expect(await page.evaluate(() => '__deployIntegrationExecuted' in window)).toBe(true);
      }
      // Counts only: private script bodies, URLs and configuration stay out of public logs.
      expect(missingFiles, 'Missing files in the final upload directory').toBe(0);
      expect(runtimeErrors, 'Browser runtime or console errors in the final upload directory').toBe(0);
    });
  }
}
