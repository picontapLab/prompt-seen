import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { settle } from './support/a11y';
import { BASE, BUILD, message } from './support/artifact';

// The page shell and theme of step 1c (design doc §11.6.3, §11.9, §15.5.2), in a real browser
// against the packaged site.

const KEY = 'prompt-library:preferences:v1';
const CANVAS = { light: 'rgb(237, 236, 232)', dark: 'rgb(18, 17, 16)' };
const [first] = BUILD.locales;
const home = (prefix = first!.pathPrefix) => `${BASE}/${prefix}/`;

/** Fails the test on any page error or console error, hydration mismatches included. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
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
  expect(JSON.parse((await page.evaluate((key) => localStorage.getItem(key), KEY))!)).toEqual({ theme: 'system' });

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
  await page.getByRole('option', { name: new RegExp(target!.nativeName) }).click();
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
