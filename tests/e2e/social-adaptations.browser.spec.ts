import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { expect, test } from '@playwright/test';
import { BASE, ROOT } from './support/artifact';
import { localeIndex, promptDetail } from './support/content';

const campaign = path.join(ROOT, 'production/gpt-image-26-social-2026-11-07');
const withdrawal: { items: { ids: { prompt: string }; folder: string }[]; runtimeFiles: { file: string }[] } =
  JSON.parse(fs.readFileSync(path.join(campaign, 'audit/withdrawn-composites/withdrawal.json'), 'utf8'));
for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`retained selfie workflow and original collection at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const detail = promptDetail('en', 'p_273');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${BASE}${detail.path}`);
    await expect(page.locator('[id$="-prompt"]').first()).toHaveText(detail.prompt.text);
    await expect(page.locator('[id$="-prompt"]').first()).toHaveAttribute('lang', 'ja');
    const hero = page.locator('[data-stage-picture] img').first();
    await expect(hero).toBeVisible();
    await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const response = await page.request.get(await hero.evaluate((img: HTMLImageElement) => img.currentSrc));
    expect(response.ok()).toBe(true);
    expect((await sharp(await response.body()).metadata()).pages ?? 1).toBe(1);
    const message = fs.readFileSync(path.join(campaign, 'adaptations/w01/message-ja.txt'), 'utf8').trim();
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const original = localeIndex('en').collections.find((c) => c.id === 'c_013')!;
    await page.goto(`${BASE}${original.path}`);
    await expect(page.locator('h1')).toHaveText(original.title);
    await expect(page.locator(`a[href="${BASE}${detail.path}"]`).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('withdrawn compositions are absent from the packaged content and return 404', async ({ request }) => {
  for (const locale of ['en', 'zh-Hans']) {
    const index = localeIndex(locale);
    const ids = new Set(index.prompts.map((prompt) => prompt.id));
    for (const item of withdrawal.items) expect(ids.has(item.ids.prompt)).toBe(false);
    expect(index.collections.some((collection) => collection.id === 'c_014')).toBe(false);
    const retained = promptDetail(locale, 'p_273');
    // Use the current build's prompt path convention, replacing only the verified slug.
    for (const item of withdrawal.items.filter((i) => ['p_247', 'p_267', 'p_268'].includes(i.ids.prompt))) {
      const recipe = JSON.parse(fs.readFileSync(path.join(campaign, item.folder, 'recipe.json'), 'utf8'));
      const removedPath = retained.path.replace('adapted-w01-selfie-workflow', recipe.slug);
      expect((await request.get(`${BASE}${removedPath}`)).status()).toBe(404);
    }
  }
  const removedMedia = withdrawal.runtimeFiles.filter(
    (item) => item.file.startsWith('public/') && item.file.endsWith('.gif'),
  );
  expect(removedMedia).toHaveLength(26);
  for (const item of removedMedia.slice(0, 3)) {
    expect((await request.get(`${BASE}/${item.file.slice('public/'.length)}`)).status()).toBe(404);
  }
});

for (const width of [390, 1440]) {
  test(`nine-frame GIF adaptations load in all published languages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const locale of ['en', 'zh-Hans', 'ja']) {
      const detail = promptDetail(locale, 'p_300');
      await page.goto(`${BASE}${detail.path}`);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('[id$="-prompt"]').first()).toHaveText(detail.prompt.text);
      const hero = page.locator('[data-stage-picture] img').first();
      await expect(hero).toBeVisible();
      await expect
        .poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
        .toBe(true);
      const response = await page.request.get(await hero.evaluate((img: HTMLImageElement) => img.currentSrc));
      expect(response.ok()).toBe(true);
      const metadata = await sharp(await response.body(), { animated: true }).metadata();
      expect(metadata.pages).toBe(9);
      expect(metadata.delay!.reduce((a, b) => a + b, 0)).toBe(1800);
      expect(metadata.hasAlpha).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const collection = localeIndex(locale).collections.find((c) => c.id === 'c_016')!;
      await page.goto(`${BASE}${collection.path}`);
      await expect(page.locator('h1')).toHaveText(collection.title);
      await expect(page.locator(`a[href="${BASE}${detail.path}"]`).first()).toBeVisible();
    }
  });
}

const adaptedItems: { unitId: string; sourceCase: string; ids: { prompt: string } }[] = JSON.parse(
  fs.readFileSync(path.join(campaign, 'adaptations/content-map.json'), 'utf8'),
).filter((item: { ids: unknown }) => item.ids);
for (const width of [390, 1440]) {
  test(`same-post variants have navigable sibling links at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const locale of ['en', 'zh-Hans', 'ja']) {
      for (const sourceCase of ['G03', 'G06', 'G11']) {
        const siblings = adaptedItems.filter((item) => item.sourceCase === sourceCase);
        const detail = promptDetail(locale, siblings[0]!.ids.prompt);
        await page.goto(`${BASE}${detail.path}`);
        for (const sibling of siblings.slice(1)) {
          const destination = promptDetail(locale, sibling.ids.prompt);
          await expect(page.locator(`a[href="${BASE}${destination.path}"]`).first()).toBeVisible();
        }
        const destination = promptDetail(locale, siblings[1]!.ids.prompt);
        await page.locator(`a[href="${BASE}${destination.path}"]`).first().click();
        await expect(page).toHaveURL(new RegExp(`${destination.path}$`));
        await expect(page.locator('h1').first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }
  });

  test(`four rewritten stills preserve submitted prompts and load at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const stills = adaptedItems.filter((item) => item.sourceCase.startsWith('S'));
    expect(stills).toHaveLength(4);
    for (const locale of ['en', 'zh-Hans', 'ja']) {
      for (const item of stills) {
        const detail = promptDetail(locale, item.ids.prompt);
        const english = promptDetail('en', item.ids.prompt);
        expect(detail.prompt.text).toBe(english.prompt.text);
        await page.goto(`${BASE}${detail.path}`);
        await expect(page.locator('[id$="-prompt"]').first()).toHaveText(english.prompt.text);
        await expect(page.locator('[id$="-prompt"]').first()).toHaveAttribute('lang', english.prompt.language);
        const hero = page.locator('[data-stage-picture] img').first();
        await expect
          .poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
          .toBe(true);
        const response = await page.request.get(await hero.evaluate((img: HTMLImageElement) => img.currentSrc));
        expect(response.ok()).toBe(true);
        expect((await sharp(await response.body()).metadata()).pages ?? 1).toBe(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      const collection = localeIndex(locale).collections.find((c) => c.id === 'c_017')!;
      await page.goto(`${BASE}${collection.path}`);
      for (const item of stills) {
        const detail = promptDetail(locale, item.ids.prompt);
        await expect(page.locator(`a[href="${BASE}${detail.path}"]`).first()).toBeVisible();
      }
    }
  });
}
