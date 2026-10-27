import { expect, test, type Page } from '@playwright/test';
import { seriousViolations } from './support/a11y';
import { BASE, BUILD, message } from './support/artifact';
import { localeIndex, manifest } from './support/content';
import { cancelledPrefetch } from './support/errors';

// Step 3e in a real browser (design doc §8.2, §11.8.5, §11.8.7): the language entry suggests and
// remembers without redirecting, the language menu explains a missing translation, the 410 page
// names its reason, long pages track the section being read, and every page passes axe.

const KEY = 'prompt-library:preferences:v1';
const [first] = BUILD.locales;
const second = BUILD.locales[1];

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    if (!cancelledPrefetch(e.message)) errors.push(`pageerror: ${e.message}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of 40[49]|status of 410/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

const hydrated = (page: Page, selector: string) =>
  page.waitForFunction((s) => {
    const el = document.querySelector(s);
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  }, selector);

test.describe('language entry', () => {
  test.use({ locale: second ? `${second.htmlLang}` : 'en' });

  test('suggests the browser language, stays put, and remembers the choice', async ({ page }) => {
    test.skip(!second, 'needs two built locales');
    const errors = watchErrors(page);
    await page.goto(`${BASE}/`);
    await hydrated(page, 'a[hreflang]');
    await expect(page.locator(`li[data-suggested][lang="${second!.htmlLang}"]`)).toBeVisible();
    await expect(page.locator('li[data-suggested]')).toHaveCount(1);
    await expect(page.locator('[data-continue]')).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe(`${BASE}/`); // no redirect, ever

    await page.locator(`li[lang="${second!.htmlLang}"] a`).click();
    await page.waitForURL(`**${BASE}/${second!.pathPrefix}/`);
    expect(JSON.parse((await page.evaluate((k) => localStorage.getItem(k), KEY))!).language).toBe(second!.code);

    await page.goto(`${BASE}/`);
    const again = page.locator(`[data-continue="${second!.code}"]`);
    await expect(again).toHaveText(message(second!.code, 'pages.entry.continue', { language: second!.nativeName }));
    expect(new URL(page.url()).pathname).toBe(`${BASE}/`);
    expect(errors).toEqual([]);
  });
});

test('the language menu explains a missing translation and offers the versions there are', async ({ page }) => {
  // A published prompt of the default language that the second language does not have.
  test.skip(!second, 'needs two built locales');
  const have = new Set(localeIndex(second!.code).prompts.map((p) => p.id));
  const only = localeIndex(first!.code).prompts.find((p) => !have.has(p.id));
  test.skip(!only, 'every prompt is translated');
  await page.goto(`${BASE}${only!.path}`);
  const trigger = page.getByRole('button', { name: new RegExp(message(first!.code, 'shell.language.label')) });
  await hydrated(page, 'header button[aria-haspopup="listbox"]');
  await trigger.first().click();
  await page.getByRole('option', { name: new RegExp(second!.nativeName) }).click();
  await page.waitForURL(`**${BASE}/${second!.pathPrefix}/translation-missing/**`);
  await expect(page.locator('h1')).toHaveText(
    message(second!.code, 'pages.missing.title', { language: second!.nativeName }),
  );
  const primary = page.locator('[data-primary]');
  await expect(primary).toHaveText(message(second!.code, 'pages.missing.goTo', { language: first!.nativeName }));
  await primary.click();
  await page.waitForURL(`**${BASE}${only!.path}`);
});

test('the 410 page names why the address is gone', async ({ page }) => {
  const gone = manifest().gone[0];
  test.skip(!gone, 'no removed addresses');
  await page.goto(`${BASE}${gone!.path}`);
  await expect(page.locator(`[data-gone-reason="${gone!.reason}"]`)).toHaveText(
    message(gone!.locale, `pages.errors.reasons.${gone!.reason}`),
  );
  expect(await seriousViolations(page)).toEqual([]);
});

test('the contents list marks the section being read (desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const about = localeIndex(first!.code).pages.find((p) => p.slug === 'about');
  test.skip(!about, 'no about page');
  await page.goto(`${BASE}${about!.path}`);
  const toc = page.getByRole('navigation', { name: message(first!.code, 'pages.toc') });
  await expect(toc).toBeVisible();
  const links = toc.getByRole('link');
  const last = links.last();
  await hydrated(page, 'nav[aria-labelledby] a');
  await last.click();
  await expect(last).toHaveAttribute('aria-current', 'location');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toc).toBeHidden(); // no contents list on phones (§11.8.5)
});

for (const theme of ['light', 'dark'] as const) {
  for (const locale of BUILD.locales) {
    test(`${locale.code}: pages of step 3e pass axe (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      const errors = watchErrors(page);
      const index = localeIndex(locale.code);
      const urls = [
        `${BASE}/`,
        `${BASE}/${locale.pathPrefix}/collections/`,
        `${BASE}/${locale.pathPrefix}/no-such-page/`,
        `${BASE}/${locale.pathPrefix}/translation-missing/`,
        ...index.topics.slice(0, 1).map((t) => `${BASE}${t.path}`),
        ...index.collections.slice(0, 1).map((c) => `${BASE}${c.path}`),
        ...index.pages.map((p) => `${BASE}${p.path}`),
      ];
      for (const url of urls) {
        await page.goto(url);
        expect(await seriousViolations(page), url).toEqual([]);
      }
      expect(errors).toEqual([]);
    });
  }
}
