import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { renderTemplate } from '../../src/modules/template';
import path from 'node:path';
import { BASE, BUILD, ROOT, message } from './support/artifact';
import { localeIndex, promptDetail, templateDetail } from './support/content';
import { layoutProblems } from './support/layout';
import { seriousViolations, scrollToTop } from './support/a11y';
import { cancelledFetch } from './support/errors';

const portuguese = BUILD.locales.find((locale) => locale.code === 'pt-BR');
const searchCases: {
  query: string;
  expectedKeys: string[];
  topK: number;
  excludedKeys?: string[];
}[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'production/localization/pt-BR/search-cases.json'), 'utf8')).cases;

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    if (!cancelledFetch(error.message)) errors.push(error.message);
  });
  page.on('console', (event) => {
    if (event.type() === 'error' && /hydrat|server.rendered|did not match/i.test(event.text())) {
      errors.push(event.text());
    }
  });
  return errors;
}

// These cases are frozen source-grounded expectations, not values derived from current results.
test.describe('frozen Portuguese search scenarios in the real Worker', () => {
  test.skip(!portuguese, 'Portuguese is not part of this artifact; this is not release acceptance');
  for (const example of searchCases) {
    test(example.query, async ({ page }) => {
      const index = localeIndex('pt-BR');
      const records = {
        prompt: index.prompts,
        template: index.templates,
        collection: index.collections,
        topic: index.topics,
      };
      const pathFor = (key: string) => {
        const [kind, id] = key.split('/');
        const record = records[kind as keyof typeof records]?.find((item) => item.id === id);
        expect(record, `frozen key ${key}`).toBeDefined();
        return `${BASE}${record!.path}`;
      };
      const workerStarted = page.waitForEvent('worker');
      await page.goto(`${BASE}/${portuguese!.pathPrefix}/search/?q=${encodeURIComponent(example.query)}`);
      await workerStarted;
      await expect(page.locator('#search-field')).toHaveValue(example.query);
      // Waiting for the completed query avoids passing exclusions against a still-empty page.
      await expect(page.locator('[data-search-status]')).toContainText(`“${example.query}”`);
      if (example.expectedKeys.length === 0) {
        await expect(page.locator('[data-no-results]')).toBeVisible();
        await expect(page.locator('[data-no-results] h2')).toHaveText(
          message('pt-BR', 'search.noResults.title', { query: example.query }),
        );
        await expect(page.locator('[data-search-status]')).toHaveText(`Nenhum resultado para “${example.query}”`);
        await expect(page.locator('[data-group] li')).toHaveCount(0);
      }
      for (const key of example.expectedKeys) {
        const kind = key.split('/')[0]!;
        const target = pathFor(key);
        await expect
          .poll(async () => {
            const paths = await page
              .locator(`[data-group="${kind}"] li a`)
              .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
            return paths.slice(0, example.topK).includes(target);
          })
          .toBe(true);
      }
      for (const key of example.excludedKeys ?? []) {
        const kind = key.split('/')[0]!;
        const group = page.locator(`[data-group="${kind}"]`);
        // Render every hit of the excluded kind, not only the first lazy-loaded page.
        if (await group.count()) {
          const total = Number(await group.locator('h2 span').textContent());
          expect(total).toBeGreaterThan(0);
          while ((await group.locator('li').count()) < total) {
            const before = await group.locator('li').count();
            await group.locator('[data-search-more]').scrollIntoViewIfNeeded();
            await expect.poll(() => group.locator('li').count()).toBeGreaterThan(before);
          }
          await expect(group.locator('li')).toHaveCount(total);
        }
        await expect(page.locator(`[data-group] li a[href="${pathFor(key)}"]`)).toHaveCount(0);
      }
      if (example.query === 'iluminacao refeicoes') {
        const result = page.locator(`[data-group="prompt"] a[href="${pathFor('prompt/p_110')}"]`);
        await expect(
          result
            .locator('mark')
            .filter({ hasText: /^refeições$/i })
            .first(),
        ).toBeVisible();
      }
    });
  }
});

test.describe('actual Portuguese artifact samples', () => {
  test.skip(!portuguese, 'Portuguese is not part of this artifact');
  for (const width of [360, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${width}px ${theme}: reviewed descriptions and controls fit`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: 'reduce',
        });
        const errors = watchErrors(page);
        const paths = [
          `/${portuguese!.pathPrefix}/`,
          promptDetail('pt-BR', 'p_012').path,
          promptDetail('pt-BR', 'p_218').path,
          promptDetail('pt-BR', 'p_225').path,
          templateDetail('pt-BR', 't_001').path,
          localeIndex('pt-BR').collections.find((item) => item.id === 'c_001')!.path,
          `/${portuguese!.pathPrefix}/search/?q=p_012`,
        ];
        for (const path of paths) {
          await page.goto(`${BASE}${path}`);
          await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
          await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
          await expect(page.locator('h1')).toBeVisible();
          if (path.includes('/search/')) {
            await expect(
              page.locator('[data-group="prompt"] li').filter({ hasText: promptDetail('pt-BR', 'p_012').title }),
            ).toBeVisible();
            await page.locator('[data-group="prompt"] li a').first().hover();
          }
          const preview = page.locator('[data-static-from="lg"] > button');
          if ((await preview.isVisible()) && (await preview.getAttribute('aria-expanded')) !== 'true') {
            await preview.click();
            await expect(preview).toHaveAttribute('aria-expanded', 'true');
          }
          expect(await layoutProblems(page), path).toEqual([]);
          expect(await seriousViolations(page), path).toEqual([]);
        }
        await page.goto(`${BASE}${promptDetail('pt-BR', 'p_012').path}`);
        await expect(page.locator('h1')).toHaveText(promptDetail('pt-BR', 'p_012').title);
        expect(errors).toEqual([]);
      });
    }
  }

  test('translated template fields keep edited preview, copy and download identical', async ({
    page,
    context,
    browserName,
  }) => {
    const detail = templateDetail('pt-BR', 't_001');
    await page.goto(`${BASE}${detail.path}`);
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-field-shell="product"] input');
      return input && Object.keys(input).some((key) => key.startsWith('__reactProps'));
    });
    const field = page.locator('[data-field-shell="product"] input');
    await expect(field).toHaveAccessibleName('Produto');
    await field.fill('uma luminária de mesa de latão');
    const expected = renderTemplate(
      { body: detail.version.body, fields: detail.version.fields },
      {
        ...detail.version.samples[0]!.values,
        product: 'uma luminária de mesa de latão',
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
    test(`${width}px: Portuguese popup, copy and favorites form one browsing flow`, async ({
      page,
      context,
      browserName,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors = watchErrors(page);
      await page.goto(`${BASE}/${portuguese!.pathPrefix}/prompts/`);
      await page.waitForFunction(() => {
        const feed = document.querySelector('[role="feed"]');
        return feed && Object.keys(feed).some((key) => key.startsWith('__reactProps'));
      });
      const card = page.locator('[role="feed"] > article[data-entry]:not([data-interlude])').first();
      const id = (await card.getAttribute('data-entry'))!;
      const detail = promptDetail('pt-BR', id);
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
      await popup.locator('[data-popup-close]').focus();
      await page.keyboard.press('Escape');
      await expect(popup).toHaveCount(0);
      await expect(card.locator('a').first()).toBeFocused();
      await page.goto(`${BASE}/${portuguese!.pathPrefix}/favorites/`);
      const saved = page.locator(`[data-saved-entry="${id}"]`);
      await expect(saved).toContainText(detail.title);
      await saved.locator('a').first().click();
      await expect(popup.locator('h2').first()).toHaveText(detail.title);
      await expect(popup.locator('[data-shortcut="save"]')).toHaveAttribute('aria-pressed', 'true');
      // Saved Prompt cards open the same popup; refreshing its address opens the full detail.
      await page.reload();
      await expect(page.locator('h1')).toHaveText(detail.title);
      await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
      const detailSave = page.locator('[data-shortcut="save"]');
      await expect(detailSave).toHaveAttribute('aria-pressed', 'true');
      await expect(detailSave).toHaveAccessibleName(message('pt-BR', 'favorites.saved'));
      expect(errors).toEqual([]);
    });
  }

  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: Portuguese search supports keyboard navigation, Escape and focus restoration`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(`${BASE}/${portuguese!.pathPrefix}/prompts/`);
      await page.waitForFunction(() => {
        const launcher = document.querySelector('[data-search-launcher]');
        return launcher && Object.keys(launcher).some((key) => key.startsWith('__reactProps'));
      });
      const launcher = page.locator('[data-search-launcher]');
      await launcher.focus();
      await page.keyboard.press('Enter');
      const panel = page.locator('[data-quick-search]');
      const input = panel.getByRole('textbox');
      await expect(input).toHaveAccessibleName(message('pt-BR', 'search.panel.field'));
      await expect(input).toBeFocused();
      await input.fill('p_012');
      const option = panel.getByRole('option').first();
      await expect(option).toBeVisible();
      await option.hover();
      await expect(option).toHaveAttribute('data-hovered', 'true');
      expect(await seriousViolations(page, '[data-quick-search]')).toEqual([]);
      await page.mouse.move(0, 0);
      await expect(option).not.toHaveAttribute('data-hovered', 'true');
      await input.press('ArrowDown');
      await expect(option).toHaveAttribute('data-focused', 'true');
      expect(await seriousViolations(page, '[data-quick-search]')).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
      await expect(launcher).toBeFocused();
      await page.keyboard.press('/');
      await expect(input).toBeFocused();
      await input.fill('p_012');
      await expect(option).toBeVisible();
      const href = await option.getAttribute('href');
      await option.hover();
      await expect(option).toHaveAttribute('data-hovered', 'true');
      expect(await seriousViolations(page, '[data-quick-search]')).toEqual([]);
      await page.mouse.move(0, 0);
      await expect(option).not.toHaveAttribute('data-hovered', 'true');
      await input.press('ArrowDown');
      await input.press('Enter');
      await page.waitForURL((url) => url.pathname === href);
      await expect(page.locator('h1')).toHaveText(promptDetail('pt-BR', 'p_012').title);
      await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    });
  }

  test('Portuguese template reflows at the 720 CSS-pixel viewport of a 1440px display zoomed to 200%', async ({
    page,
  }) => {
    // Browser zoom reduces the layout viewport; CSS zoom alone does not update media queries.
    // This checks equivalent reflow. Native browser zoom remains a separate manual check.
    await page.setViewportSize({ width: 720, height: 450 });
    await page.goto(`${BASE}${templateDetail('pt-BR', 't_001').path}`);
    const preview = page.locator('[data-static-from="lg"] > button');
    if ((await preview.isVisible()) && (await preview.getAttribute('aria-expanded')) !== 'true') {
      await preview.click();
      await expect(preview).toHaveAttribute('aria-expanded', 'true');
    }
    const input = page.locator('[data-field-shell="product"] input');
    await page.keyboard.press('Escape');
    await input.focus();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
    if ((await preview.isVisible()) && (await preview.getAttribute('aria-expanded')) !== 'true') {
      await preview.click();
      await expect(preview).toHaveAttribute('aria-expanded', 'true');
    }
    await scrollToTop(page);
    expect(await layoutProblems(page)).toEqual([]);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
