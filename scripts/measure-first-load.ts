// Measures each page's JavaScript the way design doc §16.1 records it: the scripts the HTML
// references (first load), and everything fetched until the page has been idle for a while (idle
// preloads plus next/link prefetches of the routes linked from the page). Sizes are gzip (level 6)
// of the bodies, since the reference nginx serves files uncompressed.
//
// Run against the build in dist/, served with `npm run serve` (PORT as for the tests):
//   npx tsx scripts/measure-first-load.ts [--no-prefetch] [/en/prompts/ …]
// Without paths it measures one page of each kind in the default locale. --no-prefetch blocks
// the router's segment requests (*.txt), which leaves first load plus idle preloads.
import zlib from 'node:zlib';
import { chromium } from '@playwright/test';
import { BASE, BUILD, PORT } from '../tests/e2e/support/artifact';
import { localeIndex, samplePrompt, sampleTemplate } from '../tests/e2e/support/content';

const IDLE_MS = 6000; // longer than the idle-callback timeouts of the toast region and search panel

const args = process.argv.slice(2);
const noPrefetch = args.includes('--no-prefetch');
const given = args.filter((a) => !a.startsWith('--'));

function defaultPages(): string[] {
  const locale = BUILD.locales.find((l) => l.code === BUILD.defaultLocale) ?? BUILD.locales[0]!;
  const p = `/${locale.pathPrefix}`;
  const index = localeIndex(locale.code);
  return [
    `${p}/`,
    `${p}/prompts/`,
    samplePrompt(locale.code).path,
    `${p}/templates/`,
    sampleTemplate(locale.code)?.path,
    `${p}/collections/`,
    index.topics[0]?.path,
    `${p}/search/`,
  ].filter((x): x is string => !!x);
}

const kib = (n: number) => (n / 1024).toFixed(1);
const origin = `http://127.0.0.1:${PORT}`;
const pages = given.length ? given : defaultPages();

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
console.log(
  `| Page | First load (HTML scripts) | After ${IDLE_MS / 1000} s idle${noPrefetch ? ', no prefetch' : ''} |`,
);
console.log('| --- | --- | --- |');
for (const path of pages) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  if (noPrefetch) await page.route(/\.txt(\?|$)/, (route) => route.abort());
  const sizes = new Map<string, number>();
  page.on('response', async (res) => {
    if (res.request().resourceType() !== 'script' && !res.url().endsWith('.js')) return;
    try {
      sizes.set(res.url(), zlib.gzipSync(await res.body(), { level: 6 }).length);
    } catch {
      // A response without a body (aborted or redirected) has nothing to count.
    }
  });
  const response = await page.goto(`${origin}${BASE}${path}`, { waitUntil: 'networkidle' });
  const html = (await response?.text()) ?? '';
  await page.waitForTimeout(IDLE_MS);
  await page.waitForLoadState('networkidle');
  const referenced = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => new URL(m[1]!, origin).href);
  const sum = (urls: Iterable<string>) => [...urls].reduce((s, u) => s + (sizes.get(u) ?? 0), 0);
  console.log(
    `| ${path} | ${referenced.length} scripts, ${kib(sum(referenced))} KiB | ${sizes.size} scripts, ${kib(sum(sizes.keys()))} KiB |`,
  );
  await context.close();
}
await browser.close();
