import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { renderTemplate } from '../../src/modules/template';
import { encodeShare } from '../../src/ui/template-editor/share';
import { BASE, BUILD, message } from './support/artifact';
import { promptDetail, templateDetail } from './support/content';

const preview = (page: Page) => page.locator('[id$="-prompt"]').first();
const product = (page: Page) => page.locator('[data-field-shell="product"] input').first();
const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const el = document.querySelector('[data-field-shell] input');
    return !!el && Object.keys(el).some((key) => key.startsWith('__reactProps'));
  });
async function chooseLanguage(page: Page, from: string, to: string) {
  const current = BUILD.locales.find((locale) => locale.code === from)!;
  const target = BUILD.locales.find((locale) => locale.code === to)!;
  const label = message(from, 'shell.language.label');
  const button = page.getByRole('banner').getByRole('button', { name: `${label}: ${current.nativeName}`, exact: true });
  if (await button.isVisible()) await button.click();
  else {
    const combobox = page.getByRole('combobox', { name: label });
    if (!(await combobox.isVisible()))
      await page
        .getByRole('banner')
        .getByRole('button', { name: message(from, 'shell.menu.open') })
        .click();
    await combobox.fill(target.nativeName);
  }
  await page.getByRole('option', { name: new RegExp(target.nativeName) }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', target.htmlLang);
  if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
}

test('a literal prompt switches and copies the displayed language', async ({ page, context, browserName }) => {
  const english = promptDetail('en', 'p_217');
  const chinese = promptDetail('zh-Hans', 'p_217');
  expect(english.prompt.language).toBe('en');
  expect(chinese.prompt.language).toBe('zh-Hans');
  expect(english.prompt.text).not.toBe(chinese.prompt.text);
  await page.goto(`${BASE}${chinese.path}`);
  await expect(preview(page)).toHaveText(chinese.prompt.text);
  await chooseLanguage(page, 'zh-Hans', 'en');
  await expect(preview(page)).toHaveText(english.prompt.text);
  await expect(preview(page)).toHaveAttribute('lang', 'en');
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('[data-copy-state]:visible').first().click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(english.prompt.text);
  }
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  for (const { id, language } of [
    { id: 'p_237', language: 'ja' },
    { id: 'p_242', language: 'zh-Hans' },
  ]) {
    test(`submitted ${id} ${language} prompt survives page language changes, copy and Markdown export at ${viewport.width}px`, async ({
      page,
      context,
      browserName,
    }) => {
      await page.setViewportSize(viewport);
      const english = promptDetail('en', id);
      const chinese = promptDetail('zh-Hans', id);
      expect(english.prompt.language).toBe(language);
      expect(chinese.prompt.text).toBe(english.prompt.text);
      await page.goto(`${BASE}${english.path}`);
      await expect(preview(page)).toHaveText(english.prompt.text);
      await chooseLanguage(page, 'en', 'zh-Hans');
      await expect(preview(page)).toHaveText(english.prompt.text);
      await expect(preview(page)).toHaveAttribute('lang', language);
      // Literal details expose a Markdown alternate; only template editors have a .txt button.
      const alternate = await page.locator('link[rel="alternate"][type="text/markdown"]').getAttribute('href');
      expect(alternate).toBeTruthy();
      const exported = await page.request.get(new URL(alternate!).pathname);
      expect(exported.ok()).toBe(true);
      const body = /^(`{3,})text\n([\s\S]*?)\n\1$/m.exec(await exported.text())?.[2];
      expect(body).toBe(english.prompt.text);
      if (browserName === 'chromium') {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await page.locator('[data-copy-state]:visible').first().click();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(english.prompt.text);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}

test('translated annotations retain their phrase and image interaction', async ({ page }) => {
  const detail = promptDetail('zh-Hans', 'p_024');
  await page.goto(`${BASE}${detail.path}`);
  await expect(preview(page)).toHaveText(detail.prompt.text);
  for (const annotation of detail.annotations) {
    const phrase = preview(page).locator(`[data-letter="${annotation.letter}"]`);
    await phrase.click();
    await expect(phrase).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-state="current"]').filter({ hasText: annotation.letter })).toHaveCount(1);
  }
});

test('template language changes preserve the latest input, stable options, drafts, copy and download', async ({
  page,
  context,
  browserName,
}) => {
  const en = templateDetail('en', 't_001');
  const zh = templateDetail('zh-Hans', 't_001');
  await page.goto(`${BASE}${en.path}`);
  await hydrated(page);
  await chooseLanguage(page, 'en', 'zh-Hans');
  await expect(preview(page)).toHaveText(zh.version.defaultPrompt);
  await hydrated(page);
  // A full navigation immediately after typing must flush before the 400 ms draft debounce.
  await product(page).fill('custom brass lamp');
  await page.goto(`${BASE}${en.path}`);
  await hydrated(page);
  await expect(product(page)).toHaveValue('custom brass lamp');
  await chooseLanguage(page, 'en', 'zh-Hans');
  await expect(product(page)).toHaveValue('custom brass lamp');
  const expected = renderTemplate(zh.version, { ...zh.version.samples[0]!.values, product: 'custom brass lamp' }).text!;
  await expect(preview(page)).toHaveText(expected);
  const downloading = page.waitForEvent('download');
  await page.locator('[data-action="download"]').click();
  expect(fs.readFileSync((await (await downloading).path())!, 'utf8')).toBe(expected);
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('[data-copy-state]:visible').first().click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  }
  await page.reload();
  await hydrated(page);
  await expect(preview(page)).toHaveText(expected);
  await page.locator('[data-action="reset"]').click();
  await chooseLanguage(page, 'zh-Hans', 'en');
  await expect(preview(page)).toHaveText(en.version.defaultPrompt);
});

test('shared parameters keep stable enum values across translations and source fallback', async ({ page }) => {
  const en = templateDetail('en', 't_001');
  const zh = templateDetail('zh-Hans', 't_001');
  const values = { ...en.version.samples[1]!.values, product: 'shared product' };
  await page.goto(`${BASE}${zh.path}#${encodeShare(zh.version.id, values)}`);
  await hydrated(page);
  await expect(preview(page)).toHaveText(renderTemplate(zh.version, values).text!);
  await expect(page).not.toHaveURL(/#/);
  await chooseLanguage(page, 'zh-Hans', 'en');
  await expect(preview(page)).toHaveText(renderTemplate(en.version, values).text!);
  if (BUILD.locales.some((locale) => locale.code === 'ja')) {
    await chooseLanguage(page, 'en', 'ja');
    await expect(preview(page)).toHaveText(renderTemplate(en.version, values).text!);
    await expect(preview(page)).toHaveAttribute('lang', 'en');
  }
});
