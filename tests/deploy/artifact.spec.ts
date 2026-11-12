import fs from 'node:fs';
import path from 'node:path';
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

// Serve the actual upload bytes at the browser's canonical or Pages origin. No traffic reaches
// production or analytics providers. Host rules/statuses are covered separately by check:live.
for (const host of ['canonical', 'pages-preview'] as const) {
  for (const [name, routePath] of [
    ['home', `${build.basePath}/`],
    ['list', list],
    ['detail', detail],
  ] as const) {
    test(`${host}: ${name} hydrates without runtime errors and respects integration isolation`, async ({
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
        let file = path.resolve(artifact, `.${decodeURIComponent(url.pathname)}`);
        if (
          (file === artifact || file.startsWith(`${artifact}${path.sep}`)) &&
          fs.existsSync(file) &&
          fs.statSync(file).isDirectory()
        ) {
          file = path.join(file, route.request().headers().rsc ? 'index.txt' : 'index.html');
        }
        if (!file.startsWith(`${artifact}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          missingFiles++;
          await route.fulfill({ status: 404, body: '' });
          return;
        }
        await route.fulfill({ path: file, contentType: mime[path.extname(file)] ?? 'application/octet-stream' });
      });
      await page.goto(`${origin}${routePath}`);
      await expect(page.locator('main')).toBeVisible();
      await page.waitForFunction(() => !!history.state?.__NA);
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
