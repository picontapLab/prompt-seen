import { composingText } from './support/composition';
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { renderTemplate } from '../../src/modules/template';
import { localeIndex, promptDetail, templateDetail } from './support/content';
import { layoutProblems } from './support/layout';
import { seriousViolations } from './support/a11y';
import { cancelledFetch } from './support/errors';
import { BASE, BUILD, ROOT } from './support/artifact';

// The composition contract is shared by every locale. Before Korean preview exists, exercise
// the English shell too; the frozen corpus tests below will require an actual Korean artifact.
const locale =
  BUILD.locales.find((entry) => entry.code === 'ko') ?? BUILD.locales.find((entry) => entry.code === 'en')!;

test('composition commits neither a search URL nor navigation until its final value', async ({ page }) => {
  await page.goto(`${BASE}/${locale.pathPrefix}/search/?q=ink`);
  const input = page.locator('#search-field');
  await expect(input).toHaveValue('ink');
  await input.focus();
  await expect(input).toBeFocused();
  await expect(page.locator('[data-search-status]')).toContainText('ink');
  await input.dispatchEvent('compositionstart');
  await composingText(input, '한');
  // The URL debounce must elapse: observing it immediately would pass even without protection.
  await page.waitForTimeout(450);
  expect(new URL(page.url()).searchParams.get('q')).toBe('ink');
  await input.press('Enter');
  const recent = await page.evaluate(() => localStorage.getItem('prompt-library:recent-searches:v1'));
  expect(recent ?? '').not.toContain('한');
  await composingText(input, '한글');
  await input.dispatchEvent('compositionend', { data: '한글' });
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('한글');

  await page.goto(`${BASE}/${locale.pathPrefix}/prompts/`);
  const launcher = page.locator('[data-search-launcher]');
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-search-launcher]');
    return element && Object.keys(element).some((key) => key.startsWith('__reactProps'));
  });
  await launcher.click();
  const dialog = page.locator('[data-quick-search]');
  const field = dialog.getByRole('textbox');
  await expect(field).toBeFocused();
  await field.fill('ink');
  await field.dispatchEvent('compositionstart');
  await composingText(field, '한');
  await field.dispatchEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: false });
  await page.waitForTimeout(100);
  await expect(dialog).toBeVisible();
  await field.press('Escape');
  await expect(dialog).toBeVisible();
  await composingText(field, '한글');
  await field.dispatchEvent('compositionend', { data: '한글' });
  await field.press('Enter');
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('한글');
});

for (const [id, name, value, label] of [
  ['t_001', 'product', '점박이 도자기 머그잔', '제품'],
  ['t_002', 'subject', '겨울 절벽의 소나무 한 그루', '주제'],
]) {
  test(`Korean input survives template preview, copy and download: ${id}`, async ({ page, context, browserName }) => {
    const detail = templateDetail(locale.code, id!);
    await page.goto(`${BASE}${detail.path}`);
    const field = page.locator(`[data-field-shell="${name}"] input`);
    await field.evaluate(
      (element) =>
        new Promise<void>((resolve) => {
          const poll = () =>
            Object.keys(element).some((key) => key.startsWith('__reactProps')) ? resolve() : setTimeout(poll, 20);
          poll();
        }),
    );
    if (locale.code === 'ko') await expect(field).toHaveAccessibleName(label!);
    await field.fill(value!);
    const expected = renderTemplate(
      { body: detail.version.body, fields: detail.version.fields },
      { ...detail.version.samples[0]!.values, [name!]: value! },
    ).text!;
    expect(expected).toContain(value);
    await expect(page.locator('[id$="-prompt"]').first()).toHaveText(expected);
    const downloading = page.waitForEvent('download');
    await page.locator('[data-action="download"]').click();
    expect(fs.readFileSync((await (await downloading).path())!, 'utf8')).toBe(expected);
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.locator('[data-copy-state]').first().click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    }
  });
}

const korean = BUILD.locales.find((entry) => entry.code === 'ko');
const searchCases: { query: string; expectedKeys: string[]; topK: number }[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'production/localization/ko/search-cases.json'), 'utf8'),
).cases;

test.describe('frozen Korean search scenarios in the real Worker', () => {
  test.skip(!korean, 'Korean is not part of this artifact');
  for (const example of searchCases) {
    test(example.query, async ({ page }) => {
      const index = localeIndex('ko');
      await page.goto(`${BASE}/${korean!.pathPrefix}/search/?q=${encodeURIComponent(example.query)}`);
      await expect(page.locator('[data-search-status]')).toContainText(example.query.trim(), { timeout: 15_000 });
      for (const key of example.expectedKeys) {
        const [kind, id] = key.split('/');
        const records = kind === 'prompt' ? index.prompts : index.templates;
        const record = records.find((item) => item.id === id)!;
        expect(record, key).toBeDefined();
        await expect
          .poll(async () => {
            const paths = await page
              .locator(`[data-group="${kind}"] li a`)
              .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
            return paths.slice(0, example.topK).includes(`${BASE}${record.path}`);
          })
          .toBe(true);
      }
    });
  }
});

test('Korean acceptance cannot silently use an artifact without ko', () => {
  test.skip(process.env.KO_ACCEPTANCE !== '1', 'explicit candidate acceptance only');
  expect(korean).toBeDefined();
});

test.describe('Korean preview layout', () => {
  test.skip(!korean, 'Korean is not part of this artifact');
  for (const width of [360, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${width}px ${theme}: Korean descriptions and controls fit`, async ({ page, browserName }) => {
        test.setTimeout(90_000);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          if (!cancelledFetch(error.message)) errors.push(error.message);
        });
        for (const route of [
          '/ko/',
          '/ko/prompts/',
          '/ko/about/',
          '/ko/license/',
          '/ko/favorites/',
          promptDetail('ko', 'p_012').path,
          promptDetail('ko', 'p_151').path,
          templateDetail('ko', 't_001').path,
          '/ko/search/?q=수묵화',
        ]) {
          await page.goto(`${BASE}${route}`);
          await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
          await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
          await expect(page.locator('h1')).toBeVisible();
          if (route.startsWith('/ko/search/')) {
            await expect(page.locator('[data-search-status]')).toContainText('수묵화');
            await expect(page.locator('[data-group="prompt"] li').first()).toBeVisible();
          }
          const preview = page.locator('[data-static-from="lg"] > button');
          if (await preview.isVisible()) await preview.click();
          expect(await layoutProblems(page), route).toEqual([]);
        }
        await page.screenshot({
          path: `.artifacts/localization/ko/screenshots/search-${browserName}-${width}-${theme}.png`,
          fullPage: true,
        });
        expect(errors).toEqual([]);
      });
    }
  }
  test('Korean template accessible names and contrast', async ({ page }) => {
    await page.goto(`${BASE}${templateDetail('ko', 't_001').path}`);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
