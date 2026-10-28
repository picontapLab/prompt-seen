import { test } from '@playwright/test';
import { BASE, BUILD } from './support/artifact';
import { localeIndex, templateDetail } from './support/content';

const code = BUILD.locales[0]!.code;
const summary = [...localeIndex(code).templates].sort((a, b) => b.fieldCount - a.fieldCount)[0]!;
const template = templateDetail(code, summary.id);

test('effect re-runs on fragment navigation', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __hc: string[] };
    w.__hc = [];
    const add = window.addEventListener.bind(window);
    window.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => {
      if (type === 'hashchange') w.__hc.push(`add ${Math.round(performance.now())}`);
      return add(type, fn, opts as AddEventListenerOptions);
    }) as typeof window.addEventListener;
    const rm = window.removeEventListener.bind(window);
    window.removeEventListener = ((type: string, fn: EventListenerOrEventListenerObject, opts?: unknown) => {
      if (type === 'hashchange') w.__hc.push(`remove ${Math.round(performance.now())}`);
      return rm(type, fn, opts as EventListenerOptions);
    }) as typeof window.removeEventListener;
  });
  const url = `${BASE}${template.path}`;
  await page.goto(url);
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => (window as unknown as { __hc: string[] }).__hc.length);
  await page.goto(`${url}#${template.version.id}=eyJ4IjoxfQ`);
  await page.waitForTimeout(1500);
  const log = await page.evaluate(() => (window as unknown as { __hc: string[] }).__hc);
  console.log(test.info().project.name, 'before', before, 'after', log.length, log.join(', '));
});
