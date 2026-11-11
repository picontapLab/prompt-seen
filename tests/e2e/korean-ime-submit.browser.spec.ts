import { composingText } from './support/composition';
import { expect, test } from '@playwright/test';
import { BASE, BUILD } from './support/artifact';

const korean = BUILD.locales.find((locale) => locale.code === 'ko');
const rawQuery = '제품사진 스튜디오';
const historyKey = 'prompt-library:recent-searches:v1';

test('Safari-style 229 Enter after compositionend does not submit, but the next ordinary Enter does', async ({
  page,
}) => {
  test.skip(!korean, 'Korean is not part of this artifact');
  await page.goto(`${BASE}/${korean!.pathPrefix}/search/?q=ink`);
  const input = page.locator('#search-field');
  await expect(input).toHaveValue('ink');
  await expect(page.locator('[data-search-status]')).toContainText('ink');
  await input.focus();
  await input.dispatchEvent('compositionstart');
  await composingText(input, rawQuery);
  await input.dispatchEvent('compositionend', { data: rawQuery });
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(rawQuery);
  await expect(page.locator('[data-search-status]')).toContainText(rawQuery);
  const before = await page.evaluate((key) => localStorage.getItem(key), historyKey);

  // Safari can end composition before the candidate-confirming Enter arrives as 229.
  // Modify a real key press at window capture, before React's delegated capture handler.
  // dispatchEvent('keydown') would miss the browser's default implicit form submission.
  await page.evaluate(() => {
    const markNextEnter = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      Object.defineProperty(event, 'keyCode', { get: () => 229 });
      window.removeEventListener('keydown', markNextEnter, true);
    };
    window.addEventListener('keydown', markNextEnter, true);
  });
  await input.press('Enter');
  await page.waitForTimeout(150);
  expect.soft(await page.evaluate((key) => localStorage.getItem(key), historyKey)).toBe(before);

  await input.press('Enter');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), historyKey)).toContain(rawQuery);
});
