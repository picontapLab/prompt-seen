import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { renderTemplate } from '../../src/modules/template';
import path from 'node:path';
import { BASE, ROOT, message } from './support/artifact';
import { localeIndex, promptDetail, templateDetail } from './support/content';
import { layoutProblems } from './support/layout';
import { seriousViolations, scrollToTop } from './support/a11y';
import { cancelledFetch } from './support/errors';

import { expectItalianState, italian } from './support/italian';
import { searchRecord, type LocalizationSearchCase } from '../support/localization-search';

test.beforeEach(() => expectItalianState());
test('it: requested artifact state is present', () => expectItalianState());
const searchCases: LocalizationSearchCase[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'production/localization/it/search-cases.json'), 'utf8'),
).cases;

test.describe('frozen Italian search scenarios in the real Worker', () => {
  test.skip(!italian, 'Italian is not part of this artifact');
  for (const example of searchCases) {
    test(example.query, async ({ page }) => {
      const index = localeIndex('it');
      await page.goto(`${BASE}/${italian!.pathPrefix}/search/?q=${encodeURIComponent(example.query)}`);
      for (const key of example.expectedKeys) {
        const [kind, id] = key.split('/');
        const record = searchRecord(index, key)!;
        expect(record, key).toBeDefined();
        await expect
          .poll(async () => {
            const paths = await page
              .locator(`[data-group="${kind}"] li a`)
              .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
            return paths.slice(0, example.topK).includes(`${BASE}${record.path}`);
          })
          .toBe(true);
        if (id === 'p_111' && example.query.includes('copertina')) {
          const result = page.locator(`[data-group="prompt"] a[href="${BASE}${record.path}"]`);
          await expect(
            result
              .locator('mark')
              .filter({ hasText: /^Ritratto$/i })
              .first(),
          ).toBeVisible();
        }
      }
      // Negative cases must inspect the complete result set, including every lazy-rendered page.
      if (example.excludedKeys?.length) {
        const more = page.locator('[data-search-more]');
        for (let n = 0; n < 200 && (await more.count()); n++) {
          const count = await page.locator('[data-group] li').count();
          await more.first().scrollIntoViewIfNeeded();
          await expect.poll(async () => await page.locator('[data-group] li').count()).toBeGreaterThan(count);
        }
        await expect(more).toHaveCount(0);
        for (const key of example.excludedKeys) {
          const record = searchRecord(index, key)!;
          expect(record, key).toBeDefined();
          await expect(page.locator('[data-group] a[href="' + BASE + record.path + '"]')).toHaveCount(0);
        }
      }
      if (!example.expectedKeys.length && !example.excludedKeys?.length) {
        await expect(
          page.getByText(message('it', 'search.noResults.title', { query: example.query }), { exact: true }),
        ).toBeVisible();
        await expect(page.locator('[data-group] li')).toHaveCount(0);
      }
      await page.goto(`${BASE}/it/`);
      await page.waitForFunction(() => {
        const button = document.querySelector('[data-search-launcher]');
        return button && Object.keys(button).some((key) => key.startsWith('__reactProps'));
      });
      // Keyboard activation gives every browser the same focus restoration origin;
      // Safari does not focus links on pointer activation.
      await page.locator('[data-search-launcher]').focus();
      await page.locator('[data-search-launcher]').press('Enter');
      const panel = page.locator('[data-quick-search]');
      const field = panel.getByRole('textbox');
      await field.fill(example.query);
      for (const key of example.expectedKeys) {
        const record = searchRecord(index, key)!;
        await expect(panel.locator(`a[href="${BASE}${record.path}"]`)).toBeVisible();
      }
      if (!example.expectedKeys.length && !example.excludedKeys?.length)
        await expect(
          panel.getByText(message('it', 'search.noResults.title', { query: example.query }), { exact: true }),
        ).toBeVisible();
      await field.press('Escape');
      await expect(page.locator('[data-search-launcher]')).toBeFocused();
    });
  }
});

test.describe('actual Italian preview samples', () => {
  test.skip(!italian, 'Italian is not part of this artifact');
  test('Chinese original remains Chinese in Italian display and clipboard', async ({ page, context, browserName }) => {
    const detail = promptDetail('it', 'p_217');
    expect(detail.prompt.language).toBe('zh-Hans');
    const original = fs.readFileSync(path.join(ROOT, 'content/prompts/p_217/prompt.txt'), 'utf8').trim();
    await page.goto(`${BASE}${detail.path}`);
    const prompt = page.locator('[id$="-prompt"]').first();
    await expect(prompt).toHaveAttribute('lang', 'zh-Hans');
    await expect(prompt).toHaveText(original);
    // Prompt pages expose Markdown export in production (covered by the HTTP suite).
    // The text-download button belongs to the template editor, tested separately below.
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.locator('[data-shortcut="copy"]').click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(original);
    }
  });

  test('Italian accents and AltGraph editing stay inside the template field', async ({ page }) => {
    await page.goto(`${BASE}${templateDetail('it', 't_001').path}`);
    const field = page.locator('[data-field-shell="product"] input');
    await expect(field).toHaveAccessibleName('Prodotto');
    await field.fill('caffè, perché, più, città, È — l’immagine');
    await field.dispatchEvent('keydown', { key: '@', code: 'KeyQ', ctrlKey: true, altKey: true });
    await expect(field).toHaveValue('caffè, perché, più, città, È — l’immagine');
    await expect(page.locator('[data-quick-search]')).toHaveCount(0);
    await expect(page.locator('[id$="-prompt"]').first()).toContainText('caffè, perché, più, città, È — l’immagine');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => [...document.fonts].some((face) => face.status === 'loaded'))).toBe(true);
  });
  for (const width of [360, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${width}px ${theme}: reviewed descriptions and controls fit`, async ({ page, browserName }) => {
        test.setTimeout(60_000);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          if (!cancelledFetch(error.message)) errors.push(error.message);
        });
        const paths = [
          `/${italian!.pathPrefix}/`,
          promptDetail('it', 'p_012').path,
          promptDetail('it', 'p_115').path,
          promptDetail('it', 'p_224').path,
          templateDetail('it', 't_001').path,
          `/${italian!.pathPrefix}/search/?q=tazza ceramica`,
        ];
        for (const path of paths) {
          await page.goto(`${BASE}${path}`);
          await expect(page.locator('html')).toHaveAttribute('lang', 'it');
          await expect(page.locator('h1')).toBeVisible();
          if (path.includes('/search/')) {
            await expect(
              page.locator('[data-group="prompt"] li').filter({ hasText: 'Poster con tazza di ceramica' }),
            ).toBeVisible();
          }
          const preview = page.locator('[data-static-from="lg"] > button');
          if (await preview.isVisible()) {
            await preview.click();
            await expect(preview).toHaveAttribute('aria-expanded', 'true');
          }
          expect(await layoutProblems(page), path).toEqual([]);
        }
        await page.goto(`${BASE}${promptDetail('it', 'p_012').path}`);
        await expect(page.locator('h1')).toHaveText('Ramo di pruno a inchiostro');
        expect(errors).toEqual([]);
        if (browserName === 'chromium' && [360, 1440].includes(width)) {
          const screenshot = test.info().outputPath(`italian-${width}-${theme}.png`);
          await page.screenshot({ path: screenshot });
          await test.info().attach('Italian layout', { path: screenshot, contentType: 'image/png' });
        }
      });
    }
  }

  test('translated template fields keep edited preview, copy and download identical', async ({
    page,
    context,
    browserName,
  }) => {
    const detail = templateDetail('it', 't_001');
    await page.goto(`${BASE}${detail.path}`);
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-field-shell="product"] input');
      return input && Object.keys(input).some((key) => key.startsWith('__reactProps'));
    });
    const field = page.locator('[data-field-shell="product"] input');
    await expect(field).toHaveAccessibleName('Prodotto');
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
    test(`${width}px: Italian popup, copy and favorites form one browsing flow`, async ({
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
      await page.goto(`${BASE}/${italian!.pathPrefix}/prompts/`);
      await page.waitForFunction(() => {
        const feed = document.querySelector('[role="feed"]');
        return feed && Object.keys(feed).some((key) => key.startsWith('__reactProps'));
      });
      const card = page.locator('[role="feed"] > article[data-entry]:not([data-interlude])').first();
      const id = (await card.getAttribute('data-entry'))!;
      const detail = promptDetail('it', id);
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
      await page.goto(`${BASE}/${italian!.pathPrefix}/favorites/`);
      const saved = page.locator(`[data-saved-entry="${id}"]`);
      await expect(saved).toContainText(detail.title);
      await saved.locator('a').first().click();
      await expect(popup.locator('h2').first()).toHaveText(detail.title);
      await expect(popup.locator('[data-shortcut="save"]')).toHaveAttribute('aria-pressed', 'true');
      // Saved Prompt cards open the same popup; refreshing its address opens the full detail.
      await page.reload();
      await expect(page.locator('h1')).toHaveText(detail.title);
      await expect(page.locator('html')).toHaveAttribute('lang', 'it');
      const detailSave = page.locator('[data-shortcut="save"]');
      await expect(detailSave).toHaveAttribute('aria-pressed', 'true');
      await expect(detailSave).toHaveAccessibleName(message('it', 'favorites.saved'));
      expect(errors).toEqual([]);
    });
  }

  test('Italian template reflows at the 720 CSS-pixel viewport of a 1440px display zoomed to 200%', async ({
    page,
  }) => {
    // Browser zoom reduces the layout viewport; CSS zoom alone does not update media queries.
    // This checks equivalent reflow. Native browser zoom remains a separate manual check.
    await page.setViewportSize({ width: 720, height: 450 });
    await page.goto(`${BASE}${templateDetail('it', 't_001').path}`);
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
