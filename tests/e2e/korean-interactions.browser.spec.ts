import { composingText } from './support/composition';
import { expect, test, type Page } from '@playwright/test';
import { BASE, BUILD, homePath, message } from './support/artifact';
import { promptDetail } from './support/content';
import { cancelledFetch } from './support/errors';

// Korean spec §6.4 and §7.1: complete browsing flows, lazy resources and composition cancellation.
// These tests use the packaged build and real Worker. Synthetic composition events do not
// replace the separate real-device Korean input-method acceptance.
const korean = BUILD.locales.find((locale) => locale.code === 'ko');
const koreanIndex = /\/generated\/ko\/search\/index\.json$/;
const koreanFont = /\/generated\/fonts\/ko(?:\.css|\/)/;
const rawQuery = '제품사진 스튜디오';

const panel = (page: Page) => page.locator('[data-quick-search]');
const launcher = (page: Page) => page.locator('[data-search-launcher]');

async function hydrated(page: Page) {
  // Match the repository's hydration convention before exercising client controls.
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-search-launcher]');
    return element && Object.keys(element).some((key) => key.startsWith('__reactProps'));
  });
}

async function openPanel(page: Page) {
  await hydrated(page);
  await launcher(page).focus();
  await launcher(page).press('Enter');
  await expect(panel(page).getByRole('textbox')).toBeFocused();
}

test('requested Korean interaction acceptance requires a Korean artifact', () => {
  test.skip(process.env.KO_ACCEPTANCE !== '1', 'explicit Korean candidate acceptance only');
  expect(korean).toBeDefined();
});

test.describe('Korean interaction acceptance', () => {
  test.skip(!korean, 'Korean is not part of this artifact');

  for (const width of [360, 1440]) {
    test(`${width}px: popup, copy, save, refreshed detail and return to the list`, async ({
      page,
      context,
      browserName,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        if (!cancelledFetch(error.message)) errors.push(error.message);
      });
      const listPath = `${BASE}/${korean!.pathPrefix}/prompts/`;
      await page.goto(listPath);
      await page.waitForFunction(() => history.scrollRestoration === 'manual');
      const card = page.locator('[role="feed"] > article[data-entry]:not([data-interlude])').first();
      const id = (await card.getAttribute('data-entry'))!;
      const detail = promptDetail('ko', id);
      await card.locator('a').first().click();
      const popup = page.locator('dialog[data-popup][open]');
      await expect(popup).toHaveAccessibleName(detail.title);
      await expect(popup.locator('h2').first()).toHaveText(detail.title);
      await expect(popup.locator('[data-popup-close]')).toHaveAccessibleName(message('ko', 'popup.close'));
      const copy = popup.locator('[data-shortcut="copy"]');
      if (browserName === 'chromium') {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await copy.click();
        await expect(copy).toHaveAttribute('data-copy-state', 'done');
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(detail.prompt.text.trim());
      } else {
        // Clipboard permissions are browser-specific; verify the public copy outcome everywhere.
        await copy.click();
        await expect(copy).toHaveAttribute('data-copy-state', 'done');
      }
      const save = popup.locator('[data-shortcut="save"]');
      await save.click();
      await expect(save).toHaveAttribute('aria-pressed', 'true');
      await expect(save).toHaveAccessibleName(message('ko', 'favorites.saved'));
      await page.reload();
      await expect(page.locator('[data-page="prompt-detail"] h1')).toHaveText(detail.title);
      await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
      await expect(page.locator('dialog[data-popup][open]')).toHaveCount(0);
      await expect(page.locator('[data-shortcut="save"]')).toHaveAttribute('aria-pressed', 'true');
      await page.waitForLoadState('networkidle');
      await page.goBack();
      await expect.poll(() => new URL(page.url()).pathname).toBe(listPath);
      await expect(page.locator('[role="feed"]')).toBeVisible();
      await expect(page.locator('dialog[data-popup][open]')).toHaveCount(0);
      await page.goto(`${BASE}/${korean!.pathPrefix}/favorites/`);
      await expect(page.locator(`[data-saved-entry="${id}"]`)).toContainText(detail.title);
      expect(errors).toEqual([]);
    });
  }

  test('the Korean home loads its font but waits for search intent to load its index', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(new URL(request.url()).pathname));
    await page.goto(`${BASE}${homePath(korean!)}`);
    await hydrated(page);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    expect(requests.filter((path) => koreanIndex.test(path))).toEqual([]);
    expect(requests.some((path) => path.includes('/generated/fonts/ko/') && path.endsWith('.woff2'))).toBe(true);
    await launcher(page).hover();
    await expect.poll(() => requests.filter((path) => koreanIndex.test(path)).length).toBe(1);
  });

  for (const locale of BUILD.locales.filter((entry) => entry.code !== 'ko')) {
    test(`${locale.code}: a cold home does not request Korean fonts`, async ({ page }) => {
      const requested: string[] = [];
      page.on('request', (request) => {
        const path = new URL(request.url()).pathname;
        if (koreanFont.test(path)) requested.push(path);
      });
      await page.goto(`${BASE}${homePath(locale)}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle');
      expect(requested).toEqual([]);
    });
  }

  test('cancelled composition keeps the confirmed query and history on the page and in the panel', async ({ page }) => {
    const searchPath = `${BASE}/${korean!.pathPrefix}/search/`;
    const unfinished = `${rawQuery}ㅎ`;
    await page.goto(`${searchPath}?q=${encodeURIComponent(rawQuery)}`);
    const input = page.locator('#search-field');
    const status = page.locator('[data-search-status]');
    await expect(input).toHaveValue(rawQuery);
    await expect(status).toContainText(rawQuery);
    await input.press('Enter');
    const confirmedStatus = await status.textContent();
    await input.dispatchEvent('compositionstart');
    await composingText(input, unfinished);
    // The URL debounce must expire while the unfinished syllable is present.
    await page.waitForTimeout(450);
    expect(new URL(page.url()).searchParams.get('q')).toBe(rawQuery);
    await expect(status).toHaveText(confirmedStatus!);
    await input.press('Escape');
    // A cancelled IME transaction restores the previous value before compositionend.
    await composingText(input, rawQuery);
    await input.dispatchEvent('compositionend', { data: '' });
    await page.waitForTimeout(450);
    await expect(input).toHaveValue(rawQuery);
    expect(new URL(page.url()).searchParams.get('q')).toBe(rawQuery);
    await expect(status).toHaveText(confirmedStatus!);

    await page.goto(`${BASE}/${korean!.pathPrefix}/prompts/`);
    await openPanel(page);
    await expect(panel(page).getByRole('option', { name: rawQuery, exact: true })).toHaveCount(1);
    await expect(panel(page).getByRole('option', { name: unfinished, exact: true })).toHaveCount(0);
    const field = panel(page).getByRole('textbox');
    await field.fill(rawQuery);
    const hit = panel(page).locator(`a[href="${BASE}${promptDetail('ko', 'p_151').path}"]`);
    await expect(hit).toBeVisible();
    const confirmedCount = await panel(page).getByRole('status').textContent();
    const listAddress = page.url();
    await field.dispatchEvent('compositionstart');
    await composingText(field, unfinished);
    await field.press('Escape');
    await page.waitForTimeout(450);
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByRole('status')).toHaveText(confirmedCount!);
    expect(page.url()).toBe(listAddress);
    await composingText(field, rawQuery);
    await field.dispatchEvent('compositionend', { data: '' });
    await expect(hit).toBeVisible();
    await field.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    await openPanel(page);
    await panel(page).getByRole('textbox').fill('');
    await expect(panel(page).getByRole('option', { name: rawQuery, exact: true })).toHaveCount(1);
    await expect(panel(page).getByRole('option', { name: unfinished, exact: true })).toHaveCount(0);
  });

  test('a query typed after composition wins when the cold Korean index finally arrives', async ({ page }) => {
    let releaseIndex!: () => void;
    let indexRequested!: () => void;
    const held = new Promise<void>((resolve) => {
      releaseIndex = resolve;
    });
    const requested = new Promise<void>((resolve) => {
      indexRequested = resolve;
    });
    await page.route(koreanIndex, async (route) => {
      indexRequested();
      await held;
      await route.continue();
    });
    const observed: string[] = [];
    await page.exposeFunction('captureKoreanSearchStatus', (value: string) => observed.push(value));
    try {
      await page.goto(`${BASE}/${korean!.pathPrefix}/search/?q=${encodeURIComponent('수묵화 매화')}`);
      const input = page.locator('#search-field');
      await expect(input).toHaveValue('수묵화 매화');
      await requested;
      await page.locator('[data-search-status]').evaluate((element) => {
        const capture = () => {
          const host = window as typeof window & { captureKoreanSearchStatus: (value: string) => Promise<void> };
          void host.captureKoreanSearchStatus(element.textContent ?? '');
        };
        new MutationObserver(capture).observe(element, { childList: true, characterData: true, subtree: true });
      });
      await input.dispatchEvent('compositionstart');
      await composingText(input, '네온 포트레이트');
      await input.dispatchEvent('compositionend', { data: '네온 포트레이트' });
      await input.fill(rawQuery);
      await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(rawQuery);
      releaseIndex();
      await expect(page.locator('[data-search-status]')).toContainText(rawQuery);
      await expect(
        page.locator(`[data-group="prompt"] a[href="${BASE}${promptDetail('ko', 'p_151').path}"]`),
      ).toBeVisible();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-search-status]')).toContainText(rawQuery);
      expect(observed.some((text) => text.includes('수묵화 매화') || text.includes('네온 포트레이트'))).toBe(false);
    } finally {
      releaseIndex();
      await page.unrouteAll({ behavior: 'wait' });
    }
  });
});
