import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import YAML from 'yaml';
import { featuredOrder } from '../../src/modules/home/featured';
import { BASE, BUILD, homePath, message, ROOT } from './support/artifact';
import { localeIndex, promptDetail, templateDetail } from './support/content';
import { worksOnShow } from './support/home';

// The campaign spec fixes the order; allocated IDs come from actual import receipts.
const campaign = path.join(ROOT, 'production/english-social-showcase-v1');
const mapping: {
  collectionId: string;
  references: { id: string; assetId: string }[];
  cases: { id: string; promptId: string; templateId: string | null; slug: string }[];
} = JSON.parse(fs.readFileSync(path.join(campaign, 'content-map.json'), 'utf8'));
const order = ['c01', 'c02', 'c07', 'c08', 'c04', 'c10', 'c03', 'c05', 'c06', 'c09', 'c11', 'c12'];
const caseOf = (id: string) => mapping.cases.find((item) => item.id === id)!;
const before = YAML.parse(fs.readFileSync(path.join(campaign, 'audit/site-before.yaml'), 'utf8'));
const oldOrder = featuredOrder(before.home.featured, new Date().toISOString().slice(0, 10));
const hydrated = (page: Page, selector: string) =>
  page.waitForFunction((selector) => {
    const el = document.querySelector(selector);
    return !!el && Object.keys(el).some((key) => key.startsWith('__reactProps'));
  }, selector);

for (const code of ['en', 'zh-Hans'])
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ])
    for (const scheme of ['light', 'dark'] as const)
      test(`${code}: all twelve home frames retain order, ratio and actions at ${viewport.width}px (${scheme})`, async ({
        page,
      }, testInfo) => {
        test.setTimeout(60_000);
        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await page.goto(`${BASE}${homePath(BUILD.locales.find((locale) => locale.code === code)!)}`);
        await hydrated(page, '[data-another]');
        const hero = page.locator('[data-on-show]');
        const another = hero.getByRole('button', { name: message(code, 'home.hero.another') });
        const image = hero.locator('figure img[alt]:not([alt=""])');
        // The home-language spec prioritizes matching prompt languages while keeping the
        // campaign's relative order and every previously configured work in the cycle.
        const campaignOrder = order.map((id) => caseOf(id).promptId);
        const expected = worksOnShow(code);
        expect(expected.filter((id) => campaignOrder.includes(id))).toEqual(campaignOrder);
        expect(expected).toEqual(expect.arrayContaining([...campaignOrder, ...oldOrder]));
        expect(new Set(expected).size).toBe(expected.length);
        for (const id of expected) {
          await expect(hero).toHaveAttribute('data-on-show', id);
          // Clicking a taller localized frame's controls can scroll the page. Measure each
          // campaign image at the top of the page, independently of that interaction scroll.
          await page.evaluate(() => window.scrollTo(0, 0));
          const campaignCase = mapping.cases.find((item) => item.promptId === id);
          if (campaignCase) {
            const detail = promptDetail(code, id);
            await expect(image).toHaveAttribute('alt', detail.cover.alt);
            await expect
              .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
              .toBe(true);
            const bounds = (await image.boundingBox())!;
            expect(Math.abs(bounds.width / bounds.height - detail.cover.width / detail.cover.height)).toBeLessThan(
              0.02,
            );
            expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
            await expect(hero.getByRole('button', { name: message(code, 'detail.copy.label') })).toBeInViewport();
            expect(bounds.y).toBeGreaterThanOrEqual(0);
            expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
            if (code === 'en' && scheme === 'light')
              await page.screenshot({ path: testInfo.outputPath(`${campaignCase.id}-${viewport.width}.png`) });
          }
          await another.click();
          await expect(another).toBeFocused();
        }
        await expect(hero).toHaveAttribute('data-on-show', expected[0]!);
      });

test('the homepage copies the complete English prompt and reaches the twelve-case collection', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Clipboard permissions require Chromium');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const detail = promptDetail('en', caseOf('c01').promptId);
  await page.goto(`${BASE}${homePath(BUILD.locales.find((locale) => locale.code === 'en')!)}`);
  await hydrated(page, '[data-another]');
  await page
    .locator('[data-on-show]')
    .getByRole('button', { name: message('en', 'detail.copy.label') })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(detail.prompt.text.trim());
  const collection = localeIndex('en').collections.find((item) => item.id === mapping.collectionId)!;
  // Newer collections may occupy the home page's two slots; §10.2 permits the collection list path.
  await page
    .getByRole('banner')
    .getByRole('link', { name: message('en', 'shell.nav.collections'), exact: true })
    .click();
  await page.locator(`a[href="${BASE}${collection.path}"]`).first().click();
  await expect(page.locator('h1')).toHaveText(collection.title);
  for (const item of mapping.cases)
    await expect(page.locator(`a[href="${BASE}${promptDetail('en', item.promptId).path}"]`).first()).toBeAttached();
});

test('the photo booth exposes both ordered references while the office cat needs none', async ({ page }) => {
  const detail = promptDetail('en', caseOf('c07').promptId);
  await page.goto(`${BASE}${detail.path}`);
  const references = page.locator('[data-reference-picture] img[alt]:not([alt=""])');
  await expect(references).toHaveCount(1);
  for (const [index, ref] of ['r1', 'r3'].entries()) {
    const asset = mapping.references.find((item) => item.id === ref)!.assetId;
    await page
      .getByRole('button', { name: message('en', 'detail.image.show', { n: String(index + 1), total: '2' }) })
      .click();
    await expect(references).toHaveAttribute('src', new RegExp(`/media/${asset}/`));
    await expect(
      page.getByText(index === 0 ? 'First person, left' : 'Second person, right', { exact: true }).first(),
    ).toBeVisible();
  }
  await page.goto(`${BASE}${promptDetail('en', caseOf('c03').promptId).path}`);
  await expect(page.locator('[data-reference-picture]')).toHaveCount(0);
});

test('the captions editor enforces nine items and the birthday editor copies the changed name and age', async ({
  page,
  context,
  browserName,
}) => {
  const stickers = templateDetail('en', caseOf('c01').templateId!);
  await page.goto(`${BASE}${stickers.path}`);
  await hydrated(page, '[data-field-shell] input');
  const shell = page.locator('[data-field-shell="captions"]');
  const input = shell.locator('input');
  const copy = page.locator('[data-copy-state]').first();
  await expect(shell.locator('li')).toHaveCount(9);
  await shell.locator('li button').last().click();
  await expect(shell.locator('li')).toHaveCount(8);
  await expect(copy).toHaveAttribute('data-copy-state', 'blocked');
  await input.fill('Love it!');
  await input.press('Enter');
  await expect(shell.locator('li')).toHaveCount(9);
  await expect(copy).toHaveAttribute('data-copy-state', 'idle');
  await input.fill('Tenth caption');
  await input.press('Enter');
  await expect(shell.locator('li')).toHaveCount(9);
  await expect(input).toHaveValue('Tenth caption');
  const birthday = templateDetail('en', caseOf('c11').templateId!);
  await page.goto(`${BASE}${birthday.path}`);
  await hydrated(page, '[data-field-shell] input');
  await page.locator('[data-field-shell="age"] input').fill('40');
  await page.locator('[data-field-shell="personName"] input').fill('SAM');
  const expected = birthday.version.defaultPrompt
    .replace('LEVEL 30 UNLOCKED', 'LEVEL 40 UNLOCKED')
    .replace('"ALEX"', '"SAM"');
  await expect(page.locator('[id$="-prompt"]').first()).toHaveText(expected);
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await copy.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  }
});
