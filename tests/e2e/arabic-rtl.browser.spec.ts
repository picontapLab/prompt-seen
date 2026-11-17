import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { renderTemplate } from '../../src/modules/template';
import { BASE, message } from './support/artifact';
import { arabic, expectArabicState, hydrated } from './support/arabic';
import { templateDetail } from './support/content';

test('Arabic browser acceptance uses the requested artifact state', expectArabicState);

test.describe('Arabic mixed input', () => {
  test.skip(!arabic, 'Arabic is absent from this production artifact');

  test('physical Ctrl+K opens search with an Arabic keyboard and ignores composition', async ({ page }) => {
    await page.goto(`${BASE}/ar/`);
    await hydrated(page, '[data-search-launcher]');
    // Opening and closing the panel establishes that the client shortcut listener is ready.
    await page.locator('[data-search-launcher]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.evaluate(() =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ن',
          code: 'KeyK',
          ctrlKey: true,
          isComposing: true,
          bubbles: true,
        }),
      ),
    );
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.evaluate(() =>
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ن',
          code: 'KeyK',
          ctrlKey: true,
          bubbles: true,
        }),
      ),
    );
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('a mixed-language template value keeps its direction and exact copy/download text', async ({
    page,
    context,
    browserName,
  }) => {
    const detail = templateDetail('ar', 't_001');
    const field = detail.version.fields.find((field) => field.type === 'string' && field.required)!;
    const value = 'زجاجة عطر (Rose 50 ml)';
    await page.goto(`${BASE}${detail.path}`);
    await hydrated(page, '[data-field-shell] input');
    const input = page.locator(`[data-field-shell="${field.name}"] input`).first();
    await expect(input).toHaveAttribute('dir', 'auto');
    await input.fill(value);
    await expect.poll(() => input.evaluate((element) => getComputedStyle(element).direction)).toBe('rtl');
    const expected = renderTemplate(
      { body: detail.version.body, fields: detail.version.fields },
      {
        ...detail.version.samples[0]!.values,
        [field.name]: value,
      },
    ).text!;
    const preview = page.locator('[id$="-prompt"]').first();
    await expect(preview).toHaveAttribute('dir', 'ltr');
    await expect(preview).toHaveText(expected);
    await expect(preview.locator(`[data-field="${field.name}"] bdi`)).toHaveText(value);
    const downloading = page.waitForEvent('download');
    await page.locator('[data-action="download"]').click();
    expect(fs.readFileSync((await (await downloading).path())!, 'utf8')).toBe(expected);
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.locator('[data-shortcut="copy"]').first().click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    }
    await page.reload();
    await expect(input).toHaveValue(value);
  });

  test('search follows the typed direction without rewriting the query', async ({ page }) => {
    await page.goto(`${BASE}/ar/search/`);
    await hydrated(page, '#search-field');
    const input = page.locator('#search-field');
    await expect(input).toHaveAttribute('dir', 'auto');
    for (const [query, direction] of [
      ['إضاءة neon 16:9', 'rtl'],
      ['GPT Image ٢', 'ltr'],
    ]) {
      await input.fill(query!);
      await expect.poll(() => input.evaluate((element) => getComputedStyle(element).direction)).toBe(direction);
      await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(query);
      await expect(input).toHaveValue(query!);
    }
  });

  test('list values retain mixed text when added and removed', async ({ page }) => {
    const detail = templateDetail('ar', 't_001');
    const list = detail.version.fields.find((field) => field.type === 'string-list')!;
    await page.goto(`${BASE}${detail.path}`);
    await hydrated(page, '[data-field-shell] input');
    const shell = page.locator(`[data-field-shell="${list.name}"]`);
    const input = shell.locator('input');
    await expect(input).toHaveAttribute('dir', 'auto');
    // Make room using the same remove controls a reader uses.
    while (await shell.locator('li button').count()) await shell.locator('li button').last().click();
    const value = 'إضاءة neon 16:9';
    await input.fill(value);
    await input.press('Enter');
    await expect(shell.locator('li bdi')).toHaveText(value);
    await expect(page.locator('[id$="-prompt"]').first()).toContainText(value);
    await shell.locator('li button').click();
    await expect(shell.locator('li')).toHaveCount(0);
    await expect(input).toBeFocused();
  });

  test('switching English to Arabic and back updates document and portal direction', async ({ page }) => {
    await page.goto(`${BASE}/en/`);
    for (const [from, fromName, to, toName, dir] of [
      ['en', 'English', 'ar', 'العربية', 'rtl'],
      ['ar', 'العربية', 'en', 'English', 'ltr'],
    ]) {
      await hydrated(page, '[data-search-launcher]');
      const label = message(from!, 'shell.language.label');
      const combobox = page.getByRole('combobox', { name: label });
      if (!(await combobox.isVisible()))
        await page
          .getByRole('banner')
          .getByRole('button', { name: `${label}: ${fromName}` })
          .click();
      await combobox.fill(toName!);
      await page.getByRole('option', { name: toName! }).click();
      await expect(page.locator('html')).toHaveAttribute('lang', to!);
      await expect(page.locator('html')).toHaveAttribute('dir', dir!);
      await hydrated(page, '[data-search-launcher]');
      await page.locator('[data-search-launcher]').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect
        .poll(() => page.getByRole('dialog').evaluate((element) => getComputedStyle(element).direction))
        .toBe(dir);
      await page.keyboard.press('Escape');
    }
  });
});
