import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { BASE, BUILD, ROOT, message } from './support/artifact';
import { localeIndex } from './support/content';

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
