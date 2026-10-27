// Lab measurements of the first complete front-end acceptance (design doc §16.1, §16.5, §17.3
// step 6): per page on a cold cache, LCP, CLS, blocking time, the longest task and the bytes
// transferred; then the input delay of typing in the template editor and opening the detail
// popup, and frame pacing while the list scrolls. Two profiles: desktop 1440 × 900 without
// throttling, and a phone 390 × 844 on Slow 4G with a 4× slower CPU (Chrome DevTools Protocol).
// Lab numbers find problems; they do not replace field data (§16.1).
//
// Run against the build in dist/, served with `npm run serve` (PORT as for the tests):
//   npx tsx scripts/measure-lab.ts [/en/prompts/ …]
import { chromium, type Browser } from '@playwright/test';
import { BASE, BUILD, PORT } from '../tests/e2e/support/artifact';
import { localeIndex, samplePrompt } from '../tests/e2e/support/content';
import { SLOW_4G } from '../tests/e2e/support/layout';

type Profile = { name: string; width: number; height: number; phone: boolean };
const PROFILES: Profile[] = [
  { name: 'desktop 1440 × 900', width: 1440, height: 900, phone: false },
  { name: 'phone 390 × 844, Slow 4G, 4× CPU', width: 390, height: 844, phone: true },
];

const origin = `http://127.0.0.1:${PORT}${BASE}`;
const locale = BUILD.locales.find((l) => l.code === BUILD.defaultLocale) ?? BUILD.locales[0]!;
const index = localeIndex(locale.code);
const template = [...index.templates].sort((a, b) => b.fieldCount - a.fieldCount)[0];
const given = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const pages = given.length
  ? given
  : [
      ...BUILD.locales.map((l) => `/${l.pathPrefix}/`),
      ...BUILD.locales.map((l) => `/${l.pathPrefix}/prompts/`),
      samplePrompt(locale.code).path,
      ...(template ? [template.path] : []),
    ];

const takenOver = () =>
  Object.keys(document.querySelector('header button, header a[href]') ?? {}).some((k) => k.startsWith('__react'));

async function load(browser: Browser, profile: Profile, path: string) {
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    isMobile: profile.phone,
    hasTouch: profile.phone,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const m = { cls: 0, lcp: 0, blocking: 0, longest: 0 };
    (window as unknown as { __lab: typeof m }).__lab = m;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
        if (!e.hadRecentInput) m.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      m.lcp = list.getEntries().at(-1)!.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        m.blocking += Math.max(0, e.duration - 50);
        m.longest = Math.max(m.longest, e.duration);
      }
    }).observe({ type: 'longtask', buffered: true });
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (profile.phone) {
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...SLOW_4G });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  let bytes = 0;
  cdp.on('Network.loadingFinished', (e) => (bytes += e.encodedDataLength));
  const start = Date.now();
  await page.goto(`${origin}${path}`, { waitUntil: 'load', timeout: 90_000 });
  await page.waitForFunction(takenOver, null, { timeout: 60_000 });
  const interactive = Date.now() - start;
  await page.waitForTimeout(1500);
  type Lab = { cls: number; lcp: number; blocking: number; longest: number };
  const m = await page.evaluate(() => (window as unknown as { __lab: Lab }).__lab);
  await context.close();
  return { interactive, ...m, kib: bytes / 1024 };
}

async function interactions(browser: Browser, profile: Profile) {
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    isMobile: profile.phone,
    hasTouch: profile.phone,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const events: number[] = [];
    (window as unknown as { __events: number[] }).__events = events;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { interactionId?: number })[])
        if (e.interactionId) events.push(e.duration);
    }).observe({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit);
  });
  const cdp = await context.newCDPSession(page);
  if (profile.phone) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const events = () => page.evaluate(() => (window as unknown as { __events: number[] }).__events.splice(0));
  const out: Record<string, string> = {};

  if (template) {
    await page.goto(`${origin}${template.path}`);
    await page.waitForFunction(() =>
      Object.keys(document.querySelector('[data-field-shell] input') ?? {}).some((k) => k.startsWith('__reactProps')),
    );
    await page.locator('[data-field-shell] input:not([type=radio])').first().click();
    await events();
    await page.keyboard.type('Copper kettle on a stove', { delay: 60 });
    await page.waitForTimeout(500);
    out['editor keystroke, slowest'] = `${Math.round(Math.max(0, ...(await events())))} ms`;
  }

  await page.goto(`${origin}/${locale.pathPrefix}/prompts/`);
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('[role="feed"]') ?? {}).some((k) => k.startsWith('__react')),
  );
  await events();
  const card = page.locator('[role="feed"] article[data-entry]:not([data-interlude]) a').nth(3);
  await (profile.phone ? card.tap() : card.click());
  await page.locator('dialog[data-popup] [id$="-prompt"]').first().waitFor();
  await page.waitForTimeout(800);
  out['popup open'] = `${Math.round(Math.max(0, ...(await events())))} ms`;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  // A string, so the bundler adds no helpers (tsx names the inner functions) to page code.
  const frames = (await page.evaluate(`(async () => {
    const gaps = [];
    let last = performance.now();
    let running = true;
    const tick = (t) => {
      gaps.push(t - last);
      last = t;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    for (let i = 0; i < 40; i++) {
      window.scrollBy(0, 120);
      await new Promise((r) => setTimeout(r, 25));
    }
    running = false;
    gaps.sort((a, b) => a - b);
    return { median: gaps[Math.floor(gaps.length / 2)], over50: gaps.filter((g) => g > 50).length, n: gaps.length };
  })()`)) as { median: number; over50: number; n: number };
  out['list scroll frames'] = `median ${frames.median.toFixed(1)} ms, ${frames.over50} of ${frames.n} over 50 ms`;
  await context.close();
  return out;
}

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
for (const profile of PROFILES) {
  console.log(`\n${profile.name}\n`);
  console.log('| Page | LCP | CLS | Took over | Blocking | Longest task | Transferred |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const path of pages) {
    const r = await load(browser, profile, path);
    console.log(
      `| ${path} | ${(r.lcp / 1000).toFixed(2)} s | ${r.cls.toFixed(3)} | ${(r.interactive / 1000).toFixed(2)} s | ` +
        `${Math.round(r.blocking)} ms | ${Math.round(r.longest)} ms | ${Math.round(r.kib)} KiB |`,
    );
  }
  console.log('');
  for (const [k, v] of Object.entries(await interactions(browser, profile))) console.log(`- ${k}: ${v}`);
}
await browser.close();
