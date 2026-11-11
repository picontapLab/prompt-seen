import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { renderTemplate } from '../../src/modules/template';
import { BASE, BUILD } from './support/artifact';
import { promptDetail, templateDetail } from './support/content';
import { layoutProblems } from './support/layout';
import { seriousViolations, scrollToTop } from './support/a11y';
import { cancelledFetch } from './support/errors';

const german = BUILD.locales.find((locale) => locale.code === 'de');
test.describe('actual German preview samples', () => {
  test.skip(!german, 'German is not part of this artifact');
  for (const width of [360, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${width}px ${theme}: reviewed descriptions and controls fit`, async ({ page }) => {
        test.setTimeout(60_000);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          if (!cancelledFetch(error.message)) errors.push(error.message);
        });
        const paths = [
          `/${german!.pathPrefix}/`,
          promptDetail('de', 'p_012').path,
          promptDetail('de', 'p_115').path,
          promptDetail('de', 'p_224').path,
          templateDetail('de', 't_001').path,
          `/${german!.pathPrefix}/search/?q=Keramikbecher`,
        ];
        for (const path of paths) {
          await page.goto(`${BASE}${path}`);
          await expect(page.locator('html')).toHaveAttribute('lang', 'de');
          await expect(page.locator('h1')).toBeVisible();
          if (path.includes('/search/')) {
            await expect(
              page.locator('[data-group="prompt"] li').filter({ hasText: 'Poster mit Keramikbecher' }),
            ).toBeVisible();
          }
          const preview = page.locator('[data-static-from="lg"] > button');
          if (await preview.isVisible()) {
            await preview.click();
            await expect(preview).toHaveAttribute('aria-expanded', 'true');
          }
          expect(await layoutProblems(page), path).toEqual([]);
        }
        await page.goto(`${BASE}${promptDetail('de', 'p_012').path}`);
        await expect(page.locator('h1')).toHaveText('Pflaumenzweig in Tusche');
        expect(errors).toEqual([]);
      });
    }
  }

  test('translated template fields keep edited preview, copy and download identical', async ({
    page,
    context,
    browserName,
  }) => {
    const detail = templateDetail('de', 't_001');
    await page.goto(`${BASE}${detail.path}`);
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-field-shell="product"] input');
      return input && Object.keys(input).some((key) => key.startsWith('__reactProps'));
    });
    const field = page.locator('[data-field-shell="product"] input');
    await expect(field).toHaveAccessibleName('Produkt');
    await field.fill('a brass desk lamp');
    const expected = renderTemplate(
      { body: detail.version.body, fields: detail.version.fields },
      {
        ...detail.version.samples[0]!.values,
        product: 'a brass desk lamp',
      },
    ).text!;
    await expect(page.locator('[id$="-prompt"]').first()).toHaveText(expected);
    const downloading = page.waitForEvent('download');
    await page.locator('[data-action="download"]').click();
    const download = await downloading;
    expect(fs.readFileSync((await download.path())!, 'utf8')).toBe(expected);
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.locator('[data-copy-state]').first().click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    }
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('German template reflows at the 720 CSS-pixel viewport of a 1440px display zoomed to 200%', async ({ page }) => {
    // Browser zoom reduces the layout viewport; CSS zoom alone does not update media queries.
    // This checks equivalent reflow. Native browser zoom remains a separate manual check.
    await page.setViewportSize({ width: 720, height: 450 });
    await page.goto(`${BASE}${templateDetail('de', 't_001').path}`);
    const preview = page.locator('[data-static-from="lg"] > button');
    if (await preview.isVisible()) {
      await preview.click();
      await expect(preview).toHaveAttribute('aria-expanded', 'true');
    }
    const input = page.locator('[data-field-shell="product"] input');
    await page.keyboard.press('Escape');
    await input.focus();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
    if (await preview.isVisible()) {
      await preview.click();
      await expect(preview).toHaveAttribute('aria-expanded', 'true');
    }
    await scrollToTop(page);
    expect(await layoutProblems(page)).toEqual([]);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
