import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { renderTemplate } from '../../src/modules/template';
import path from 'node:path';
import { BASE, BUILD, ROOT, message } from './support/artifact';
import { localeIndex, promptDetail, templateDetail } from './support/content';
import { layoutProblems } from './support/layout';
import { seriousViolations, scrollToTop } from './support/a11y';
import { cancelledFetch } from './support/errors';

const german = BUILD.locales.find((locale) => locale.code === 'de');
const searchCases: { query: string; expectedKeys: string[]; topK: number }[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'production/localization/de/search-cases.json'), 'utf8'),
).cases;

test.describe('frozen German search scenarios in the real Worker', () => {
  test.skip(!german, 'German is not part of this artifact');
  for (const example of searchCases) {
    test(example.query, async ({ page }) => {
      const index = localeIndex('de');
      await page.goto(`${BASE}/${german!.pathPrefix}/search/?q=${encodeURIComponent(example.query)}`);
      for (const key of example.expectedKeys) {
        const [kind, id] = key.split('/');
        const records = kind === 'prompt' ? index.prompts : index.templates;
        const record = records.find((item) => item.id === id)!;
        expect(record, key).toBeDefined();
        await expect
          .poll(async () => {
            const paths = await page
              .locator(`[data-group="${kind}"] li a`)
              .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
            return paths.slice(0, example.topK).includes(`${BASE}${record.path}`);
          })
          .toBe(true);
        if (id === 'p_111' && example.query.includes('Magazincover')) {
          const result = page.locator(`[data-group="prompt"] a[href="${BASE}${record.path}"]`);
          await expect(
            result
              .locator('mark')
              .filter({ hasText: /^Porträt$/ })
              .first(),
          ).toBeVisible();
        }
      }
    });
  }
});

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

  for (const width of [360, 1440]) {
    test(`${width}px: German popup, copy and favorites form one browsing flow`, async ({
      page,
      context,
      browserName,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        if (!cancelledFetch(error.message)) errors.push(error.message);
      });
      await page.goto(`${BASE}/${german!.pathPrefix}/prompts/`);
      await page.waitForFunction(() => {
        const feed = document.querySelector('[role="feed"]');
        return feed && Object.keys(feed).some((key) => key.startsWith('__reactProps'));
      });
      const card = page.locator('[role="feed"] > article[data-entry]:not([data-interlude])').first();
      const id = (await card.getAttribute('data-entry'))!;
      const detail = promptDetail('de', id);
      await card.locator('a').first().click();
      const popup = page.locator('dialog[data-popup][open]');
      await expect(popup.locator('h2').first()).toHaveText(detail.title);
      await expect(popup.locator('[data-shortcut="save"]')).toBeVisible();
      await popup.locator('[data-shortcut="save"]').click();
      await expect(popup.locator('[data-shortcut="save"]')).toHaveAttribute('aria-pressed', 'true');
      if (browserName === 'chromium') {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await popup.locator('[data-shortcut="copy"]').click();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(detail.prompt.text.trim());
      }
      expect(await seriousViolations(page)).toEqual([]);
      await popup.locator('[data-popup-close]').click();
      await expect(popup).toHaveCount(0);
      await page.goto(`${BASE}/${german!.pathPrefix}/favorites/`);
      const saved = page.locator(`[data-saved-entry="${id}"]`);
      await expect(saved).toContainText(detail.title);
      await saved.locator('a').first().click();
      await expect(popup.locator('h2').first()).toHaveText(detail.title);
      await expect(popup.locator('[data-shortcut="save"]')).toHaveAttribute('aria-pressed', 'true');
      // Saved Prompt cards open the same popup; refreshing its address opens the full detail.
      await page.reload();
      await expect(page.locator('h1')).toHaveText(detail.title);
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
      const detailSave = page.locator('[data-shortcut="save"]');
      await expect(detailSave).toHaveAttribute('aria-pressed', 'true');
      await expect(detailSave).toHaveAccessibleName(message('de', 'favorites.saved'));
      expect(errors).toEqual([]);
    });
  }

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
