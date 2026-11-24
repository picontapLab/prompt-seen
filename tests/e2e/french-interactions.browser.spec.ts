import fs from 'node:fs';
import { renderTemplate } from '../../src/modules/template';
import { feedIndex, localeIndex, promptDetail, templateDetail } from './support/content';
import { expect, test, type Page } from '@playwright/test';
import { BASE, BUILD, message } from './support/artifact';
import { layoutProblems } from './support/layout';
import { seriousViolations, scrollToTop, settle } from './support/a11y';
import { cancelledFetch } from './support/errors';

import { expectFrenchState, french } from './support/french';
test.beforeAll(expectFrenchState);

async function openPreview(page: Page) {
  const selector = '[data-static-from="lg"] > button';
  const preview = page.locator(selector);
  if (!(await preview.isVisible())) return;
  await page.waitForFunction((value) => {
    const element = document.querySelector(value);
    return element && Object.keys(element).some((key) => key.startsWith('__reactProps'));
  }, selector);
  await preview.click();
  await expect(preview).toHaveAttribute('aria-expanded', 'true');
}

if (french) {
  test.describe('reviewed French pilot samples', () => {
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
            `/${french!.pathPrefix}/`,
            `/${french!.pathPrefix}/prompts/`,
            `/${french!.pathPrefix}/prompts/page/2/`,
            promptDetail('fr', 'p_012').path,
            promptDetail('fr', 'p_115').path,
            promptDetail('fr', 'p_224').path,
            templateDetail('fr', 't_001').path,
            localeIndex('fr').collections.find((item) => item.id === 'c_017')!.path,
            localeIndex('fr').topics.find((item) => item.taxonomy === 'style' && item.id === 'ink')!.path,
            `/${french!.pathPrefix}/search/?q=p_003`,
          ];
          for (const path of paths) {
            await page.goto(`${BASE}${path}`);
            await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
            await expect(page.locator('h1')).toBeVisible();
            if (path === `/${french!.pathPrefix}/`) {
              await expect(page.locator('[data-prompt-language="en"]').first()).toHaveText('Prompt · anglais');
            }
            if (path.includes('/search/')) {
              await expect(
                page.locator('[data-group="prompt"] li').filter({ hasText: 'Boîte de thé sur fond sauge' }),
              ).toBeVisible();
              await page.locator('[data-group="prompt"] li a').first().hover();
            }
            await openPreview(page);
            expect(await layoutProblems(page), path).toEqual([]);
            expect(await seriousViolations(page), path).toEqual([]);
          }
          await page.goto(`${BASE}${promptDetail('fr', 'p_012').path}`);
          await expect(page.locator('h1')).toHaveText('Branche de prunier à l’encre');
          expect(errors).toEqual([]);
        });
      }
    }

    for (const width of [360, 768, 1024, 1440]) {
      for (const theme of ['light', 'dark'] as const) {
        test(`${width}px ${theme}: French sorting and filters preserve readable controls and matching results`, async ({
          page,
        }) => {
          test.setTimeout(60_000);
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          await page.goto(`${BASE}/${french!.pathPrefix}/prompts/`);
          await page.waitForFunction(() => {
            const feed = document.querySelector('[role="feed"]');
            return feed && Object.keys(feed).some((key) => key.startsWith('__reactProps'));
          });
          const sort = page.getByRole('button', { name: message('fr', 'feed.filters.sort') });
          await sort.focus();
          await page.keyboard.press('ArrowDown');
          const options = page.getByRole('listbox');
          await expect(options).toBeVisible();
          await settle(page);
          await options.getByRole('option', { name: message('fr', 'feed.filters.featured') }).click();
          await expect(sort).toContainText(message('fr', 'feed.filters.featured'));
          await expect(sort).toBeFocused();
          await page
            .getByRole('button', {
              name: message('fr', width < 768 ? 'feed.filters.open' : 'feed.filters.panel'),
              exact: true,
            })
            .click();
          const dialog = page.getByRole('dialog');
          await expect(dialog).toBeVisible();
          await settle(page);
          const square = dialog.getByRole('button', { name: new RegExp(message('fr', 'feed.filters.shapes.square')) });
          await square.click();
          await expect(square).toHaveAttribute('aria-pressed', 'true');
          expect(await layoutProblems(page)).toEqual([]);
          expect(await seriousViolations(page)).toEqual([]);
          await page.keyboard.press('Escape');
          await expect(dialog).toBeHidden();
          await expect(page).toHaveURL(/shape=square.*sort=featured/);
          const cards = page.locator('[role="feed"] > article[data-entry]');
          await expect(cards.first()).toBeVisible();
          const matching = new Set(
            feedIndex('fr')
              .items.filter((item) => item.r === 'square')
              .map((item) => item.id),
          );
          for (const id of await cards.evaluateAll((items) => items.map((item) => item.getAttribute('data-entry')))) {
            expect(matching.has(id!)).toBe(true);
          }
          await page.getByRole('button', { name: message('fr', 'feed.filters.clear'), exact: true }).click();
          await expect(page).toHaveURL(/#sort=featured$/);
          await scrollToTop(page);
          expect(await layoutProblems(page)).toEqual([]);
        });

        test(`${width}px ${theme}: translated template fields keep edited preview, copy and download identical`, async ({
          page,
          context,
          browserName,
        }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          const detail = templateDetail('fr', 't_001');
          await page.goto(`${BASE}${detail.path}`);
          await page.waitForFunction(() => {
            const input = document.querySelector('[data-field-shell="product"] input');
            return input && Object.keys(input).some((key) => key.startsWith('__reactProps'));
          });
          const field = page.locator('[data-field-shell="product"] input');
          await expect(field).toHaveAccessibleName('Produit');
          await field.fill('a brass desk lamp');
          const expected = renderTemplate(
            { body: detail.version.body, fields: detail.version.fields },
            {
              ...detail.version.samples[0]!.values,
              product: 'a brass desk lamp',
            },
          ).text!;
          await expect(page.locator('[id$="-prompt"]').first()).toHaveText(expected);
          await openPreview(page);
          const downloading = page.waitForEvent('download');
          await page.locator('[data-action="download"]').click();
          const download = await downloading;
          expect(fs.readFileSync((await download.path())!, 'utf8')).toBe(expected);
          if (browserName === 'chromium') {
            await context.grantPermissions(['clipboard-read', 'clipboard-write']);
            await page.locator('[data-copy-state]').first().click();
            expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
          }
          await page.keyboard.press('Escape');
          await page.locator('[data-action="reset"]').click();
          await expect(page.locator('[id$="-prompt"]').first()).toHaveText(detail.version.defaultPrompt);
          await page.getByRole('button', { name: message('fr', 'templates.editor.undo') }).click();
          await expect(field).toHaveValue('a brass desk lamp');
          expect(await seriousViolations(page)).toEqual([]);
        });

        test(`${width}px ${theme}: French popup, copy and favorites form one browsing flow`, async ({
          page,
          context,
          browserName,
        }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
          const errors: string[] = [];
          page.on('pageerror', (error) => {
            if (!cancelledFetch(error.message)) errors.push(error.message);
          });
          await page.goto(`${BASE}/${french!.pathPrefix}/prompts/`);
          await page.waitForFunction(() => {
            const feed = document.querySelector('[role="feed"]');
            return feed && Object.keys(feed).some((key) => key.startsWith('__reactProps'));
          });
          const card = page.locator('[role="feed"] > article[data-entry]:not([data-interlude])').first();
          const id = (await card.getAttribute('data-entry'))!;
          const detail = promptDetail('fr', id);
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
          await page.goto(`${BASE}/${french!.pathPrefix}/favorites/`);
          const saved = page.locator(`[data-saved-entry="${id}"]`);
          await expect(saved).toContainText(detail.title);
          await saved.locator('a').first().click();
          await expect(popup.locator('h2').first()).toHaveText(detail.title);
          await expect(popup.locator('[data-shortcut="save"]')).toHaveAttribute('aria-pressed', 'true');
          // Saved Prompt cards open the same popup; refreshing its address opens the full detail.
          await page.reload();
          await expect(page.locator('h1')).toHaveText(detail.title);
          await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
          const detailSave = page.locator('[data-shortcut="save"]');
          await expect(detailSave).toHaveAttribute('aria-pressed', 'true');
          await expect(detailSave).toHaveAccessibleName(message('fr', 'favorites.saved'));
          expect(errors).toEqual([]);
        });
      }
    }

    test('French template reflows at the 720 CSS-pixel viewport of a 1440px display zoomed to 200%', async ({
      page,
    }) => {
      // Browser zoom reduces the layout viewport; CSS zoom alone does not update media queries.
      // This checks equivalent reflow. Native browser zoom remains a separate manual check.
      await page.setViewportSize({ width: 720, height: 450 });
      await page.goto(`${BASE}${templateDetail('fr', 't_001').path}`);
      await openPreview(page);
      const input = page.locator('[data-field-shell="product"] input');
      await page.keyboard.press('Escape');
      await input.focus();
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
      await openPreview(page);
      await scrollToTop(page);
      expect(await layoutProblems(page)).toEqual([]);
      expect(await seriousViolations(page)).toEqual([]);
    });
  });

  for (const preference of ['fr-FR', 'fr-CA', 'fr-BE', 'fr-CH']) {
    test.describe(`French browser preference ${preference}`, () => {
      test.use({ locale: preference });
      for (const width of [360, 1440]) {
        test(`${width}px: recommends a built French option without redirecting`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${BASE}/`);
          await expect(page.locator('html')).toHaveAttribute('lang', BUILD.defaultLocale);
          expect(new URL(page.url()).pathname).toBe(`${BASE}/`);
          const buttonSelector =
            width === 360 ? 'header button[aria-haspopup="dialog"]' : 'header button[aria-haspopup="listbox"]';
          await page.waitForFunction((selector) => {
            const element = document.querySelector(selector);
            return element && Object.keys(element).some((key) => key.startsWith('__reactProps'));
          }, buttonSelector);
          await page.locator(buttonSelector).click();
          if (width === 360) {
            await expect(page.getByRole('dialog')).toBeVisible();
            await settle(page);
            await page.getByRole('combobox', { name: message(BUILD.defaultLocale, 'shell.language.label') }).focus();
          }
          const option = page.getByRole('option', { name: /Français/ });
          if (!french) {
            await expect(option).toHaveCount(0);
            return;
          }
          await expect(option).toContainText(message(BUILD.defaultLocale, 'pages.entry.suggested'));
          await settle(page);
          expect(new URL(page.url()).pathname).toBe(`${BASE}/`);
          await option.click();
          await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
          expect(new URL(page.url()).pathname).toBe(`${BASE}/${french.pathPrefix}/`);
        });
      }
    });
  }

  test.describe('French search interaction and original Prompt text', () => {
    test('quick search and search page agree after rapid input, with indexes loaded on demand', async ({ page }) => {
      const indexes: string[] = [];
      page.on('request', (request) => {
        const pathname = new URL(request.url()).pathname;
        if (/\/generated\/[^/]+\/search\/index\.json$/.test(pathname)) indexes.push(pathname);
      });
      await page.goto(`${BASE}/${french!.pathPrefix}/prompts/`);
      await page.waitForFunction(() => {
        const element = document.querySelector('[data-search-launcher]');
        return element && Object.keys(element).some((key) => key.startsWith('__reactProps'));
      });
      await page.waitForLoadState('networkidle');
      expect(indexes).toEqual([]);
      await page.keyboard.press('/');
      const panel = page.locator('[data-quick-search]');
      const input = panel.getByRole('textbox');
      await expect(input).toBeFocused();
      await input.fill('portrait');
      await input.fill('encre');
      await expect(panel.locator('[data-pending]')).toHaveCount(0);
      const options = panel.locator('[role="option"][data-key^="prompt:"]');
      await expect(options.first()).toBeVisible();
      await expect(options.first()).toContainText(/encre/i);
      const quick = await options.evaluateAll((items) => items.map((item) => item.getAttribute('href')));
      expect(indexes.length).toBeGreaterThan(0);
      expect(indexes.every((url) => url.includes('/generated/fr/'))).toBe(true);
      await page.keyboard.press('Escape');
      await page.goto(`${BASE}/${french!.pathPrefix}/search/?q=encre`);
      const rows = page.locator('[data-group="prompt"] li a');
      await expect(rows.first()).toBeVisible();
      expect(
        (await rows.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).slice(0, quick.length),
      ).toEqual(quick);
      await page.locator('#search-field').fill('');
      await expect(page.locator('[data-group]')).toHaveCount(0);
      await expect(page).not.toHaveURL(/\?q=/);
    });

    test('searches original Chinese text and offers a Chinese title after an empty French search', async ({ page }) => {
      await page.goto(`${BASE}/${french!.pathPrefix}/search/?q=${encodeURIComponent('中度烘焙')}`);
      const target = promptDetail('fr', 'p_180');
      await expect(page.locator(`[data-group="prompt"] a[href="${BASE}${target.path}"]`)).toBeVisible();
      await page.locator('#search-field').fill('梅枝');
      const empty = page.locator('[data-no-results]');
      await expect(empty).toBeVisible();
      const chinese = BUILD.locales.find((locale) => locale.code === 'zh-Hans')!;
      await expect(
        empty.locator(`a[href="${BASE}/${chinese.pathPrefix}/search/?q=${encodeURIComponent('梅枝')}"]`),
      ).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.locator('#search-field')).toHaveValue('梅枝');
    });
  });
}
