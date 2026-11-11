import fs from 'node:fs';
import path from 'node:path';
import { searchRecord, type LocalizationSearchCase } from '../support/localization-search';
import { renderTemplate } from '../../src/modules/template';
import { localeIndex, promptDetail, templateDetail } from './support/content';
import { expect, test } from '@playwright/test';
import { BASE, BUILD, ROOT, message } from './support/artifact';
import { layoutProblems } from './support/layout';
import { seriousViolations, scrollToTop } from './support/a11y';
import { cancelledFetch } from './support/errors';

const spanish = BUILD.locales.find((locale) => locale.code === 'es');

test.describe('Spanish foundation preview', () => {
  test.skip(!spanish, 'Spanish is disabled in this production artifact; this is not Spanish release acceptance');
  for (const width of [360, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${width}px ${theme}: foundation pages and navigation`, async ({ page }) => {
        test.setTimeout(60_000);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          if (!cancelledFetch(error.message)) errors.push(error.message);
        });
        for (const [slug, title] of [
          ['about', 'Acerca de Prompt Seen'],
          ['license', 'Licencia'],
        ]) {
          await page.goto(`${BASE}/${spanish!.pathPrefix}/${slug}/`);
          await expect(page.locator('html')).toHaveAttribute('lang', 'es');
          await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
          await expect(page.locator('h1')).toHaveText(title!);
          await expect(page.getByRole('link', { name: message('es', 'shell.skipToContent') })).toBeAttached();
          expect(await layoutProblems(page), slug).toEqual([]);
          expect(await seriousViolations(page), slug).toEqual([]);
        }
        expect(errors).toEqual([]);
      });
    }
  }
});

test.describe('reviewed Spanish pilot samples', () => {
  test.skip(!spanish, 'Spanish is not part of this artifact');
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
          `/${spanish!.pathPrefix}/`,
          promptDetail('es', 'p_012').path,
          promptDetail('es', 'p_115').path,
          promptDetail('es', 'p_224').path,
          templateDetail('es', 't_001').path,
          `/${spanish!.pathPrefix}/search/?q=p_003`,
        ];
        for (const path of paths) {
          await page.goto(`${BASE}${path}`);
          await expect(page.locator('html')).toHaveAttribute('lang', 'es');
          await expect(page.locator('h1')).toBeVisible();
          if (path === `/${spanish!.pathPrefix}/`) {
            await expect(page.locator('[data-prompt-language="en"]').first()).toHaveText('Prompt · inglés');
          }
          if (path.includes('/search/')) {
            await expect(
              page.locator('[data-group="prompt"] li').filter({ hasText: 'Lata de té sobre un fondo salvia' }),
            ).toBeVisible();
          }
          const preview = page.locator('[data-static-from="lg"] > button');
          if (await preview.isVisible()) {
            await preview.click();
            await expect(preview).toHaveAttribute('aria-expanded', 'true');
          }
          expect(await layoutProblems(page), path).toEqual([]);
        }
        await page.goto(`${BASE}${promptDetail('es', 'p_012').path}`);
        await expect(page.locator('h1')).toHaveText('Rama de ciruelo a tinta');
        expect(errors).toEqual([]);
      });
    }
  }

  test('translated template fields keep edited preview, copy and download identical', async ({
    page,
    context,
    browserName,
  }) => {
    const detail = templateDetail('es', 't_001');
    await page.goto(`${BASE}${detail.path}`);
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-field-shell="product"] input');
      return input && Object.keys(input).some((key) => key.startsWith('__reactProps'));
    });
    const field = page.locator('[data-field-shell="product"] input');
    await expect(field).toHaveAccessibleName('Producto');
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
    test(`${width}px: Spanish popup, copy and favorites form one browsing flow`, async ({
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
      await page.goto(`${BASE}/${spanish!.pathPrefix}/prompts/`);
      await page.waitForFunction(() => {
        const feed = document.querySelector('[role="feed"]');
        return feed && Object.keys(feed).some((key) => key.startsWith('__reactProps'));
      });
      const card = page.locator('[role="feed"] > article[data-entry]:not([data-interlude])').first();
      const id = (await card.getAttribute('data-entry'))!;
      const detail = promptDetail('es', id);
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
      await page.goto(`${BASE}/${spanish!.pathPrefix}/favorites/`);
      const saved = page.locator(`[data-saved-entry="${id}"]`);
      await expect(saved).toContainText(detail.title);
      await saved.locator('a').first().click();
      await expect(popup.locator('h2').first()).toHaveText(detail.title);
      await expect(popup.locator('[data-shortcut="save"]')).toHaveAttribute('aria-pressed', 'true');
      // Saved Prompt cards open the same popup; refreshing its address opens the full detail.
      await page.reload();
      await expect(page.locator('h1')).toHaveText(detail.title);
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
      const detailSave = page.locator('[data-shortcut="save"]');
      await expect(detailSave).toHaveAttribute('aria-pressed', 'true');
      await expect(detailSave).toHaveAccessibleName(message('es', 'favorites.saved'));
      expect(errors).toEqual([]);
    });
  }

  test('Spanish template reflows at the 720 CSS-pixel viewport of a 1440px display zoomed to 200%', async ({
    page,
  }) => {
    // Browser zoom reduces the layout viewport; CSS zoom alone does not update media queries.
    // This checks equivalent reflow. Native browser zoom remains a separate manual check.
    await page.setViewportSize({ width: 720, height: 450 });
    await page.goto(`${BASE}${templateDetail('es', 't_001').path}`);
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

// Preparation checks only current targets. An enabled candidate must exercise the full frozen set.
const searchCases: LocalizationSearchCase[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'production/localization/es/search-cases.json'), 'utf8'),
).cases;
const spanishIndex = spanish ? localeIndex('es') : null;
const readyCases = searchCases.filter(
  (example) =>
    spanishIndex &&
    example.expectedKeys.every((key) => searchRecord(spanishIndex, key)?.localization.localStatus === 'current'),
);

test.describe('frozen Spanish search scenarios in the real Worker', () => {
  test.skip(!spanish, 'Spanish is disabled in this artifact; no Spanish release acceptance is claimed');
  test('enabled Spanish includes every frozen scenario', () => {
    expect(readyCases.length).toBeGreaterThan(0);
    if (spanish!.enabled) expect(readyCases).toHaveLength(searchCases.length);
  });
  for (const example of readyCases) {
    test(example.query, async ({ page }) => {
      await page.goto(`${BASE}/${spanish!.pathPrefix}/search/?q=${encodeURIComponent(example.query)}`);
      for (const key of example.expectedKeys) {
        const kind = key.split('/')[0]!;
        const record = searchRecord(spanishIndex!, key);
        expect(record, key).toBeDefined();
        await expect
          .poll(
            async () => {
              const paths = await page
                .locator(`[data-group="${kind}"] li a`)
                .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
              return paths.slice(0, example.topK).includes(`${BASE}${record!.path}`);
            },
            { message: `${example.query}: ${key}` },
          )
          .toBe(true);
      }
      for (const key of example.excludedKeys ?? []) {
        const kind = key.split('/')[0]!;
        const record = searchRecord(spanishIndex!, key);
        expect(record, key).toBeDefined();
        const paths = await page
          .locator(`[data-group="${kind}"] li a`)
          .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
        expect(paths.slice(0, example.topK), example.query).not.toContain(`${BASE}${record!.path}`);
      }
    });
  }
});
