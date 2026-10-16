import { execFileSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { BASE, BUILD, NGINX_CONTAINER } from './support/artifact';

// In a real browser: client navigation stays inside the base path, including requests the
// page cannot observe (the implicit /favicon.ico, memo §7.4 item 2), and the pages pass axe.

test('no request leaves the base path (browser view and nginx access log)', async ({ page, browserName }) => {
  const since = new Date(Date.now() - 2000).toISOString();
  const seen: URL[] = [];
  const failed: string[] = [];
  page.on('request', (r) => seen.push(new URL(r.url())));
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });

  await page.goto(`${BASE}/`);
  for (const locale of BUILD.locales) {
    // Soft navigation through next/link from the language entry to each locale and back.
    await page.locator(`[data-page="language-entry"] a[hreflang="${locale.htmlLang}"]`).click();
    await expect(page.locator(`main [data-locale="${locale.code}"]`)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', locale.direction);
    await page.goBack();
    await expect(page.locator('main [data-page="language-entry"]')).toBeVisible();
  }
  await page.goto(`${BASE}/${BUILD.locales[0]!.pathPrefix}/missing/`);
  await expect(page.locator('main [data-error="404"]')).toBeVisible();
  await page.locator('main [data-error="404"] a').first().click();
  await page.waitForLoadState('networkidle');

  const origin = new URL(page.url()).origin;
  const outside = seen.filter((u) => u.origin === origin && BASE && !u.pathname.startsWith(`${BASE}/`));
  expect(outside.map((u) => u.pathname)).toEqual([]);
  expect(failed.filter((f) => !f.includes('/missing/'))).toEqual([]);

  // The browser's implicit requests are invisible to page.on('request'); nginx sees them.
  const ua = await page.evaluate(() => navigator.userAgent);
  const log = execFileSync('docker', ['logs', '--since', since, NGINX_CONTAINER], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const paths = log
    .split('\n')
    .filter((line) => line.includes(`"${ua}"`))
    .map((line) => /"(?:GET|HEAD) ([^ ]+) HTTP/.exec(line)?.[1])
    .filter((p): p is string => !!p);
  expect(paths.length, `nginx saw requests from ${browserName}`).toBeGreaterThan(0);
  if (BASE) expect(paths.filter((p) => !p.startsWith(`${BASE}/`))).toEqual([]);
});

const pages = [
  { name: 'language entry', path: '/' },
  ...BUILD.locales.map((l) => ({ name: `${l.code} home`, path: `/${l.pathPrefix}/` })),
  { name: 'error page', path: `/${BUILD.locales[0]!.pathPrefix}/missing/` },
];

for (const { name, path } of pages) {
  test(`axe: ${name} has no serious or critical violations`, async ({ page }) => {
    await page.goto(`${BASE}${path}`);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });
}
