import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { settle } from './support/a11y';
import { BASE, BUILD, message } from './support/artifact';
import { cancelledFetch } from './support/errors';
import { layoutProblems } from './support/layout';

// The page shell and theme of step 1c (design doc §11.6.3, §11.9, §15.5.2), in a real browser
// against the packaged site.

const KEY = 'prompt-library:preferences:v1';
const CANVAS = { light: 'rgb(237, 236, 232)', dark: 'rgb(18, 17, 16)' };
const [first] = BUILD.locales;
const home = (prefix = first!.pathPrefix) => `${BASE}/${prefix}/`;

/**
 * Fails the test on any page error or console error, hydration mismatches included, except
 * requests a reload or navigation cancels (`cancelledFetch`).
 */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    if (!cancelledFetch(e.message)) errors.push(`pageerror: ${e.message}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !cancelledFetch(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

const rootState = (page: Page) =>
  page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    background: getComputedStyle(document.documentElement).backgroundColor,
    override:
      document.head.querySelector('meta[name="theme-color"][data-theme-override]')?.getAttribute('content') ?? null,
  }));

test('every locale page has the skip link, header, one main landmark and footer', async ({ page }) => {
  for (const locale of BUILD.locales) {
    await page.goto(home(locale.pathPrefix));
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(
      page.getByRole('link', { name: message(locale.code, 'shell.home', { siteName: BUILD.siteName }) }),
    ).toBeVisible();
    // Skip link: first in the document, visible on focus, moves focus to <main>. (Focused
    // directly: WebKit, like Safari, skips links on Tab by default.)
    const skip = page.getByRole('link', { name: message(locale.code, 'shell.skipToContent') });
    expect(
      await page.evaluate(() => document.querySelector('body a, body button, body input')?.getAttribute('href')),
    ).toBe('#main');
    await skip.focus();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
  }
});

const REPOSITORY = 'https://github.com/picontapLab/prompt-seen';
const markPath = (page: Page) => page.locator(`header a[href="${REPOSITORY}"] svg path`);

test('the header link to the repository opens it and wags the tail on hover', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = watchErrors(page);
  await page.goto(home());
  const link = page.locator(`header a[href="${REPOSITORY}"]`);
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAccessibleName(/GitHub/);

  const rest = await markPath(page).getAttribute('d');
  await link.hover();
  await expect.poll(() => markPath(page).getAttribute('d')).not.toBe(rest);
  await page.mouse.move(0, 400);
  await expect.poll(() => markPath(page).getAttribute('d'), { timeout: 6000 }).toBe(rest);
  expect(errors).toEqual([]);
});

test('the footer links to the repository at every width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(home());
  await expect(page.locator(`footer a[href="${REPOSITORY}"]`)).toBeVisible();
});

test('under reduced motion the tail stays still', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(home());
  const rest = await markPath(page).getAttribute('d');
  await page.locator(`header a[href="${REPOSITORY}"]`).hover();
  await page.waitForTimeout(1500);
  expect(await markPath(page).getAttribute('d')).toBe(rest);
  await context.close();
});

test('a stored theme applies before any script of the app runs (no flash)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(([key]) => localStorage.setItem(key!, JSON.stringify({ theme: 'light' })), [KEY]);
  // Without the Next.js scripts (styles still load) only the inline first-paint script can set
  // the theme.
  await page.route(/\/_next\/static\/.*\.js(\?|$)/, (route) => route.abort());
  await page.goto(home());
  expect(await rootState(page)).toEqual({ theme: 'light', background: CANVAS.light, override: 'rgb(237 236 232)' });
});

test('without a stored choice the theme follows the system', async ({ page }) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(home());
    expect(await rootState(page)).toEqual({ theme: null, background: CANVAS[scheme], override: null });
  }
});

test('switching the theme keeps focus, persists, and logs no errors', async ({ page }) => {
  const errors = watchErrors(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(home());
  const t = (key: string) => message(first!.code, `shell.theme.${key}`);

  const toLight = page.getByRole('button', { name: t('toLight') });
  await toLight.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: t('toDark') })).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor))
    .toBe(CANVAS.light);

  await page.reload();
  expect(await rootState(page)).toMatchObject({ theme: 'light', override: 'rgb(237 236 232)' });
  await expect(page.getByRole('radio', { name: t('light') })).toBeChecked();

  // Back to the system theme from the footer.
  await page.getByRole('radio', { name: t('system') }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
  expect(await rootState(page)).toEqual({ theme: null, background: CANVAS.dark, override: null });
  expect(JSON.parse((await page.evaluate((key) => localStorage.getItem(key), KEY))!)).toEqual({
    theme: 'system',
    singleKeyShortcuts: true,
    language: null,
    favoritesNoteSeen: false,
  });

  // Client navigation to another locale keeps the theme and stays error-free.
  if (BUILD.locales.length > 1) {
    await page.getByRole('radio', { name: t('dark') }).click();
    const other = BUILD.locales[1]!;
    await page.getByRole('contentinfo').getByRole('link', { name: other.nativeName }).click();
    await expect(page).toHaveURL(new RegExp(`/${other.pathPrefix}/$`));
    await expect(page.locator('html')).toHaveAttribute('lang', other.htmlLang);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  }
  expect(errors).toEqual([]);
});

test('the language switch finds a language by its English name and keeps the page', async ({ page }) => {
  const target = BUILD.locales.find((l) => l.code !== first!.code);
  test.skip(!target, 'one locale in this build');
  await page.goto(home());
  const englishName = new Intl.DisplayNames(['en'], { type: 'language' }).of(target!.htmlLang)!;
  const label = message(first!.code, 'shell.language.label');
  // A plain button until first use; pressing it loads the searchable list, focused and open.
  await page
    .getByRole('banner')
    .getByRole('button', { name: `${label}: ${first!.nativeName}` })
    .click();
  const combobox = page.getByRole('combobox', { name: label });
  await expect(combobox).toBeFocused();
  await expect(page.getByRole('listbox')).toBeVisible();
  await combobox.fill(englishName.slice(0, 4));
  await page.getByRole('option', { name: target!.nativeName }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/${target!.pathPrefix}/$`));
  await expect(page.locator('html')).toHaveAttribute('lang', target!.htmlLang);
});

test.describe('narrow screens', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the menu opens as a dialog, closes with Esc and returns focus', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(home());
    const open = page.getByRole('button', { name: message(first!.code, 'shell.menu.open') });
    await open.click();
    const dialog = page.getByRole('dialog', { name: message(first!.code, 'shell.menu.title') });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('combobox')).toBeVisible();
    await expect(dialog.getByRole('radiogroup')).toBeVisible();
    // The sheet slides and fades in; contrast is measured once it has arrived.
    await settle(page);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
    expect(errors).toEqual([]);
  });
});

/** Header controls smaller than `--target-min` or past an edge of the viewport. */
const headerTargetProblems = (page: Page) =>
  page.getByRole('banner').evaluate((header) => {
    const min = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--target-min'));
    return [...header.querySelectorAll('a, button')].flatMap((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return [];
      const fits = r.width >= min && r.height >= min && r.left >= 0 && r.right <= innerWidth;
      return fits ? [] : [`${el.getAttribute('aria-label') ?? el.textContent}: ${r.left}–${r.right} × ${r.height}`];
    });
  });

test.describe('the narrowest screens', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const locale of BUILD.locales) {
    test(`${locale.code}: the header fits at 320 px and nothing leaves reach`, async ({ page }) => {
      const t = (key: string) => message(locale.code, key);
      await page.goto(home(locale.pathPrefix));
      await page.evaluate(() => document.fonts.ready);
      expect(await layoutProblems(page)).toEqual([]);
      expect(await headerTargetProblems(page)).toEqual([]);
      const bar = page.getByRole('banner').locator('.container');
      expect(await bar.evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0);
      await expect(page.getByRole('banner').getByRole('link', { name: t('search.open') })).toBeInViewport({ ratio: 1 });

      // The theme button gives up its place in the bar; the menu has the theme, language and
      // saved works.
      const open = page.getByRole('button', { name: t('shell.menu.open') });
      await expect(open).toBeInViewport({ ratio: 1 });
      await open.click();
      const dialog = page.getByRole('dialog', { name: t('shell.menu.title') });
      await expect(dialog.getByRole('combobox')).toBeVisible();
      await expect(dialog.getByRole('link', { name: message(locale.code, 'favorites.link') })).toBeVisible();
      await settle(page);
      expect(await layoutProblems(page, '[role="dialog"]')).toEqual([]);
      await dialog.getByRole('radio', { name: t('shell.theme.dark') }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });
  }

  test('the header still fits before the display font arrives', async ({ page }) => {
    await page.route(/\.woff2(\?|$)/, (route) => route.abort());
    await page.goto(home());
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    expect(await headerTargetProblems(page)).toEqual([]);
  });

  test('the theme button stays where there is no menu, and comes back at 480 px', async ({ page }) => {
    const toggle = page.getByRole('banner').getByRole('button', { name: message(first!.code, 'shell.theme.toDark') });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(`${BASE}/no-such-page-at-all/`);
    await expect(page.getByRole('button', { name: message(first!.code, 'shell.menu.open') })).toHaveCount(0);
    await expect(toggle).toBeVisible();
    await page.goto(home());
    await expect(toggle).toBeHidden();
    await page.setViewportSize({ width: 480, height: 640 });
    await expect(toggle).toBeVisible();
  });
});

for (const scheme of ['light', 'dark'] as const) {
  for (const locale of BUILD.locales) {
    test(`axe (${scheme}): ${locale.code} home has no serious or critical violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(home(locale.pathPrefix));
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target).join(' | ')})`)).toEqual([]);
    });
  }
}
