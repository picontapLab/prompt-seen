import fs from 'node:fs';
import path from 'node:path';
import { searchRecord, type LocalizationSearchCase } from '../support/localization-search';
import { renderTemplate } from '../../src/modules/template';
import { feedIndex, localeIndex, promptDetail, templateDetail } from './support/content';
import { expect, test, type Page } from '@playwright/test';
import { BASE, BUILD, ROOT, message } from './support/artifact';
import { layoutProblems } from './support/layout';
import { seriousViolations, scrollToTop, settle } from './support/a11y';
import { cancelledFetch } from './support/errors';

const spanish = BUILD.locales.find((locale) => locale.code === 'es');

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
          `/${spanish!.pathPrefix}/prompts/`,
          `/${spanish!.pathPrefix}/prompts/page/2/`,
          promptDetail('es', 'p_012').path,
          promptDetail('es', 'p_115').path,
          promptDetail('es', 'p_224').path,
          templateDetail('es', 't_001').path,
          localeIndex('es').collections.find((item) => item.id === 'c_017')!.path,
          localeIndex('es').topics.find((item) => item.taxonomy === 'style' && item.id === 'ink')!.path,
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
            await page.locator('[data-group="prompt"] li a').first().hover();
          }
          await openPreview(page);
          expect(await layoutProblems(page), path).toEqual([]);
          expect(await seriousViolations(page), path).toEqual([]);
        }
        await page.goto(`${BASE}${promptDetail('es', 'p_012').path}`);
        await expect(page.locator('h1')).toHaveText('Rama de ciruelo a tinta');
        expect(errors).toEqual([]);
      });
    }
  }

  for (const width of [360, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${width}px ${theme}: Spanish sorting and filters preserve readable controls and matching results`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await page.goto(`${BASE}/${spanish!.pathPrefix}/prompts/`);
        await page.waitForFunction(() => {
          const feed = document.querySelector('[role="feed"]');
          return feed && Object.keys(feed).some((key) => key.startsWith('__reactProps'));
        });
        const sort = page.getByRole('button', { name: message('es', 'feed.filters.sort') });
        await sort.focus();
        await page.keyboard.press('ArrowDown');
        const options = page.getByRole('listbox');
        await expect(options).toBeVisible();
        await settle(page);
        await options.getByRole('option', { name: message('es', 'feed.filters.featured') }).click();
        await expect(sort).toContainText(message('es', 'feed.filters.featured'));
        await expect(sort).toBeFocused();
        await page
          .getByRole('button', {
            name: message('es', width < 768 ? 'feed.filters.open' : 'feed.filters.panel'),
            exact: true,
          })
          .click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await settle(page);
        const square = dialog.getByRole('button', { name: new RegExp(message('es', 'feed.filters.shapes.square')) });
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
          feedIndex('es')
            .items.filter((item) => item.r === 'square')
            .map((item) => item.id),
        );
        for (const id of await cards.evaluateAll((items) => items.map((item) => item.getAttribute('data-entry')))) {
          expect(matching.has(id!)).toBe(true);
        }
        await page.getByRole('button', { name: message('es', 'feed.filters.clear'), exact: true }).click();
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
        expect(await seriousViolations(page)).toEqual([]);
      });

      test(`${width}px ${theme}: Spanish popup, copy and favorites form one browsing flow`, async ({
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
  }

  test('Spanish template reflows at the 720 CSS-pixel viewport of a 1440px display zoomed to 200%', async ({
    page,
  }) => {
    // Browser zoom reduces the layout viewport; CSS zoom alone does not update media queries.
    // This checks equivalent reflow. Native browser zoom remains a separate manual check.
    await page.setViewportSize({ width: 720, height: 450 });
    await page.goto(`${BASE}${templateDetail('es', 't_001').path}`);
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

// Full content acceptance requires every frozen scenario in preview and production.
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
  test('Spanish includes every frozen scenario', () => {
    expect(readyCases).toHaveLength(searchCases.length);
  });
  for (const example of searchCases) {
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

for (const preference of ['es-ES', 'es-MX', 'es-AR', 'es-419']) {
  test.describe(`Spanish browser preference ${preference}`, () => {
    test.use({ locale: preference });
    for (const width of [360, 1440]) {
      test(`${width}px: recommends a built Spanish option without redirecting`, async ({ page }) => {
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
        const option = page.getByRole('option', { name: /Español/ });
        if (!spanish) {
          await expect(option).toHaveCount(0);
          return;
        }
        await expect(option).toContainText(message(BUILD.defaultLocale, 'pages.entry.suggested'));
        await settle(page);
        expect(new URL(page.url()).pathname).toBe(`${BASE}/`);
        await option.click();
        await expect(page.locator('html')).toHaveAttribute('lang', 'es');
        expect(new URL(page.url()).pathname).toBe(`${BASE}/${spanish.pathPrefix}/`);
      });
    }
  });
}

test.describe('Spanish search interaction and original Prompt text', () => {
  test.skip(!spanish, 'Spanish is not part of this artifact');
  test('quick search and search page agree after rapid input, with indexes loaded on demand', async ({ page }) => {
    const indexes: string[] = [];
    page.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (/\/generated\/[^/]+\/search\/index\.json$/.test(pathname)) indexes.push(pathname);
    });
    await page.goto(`${BASE}/${spanish!.pathPrefix}/prompts/`);
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
    await input.fill('retrato');
    await input.fill('tinta');
    await expect(panel.locator('[data-pending]')).toHaveCount(0);
    const options = panel.locator('[role="option"][data-key^="prompt:"]');
    await expect(options.first()).toBeVisible();
    await expect(options.first()).toContainText(/tinta/i);
    const quick = await options.evaluateAll((items) => items.map((item) => item.getAttribute('href')));
    expect(indexes.length).toBeGreaterThan(0);
    expect(indexes.every((url) => url.includes('/generated/es/'))).toBe(true);
    await page.keyboard.press('Escape');
    await page.goto(`${BASE}/${spanish!.pathPrefix}/search/?q=tinta`);
    const rows = page.locator('[data-group="prompt"] li a');
    await expect(rows.first()).toBeVisible();
    expect(
      (await rows.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).slice(0, quick.length),
    ).toEqual(quick);
    await page.locator('#search-field').fill('');
    await expect(page.locator('[data-group]')).toHaveCount(0);
    await expect(page).not.toHaveURL(/\?q=/);
  });

  test('searches original Chinese text and offers a Chinese title after an empty Spanish search', async ({ page }) => {
    await page.goto(`${BASE}/${spanish!.pathPrefix}/search/?q=${encodeURIComponent('中度烘焙')}`);
    const target = promptDetail('es', 'p_180');
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
