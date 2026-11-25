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
  const stage = page.locator('[data-editor] [data-template-stage]');
  await expect(stage).toHaveAttribute('data-mode', 'inputs');
  const before = await stage.getAttribute('data-run');
  const output = stage.locator('[data-stage-picture] img');
  const shown = await output.getAttribute('src');
  await stage.locator('[data-sample="1"]').click();
  await expect(stage).not.toHaveAttribute('data-run', before!);
  await expect(output).not.toHaveAttribute('src', shown!);
  const caption = stage.locator('figcaption');
  await expect(caption).toContainText(message('en', 'detail.template.testedImage'));
  await expect(caption).toContainText(message('en', 'detail.test.generatedWith', { model: 'GPT Image 2.5' }));
  await page.locator('[data-editor] [data-field-shell="brandPalette"] input').fill('violet and lime');
  await expect(caption).toContainText(message('en', 'detail.template.unmatchedImage'));
  await expect(caption).toContainText(message('en', 'detail.test.generatedWith', { model: 'GPT Image 2.5' }));
});

test('an edit in the same frame is shown before and after under one divider', async ({ page }) => {
  await page.goto(`${BASE}/en/templates/remove-a-passerby-from-a-travel-photo/`);
  const stage = page.locator('[data-editor] [data-template-stage]');
  await expect(stage).toHaveAttribute('data-mode', 'compare');
  const frame = stage.locator('[data-compare]');
  // Both pictures are in the page, each with its own description.
  await expect(frame.locator('img')).toHaveCount(2);
  const slider = frame.getByRole('slider', { name: message('en', 'templates.editor.stage.compare') });
  await expect(slider).toHaveValue('50');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('51');
  await expect(slider).toHaveAttribute(
    'aria-valuetext',
    message('en', 'templates.editor.stage.compareValue', { percent: '51' }),
  );
  expect(await frame.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--compare-pos'))).toBe('51%');

  // A press on the frame moves the divider there.
  const box = (await frame.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height / 2);
  await expect(slider).toHaveValue('25');

  await stage.getByRole('radio', { name: message('en', 'templates.editor.stage.viewPair') }).click();
  await expect(stage.locator('[data-compare]')).toHaveCount(0);
  await expect(stage.locator('[data-stage-picture] img, [data-reference-picture] img')).toHaveCount(2);
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
