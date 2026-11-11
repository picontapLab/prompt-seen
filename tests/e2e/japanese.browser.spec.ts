import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { BASE, BUILD, ROOT, message } from './support/artifact';
import { localeIndex } from './support/content';
import { layoutProblems } from './support/layout';
import { cancelledFetch } from './support/errors';

type SearchCase = { id: string; query: string; expectedAny: string[]; maxRank?: number; expectEmpty?: boolean };
const cases: SearchCase[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'production/localization/ja/search-cases.json'), 'utf8'),
).cases;
const japanese = BUILD.locales.find((locale) => locale.code === 'ja');

test.describe('Japanese localization search acceptance', () => {
  test.skip(!japanese, 'Japanese is not included in this artifact');
  for (const example of cases) {
    test(`fixed query: ${example.id}`, async ({ page }) => {
      await page.goto(`${BASE}/${japanese!.pathPrefix}/search/?q=${encodeURIComponent(example.query)}`);
      // Ranking starts after the cold Worker has loaded the full corpus. Its loading
      // state is separate from query correctness, especially on Linux WebKit.
      await expect(page.locator('[data-search-status]')).toContainText(example.query.trim(), { timeout: 15_000 });
      if (example.expectEmpty) {
        await expect(page.locator('[data-no-results]')).toBeVisible();
        await expect(page.locator('[data-group] li')).toHaveCount(0);
        return;
      }
      const index = localeIndex('ja');
      const expectedPaths = example.expectedAny.map((key) => {
        const [kind, id] = key.split(':');
        const records = kind === 'prompt' ? index.prompts : kind === 'template' ? index.templates : index.collections;
        const record = records.find((item) => item.id === id);
        expect(record, `expected public Japanese resource ${key}`).toBeDefined();
        return `${BASE}${record!.path}`;
      });
      await expect
        .poll(async () => {
          const paths = await page
            .locator('[data-group] li a')
            .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
          return paths.slice(0, example.maxRank ?? 5).some((href) => expectedPaths.includes(href!));
        })
        .toBe(true);
    });
  }

  test('quick search keeps Japanese composition and Enter does not open a result before confirmation', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'CDP composition automation; real desktop/mobile IME remains a manual release check',
    );
    await page.goto(`${BASE}/${japanese!.pathPrefix}/prompts/`);
    await page.waitForFunction(() => {
      const launcher = document.querySelector('[data-search-launcher]');
      return launcher && Object.keys(launcher).some((key) => key.startsWith('__reactProps'));
    });
    await page.keyboard.press('/');
    const panel = page.locator('[data-quick-search]');
    const field = panel.getByRole('textbox');
    await expect(field).toBeFocused();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: 'じゃず', selectionStart: 3, selectionEnd: 3 });
    // A synthetic composing key exercises the guard; committing text below is real CDP input.
    await field.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, keyCode: 229 });
    await expect(page).toHaveURL(new RegExp(`/${japanese!.pathPrefix}/prompts/$`));
    await cdp.send('Input.insertText', { text: 'ジャズクラブ' });
    await expect(field).toHaveValue('ジャズクラブ');
    await expect(panel.getByRole('option').first()).toBeVisible();
    await expect(panel.getByText(message('ja', 'search.groups.prompt'), { exact: true })).toBeVisible();
    await cdp.detach();
  });
});

test.describe('Japanese editorial and error pages at every supported width', () => {
  test.skip(!japanese, 'Japanese is not included in this artifact');
  for (const width of [390, 768, 1024, 1440])
    for (const theme of ['light', 'dark'] as const)
      test(`${width}px ${theme}: collection, topics, legal pages and error states`, async ({ page }, testInfo) => {
        test.setTimeout(60000);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme });
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          if (!cancelledFetch(error.message)) errors.push(error.message);
        });
        const index = localeIndex('ja');
        const paths = [
          ...index.collections.slice(0, 1).map((item) => item.path),
          ...index.topics.map((item) => item.path),
          ...index.pages.map((item) => item.path),
          `/${japanese!.pathPrefix}/translation-missing/`,
          `/${japanese!.pathPrefix}/no-such-page/`,
        ];
        for (const path of paths) {
          await page.goto(`${BASE}${path}`);
          await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
          await expect(page.locator('h1')).toBeVisible();
          await page.waitForFunction(() => {
            const el = document.querySelector('header button');
            return el && Object.keys(el).some((key) => key.startsWith('__reactProps'));
          });
          expect(await layoutProblems(page), path).toEqual([]);
          if (width === 390 && theme === 'dark' && path === paths[0])
            await page.screenshot({ path: testInfo.outputPath('japanese-collection-phone.png'), fullPage: true });
        }
        expect(errors).toEqual([]);
      });
});
