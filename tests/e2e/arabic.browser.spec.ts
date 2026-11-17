import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { searchRecord, type LocalizationSearchCase } from '../support/localization-search';
import { BASE, ROOT, message } from './support/artifact';
import { arabic, expectArabicState } from './support/arabic';
import { localeIndex, promptDetail, templateDetail } from './support/content';
import { layoutProblems } from './support/layout';
import { seriousViolations } from './support/a11y';

const cases: LocalizationSearchCase[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'production/localization/ar/search-cases.json'), 'utf8'),
).cases;

test('Arabic corpus browser acceptance checks artifact state', expectArabicState);

test.describe('frozen Arabic search scenarios in the real Worker', () => {
  test.skip(!arabic, 'Arabic is absent from this production artifact');
  for (const example of cases) {
    test(example.query, async ({ page }) => {
      const index = localeIndex('ar');
      const worker = page.waitForEvent('worker');
      await page.goto(`${BASE}/ar/search/?q=${encodeURIComponent(example.query)}`);
      await worker;
      for (const [keys, included] of [
        [example.expectedKeys, true],
        [example.excludedKeys ?? [], false],
      ] as const) {
        for (const key of keys) {
          const record = searchRecord(index, key);
          expect(record, key).toBeDefined();
          const kind = key.split('/')[0];
          await expect
            .poll(async () => {
              const paths = await page
                .locator(`[data-group="${kind}"] li a`)
                .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
              return paths.slice(0, example.topK).includes(`${BASE}${record!.path}`);
            })
            .toBe(included);
        }
      }
      if (example.expectedTotal === 0) {
        await expect(page.locator('[data-no-results]')).toBeVisible();
        await expect(page.locator('[data-group] li')).toHaveCount(0);
        await expect(page.locator('[data-no-results] bdi').first()).toHaveText(example.query);
      } else if (example.expectedTotal !== undefined) {
        const counts = await page.locator('[data-group] h2').allTextContents();
        expect(counts.reduce((total, text) => total + Number(text.match(/\d+$/)?.[0]), 0)).toBe(example.expectedTotal);
      }
    });
  }
});

test.describe('Arabic search recovery', () => {
  test.skip(!arabic, 'Arabic is absent from this production artifact');
  test('search still works when Workers cannot start', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'Worker', {
        value: class {
          constructor() {
            throw new Error('Workers unavailable in this acceptance scenario');
          }
        },
      });
    });
    await page.goto(`${BASE}/ar/search/?q=${encodeURIComponent('غصن برقوق بالحبر')}`);
    const detail = promptDetail('ar', 'p_012');
    await expect(page.locator(`[data-group="prompt"] a[href="${BASE}${detail.path}"]`)).toBeVisible();
  });

  test('an index with an old analyzer is rejected with the Arabic reload action', async ({ page }) => {
    await page.route(/\/generated\/ar\/search\/index\.json$/, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...(await response.json()), analyzerVersion: -1 } });
    });
    await page.goto(`${BASE}/ar/search/?q=${encodeURIComponent('غصن برقوق بالحبر')}`);
    await expect(page.getByRole('main').getByRole('alert')).toContainText(message('ar', 'search.error.stale'));
    await expect(page.getByRole('button', { name: message('ar', 'search.error.reload') })).toBeVisible();
  });
});

test.describe('Arabic typography and layout', () => {
  test.skip(!arabic, 'Arabic is absent from this production artifact');
  for (const width of [320, 360, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${width}px ${theme}: nested language and controls fit`, async ({ page }, testInfo) => {
        test.setTimeout(60_000);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        for (const route of [
          '/ar/',
          promptDetail('ar', 'p_012').path,
          templateDetail('ar', 't_001').path,
          '/ar/search/',
        ]) {
          await page.goto(`${BASE}${route}`);
          await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
          await expect(page.locator('h1')).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          const preview = page.locator('[data-static-from="lg"] > button');
          if (await preview.isVisible()) {
            await preview.click();
            await expect(preview).toHaveAttribute('aria-expanded', 'true');
          }
          expect(await layoutProblems(page), route).toEqual([]);
        }
        await page.goto(`${BASE}/ar/`);
        await expect
          .poll(() => page.locator('h1').evaluate((heading) => getComputedStyle(heading).fontFamily))
          .toContain('IBM Plex Sans Arabic');
        expect(await page.locator('h1').evaluate((heading) => getComputedStyle(heading).fontWeight)).toBe('600');
        await expect
          .poll(() =>
            page.evaluate(() =>
              [...document.fonts].some(
                (face) =>
                  face.family.includes('IBM Plex Sans Arabic') && face.weight === '600' && face.status === 'loaded',
              ),
            ),
          )
          .toBe(true);
        expect(await seriousViolations(page)).toEqual([]);
        const screenshot = testInfo.outputPath(`arabic-${width}-${theme}.png`);
        await page.screenshot({ path: screenshot });
        await testInfo.attach(`arabic-${width}-${theme}`, { path: screenshot, contentType: 'image/png' });
      });
    }
  }
});
