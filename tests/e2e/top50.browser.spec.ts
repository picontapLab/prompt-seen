import { expect, test } from '@playwright/test';
import { BASE, message } from './support/artifact';

test('record selection switches outputs and reference identities together', async ({ page }) => {
  await page.goto(`${BASE}/en/prompts/custom-collectible-figure/`);
  const stage = page.locator('[data-recorded-showcase]');
  const select = stage.getByRole('combobox');
  await expect(select).toBeVisible();
  const images = stage.locator(
    '[data-stage-picture] > img:not([aria-hidden]), [data-reference-picture] > img:not([aria-hidden])',
  );
  const before = await images.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src')));
  const current = await select.inputValue();
  const other = await select
    .locator('option')
    .evaluateAll(
      (options, selected) =>
        options.map((option) => (option as HTMLOptionElement).value).find((value) => value !== selected),
      current,
    );
  await select.selectOption(other!);
  await expect
    .poll(async () => images.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('src'))))
    .not.toEqual(before);
  expect(await images.count()).toBe(2);
  expect(await images.nth(1).getAttribute('src')).not.toBe(before[1]);
});

test('template sample previews follow the sample and custom values remain untested', async ({ page }) => {
  await page.goto(`${BASE}/en/templates/product-brand-story-grid/`);
  const editor = page.locator('[data-editor]');
  const output = editor.locator('figure img').last();
  const before = await output.getAttribute('src');
  await editor.locator('[data-action="sample"]').click();
  await expect(output).not.toHaveAttribute('src', before!);
  await expect(editor.getByText(message('en', 'detail.template.testedImage'), { exact: true })).toBeVisible();
  await editor.locator('[data-field-shell="brandPalette"] input').fill('violet and lime');
  await expect(editor.getByText(message('en', 'detail.template.unmatchedImage'), { exact: true })).toBeVisible();
});

test('multiple references keep their roles and source snapshots are separate from test results', async ({ page }) => {
  await page.goto(`${BASE}/zh-hans/prompts/two-person-wedding-editorial/`);
  const stage = page.locator('[data-recorded-showcase]');
  await expect(stage.getByRole('region', { name: message('zh-Hans', 'detail.examples.references') })).toBeVisible();
  await expect(page.getByRole('heading', { name: message('zh-Hans', 'detail.inspiration.heading') })).toBeVisible();
  await expect(page.locator('[data-tone="verified"]')).toContainText('GPT Image');
  await expect(page.getByText(message('zh-Hans', 'detail.test.recordedUnknownModel'), { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
