import { expect, test, type Page } from '@playwright/test';
import { BASE, BUILD, homePath, message } from './support/artifact';
import { localeIndex, promptDetail } from './support/content';
import { worksOnShow } from './support/home';
import { seriousViolations } from './support/a11y';

type Locale = (typeof BUILD.locales)[number];
const defaultLocale = BUILD.locales.find((l) => l.code === BUILD.defaultLocale)!;
async function chooseLanguage(page: Page, from: Locale, to: Locale) {
  const label = message(from.code, 'shell.language.label');
  const button = page.getByRole('banner').getByRole('button', { name: `${label}: ${from.nativeName}`, exact: true });
  if (await button.isVisible()) await button.click();
  else {
    const input = page.getByRole('combobox', { name: label });
    if (!(await input.isVisible()))
      await page
        .getByRole('banner')
        .getByRole('button', { name: message(from.code, 'shell.menu.open') })
        .click();
    await input.fill(to.nativeName);
  }
  await page.getByRole('option', { name: to.nativeName }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', to.htmlLang);
  await expect(page.locator('html')).toHaveAttribute('dir', to.direction);
}
async function checkCards(page: Page, locale: Locale) {
  const nodes = page.locator('[data-card-summary]');
  for (let i = 0; i < (await nodes.count()); i++) {
    const summary = nodes.nth(i);
    const id = await summary.locator('xpath=ancestor::*[@data-entry][1]').getAttribute('data-entry');
    expect(await summary.textContent()).toBe(localeIndex(locale.code).prompts.find((p) => p.id === id)!.description);
    const actual = localeIndex(locale.code).prompts.find((prompt) => prompt.id === id)!.localization.contentLocale;
    await expect(summary).toHaveAttribute('lang', actual);
    await expect(summary).toHaveAttribute(
      'dir',
      BUILD.locales.find((entry) => entry.code === actual)?.direction ?? 'ltr',
    );
    await expect(summary).not.toHaveAttribute('aria-hidden');
    expect(await summary.evaluate((el) => getComputedStyle(el).webkitLineClamp)).toBe('2');
  }
}
for (const locale of BUILD.locales) {
  test(`${locale.code}: direct home, refresh, summaries, previews and first-screen layout`, async ({ page }, info) => {
    await page.goto(`${BASE}${homePath(locale)}`);
    await page.reload();
    await expect(page).toHaveTitle(message(locale.code, 'home.documentTitle', { siteName: BUILD.siteName }));
    await expect(page.locator('h1')).toHaveText(message(locale.code, 'home.hero.title'));
    await expect(page.getByText(message(locale.code, 'home.hero.intro'), { exact: true })).toBeVisible();
    await checkCards(page, locale);
    const first = worksOnShow(locale.code)[0];
    if (first) {
      const d = promptDetail(locale.code, first);
      await expect(page.locator('[data-on-show]')).toHaveAttribute('data-on-show', first);
      await expect(page.locator('[data-prompt-language]').first()).toHaveAttribute(
        'data-prompt-language',
        d.prompt.language,
      );
      await expect(page.locator('blockquote').first()).toHaveAttribute('lang', d.prompt.language);
    }
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (first && width !== 320) {
        const copy = page.locator('[data-on-show] [data-copy-state]').first();
        const box = (await copy.boundingBox())!;
        expect(box.y + box.height, `${locale.code} copy at ${width}px`).toBeLessThanOrEqual(width === 1440 ? 900 : 844);
      }
      await page.screenshot({ path: info.outputPath(`${locale.code}-${width}.png`), fullPage: width === 1440 });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    expect(await seriousViolations(page)).toEqual([]);
    await page.goto(`${BASE}/${locale.pathPrefix}/templates/`);
    for (const template of localeIndex(locale.code).templates) {
      const card = page.locator(`[data-entry="${template.id}"]`);
      await expect(card.locator('[data-template-summary]')).toHaveText(template.description);
      await expect(card.locator('[data-template-excerpt]')).toHaveCount(
        template.promptLanguage === locale.code ? 1 : 0,
      );
    }
  });
  if (locale.code !== defaultLocale.code)
    test(`${locale.code}: home language round trip resets the showcase and browser history`, async ({ page }) => {
      await page.goto(`${BASE}${homePath(defaultLocale)}`);
      const another = page.locator('[data-another]');
      if (await another.count()) {
        await page.waitForFunction(() => {
          const button = document.querySelector('[data-another]');
          return !!button && Object.keys(button).some((key) => key.startsWith('__reactProps'));
        });
        await another.click();
        await expect(page.locator('[data-on-show]')).toHaveAttribute(
          'data-on-show',
          worksOnShow(defaultLocale.code)[1]!,
        );
      }
      await chooseLanguage(page, defaultLocale, locale);
      await expect(page.locator('h1')).toHaveText(message(locale.code, 'home.hero.title'));
      await checkCards(page, locale);
      const first = worksOnShow(locale.code)[0];
      if (first) await expect(page.locator('[data-on-show]')).toHaveAttribute('data-on-show', first);
      await chooseLanguage(page, locale, defaultLocale);
      await checkCards(page, defaultLocale);
      await page.goBack();
      await expect(page.locator('html')).toHaveAttribute('lang', locale.htmlLang);
      await checkCards(page, locale);
      await page.goForward();
      await expect(page.locator('html')).toHaveAttribute('lang', defaultLocale.htmlLang);
      await checkCards(page, defaultLocale);
    });
}

test('late source-language favorite data cannot replace target-language cards', async ({ page }) => {
  const target = BUILD.locales.find((l) => l.code !== defaultLocale.code)!;
  const sourceEntry = localeIndex(defaultLocale.code).prompts.find((p) =>
    localeIndex(target.code).prompts.some((q) => q.id === p.id),
  )!;
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'prompt-library:favorites:v1',
        JSON.stringify({ items: [{ id, kind: 'prompt', at: '2026-11-09T00:00:00Z' }] }),
      ),
    sourceEntry.id,
  );
  let release!: () => void;
  let intercepted!: () => void;
  let delivered!: () => void;
  const completed = new Promise<void>((r) => {
    delivered = r;
  });
  const waiting = new Promise<void>((r) => {
    intercepted = r;
  });
  const gate = new Promise<void>((r) => {
    release = r;
  });
  await page.route(`**/generated/${defaultLocale.code}/feed/index.json`, async (route) => {
    const response = await route.fetch();
    intercepted();
    await gate;
    await route.fulfill({ response }).catch(() => {});
    delivered();
  });
  await page.goto(`${BASE}/${defaultLocale.pathPrefix}/favorites/`);
  await waiting;
  await chooseLanguage(page, defaultLocale, target);
  await expect(page.locator('[data-card-summary]')).toHaveCount(1);
  await checkCards(page, target);
  release();
  await completed;
  await checkCards(page, target);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('prompt-library:favorites:v1')!).items[0].id)).toBe(
    sourceEntry.id,
  );
});

test('preview navigation crosses Latin, CJK and RTL locales without stale summaries', async ({ page }) => {
  const rtl = BUILD.locales.find((l) => l.direction === 'rtl');
  test.skip(!rtl, 'RTL locale is preview-only');
  const cjk = BUILD.locales.find((l) => l.code.startsWith('zh') || l.code === 'ja')!;
  await page.goto(`${BASE}${homePath(defaultLocale)}`);
  await chooseLanguage(page, defaultLocale, cjk);
  await checkCards(page, cjk);
  await chooseLanguage(page, cjk, rtl!);
  await checkCards(page, rtl!);
  await chooseLanguage(page, rtl!, defaultLocale);
  await checkCards(page, defaultLocale);
});

test('an unavailable translation keeps the favorite ID and returns when switching back', async ({ page }) => {
  const target = BUILD.locales.find(
    (l) =>
      l.code !== defaultLocale.code &&
      localeIndex(defaultLocale.code).prompts.some((p) => !localeIndex(l.code).prompts.some((q) => q.id === p.id)),
  );
  test.skip(!target, 'this build has identical visible prompt sets');
  const entry = localeIndex(defaultLocale.code).prompts.find(
    (p) => !localeIndex(target!.code).prompts.some((q) => q.id === p.id),
  )!;
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        'prompt-library:favorites:v1',
        JSON.stringify({ items: [{ id, kind: 'prompt', at: '2026-11-09T00:00:00Z' }] }),
      ),
    entry.id,
  );
  await page.goto(`${BASE}/${defaultLocale.pathPrefix}/favorites/`);
  await expect(page.locator('[data-card-summary]')).toHaveText(entry.description);
  await chooseLanguage(page, defaultLocale, target!);
  await expect(page.locator(`[data-saved-entry="${entry.id}"][data-unavailable]`)).toBeVisible();
  await expect(page.locator('[data-card-summary]')).toHaveCount(0);
  await chooseLanguage(page, target!, defaultLocale);
  await expect(page.locator('[data-card-summary]')).toHaveText(entry.description);
});

test('a case without a translated description stays available after switching languages', async ({ page, request }) => {
  const candidate = BUILD.locales
    .filter((l) => l.code !== defaultLocale.code)
    .flatMap((locale) => localeIndex(locale.code).prompts.map((entry) => ({ locale, entry })))
    .find(({ locale, entry }) => {
      const detail = promptDetail(locale.code, entry.id);
      return (
        detail.translation.reviewStatus === 'source' &&
        detail.translation.sourceLocale !== locale.code &&
        localeIndex(defaultLocale.code).prompts.some((p) => p.id === entry.id)
      );
    });
  expect(candidate, 'the library includes cases whose descriptions are not yet translated').toBeDefined();
  const { locale, entry } = candidate!;
  const original = promptDetail(defaultLocale.code, entry.id);
  const fallback = promptDetail(locale.code, entry.id);
  expect(fallback.localization).toMatchObject({
    contentLocale: fallback.translation.sourceLocale,
    localStatus: 'missing',
    presentation: 'fallback',
    indexable: false,
  });
  await page.goto(`${BASE}${original.path}`);
  await chooseLanguage(page, defaultLocale, locale);
  await expect(page).toHaveURL(new RegExp(`${fallback.path}$`));
  await expect(page.locator('h1')).toHaveText(fallback.title);
  const popup = await request.get(`${BASE}/generated/${locale.code}/prompts/${entry.slug}.json`);
  expect(popup.status()).toBe(200);
  expect(await popup.json()).toMatchObject({ id: entry.id, locale: locale.code, path: fallback.path });
  await page.reload();
  await expect(page.locator('h1')).toHaveText(fallback.title);
  await chooseLanguage(page, locale, defaultLocale);
  await expect(page).toHaveURL(new RegExp(`${original.path}$`));
});

test('a delayed feed page cannot append source summaries after language navigation', async ({ page }) => {
  const target = BUILD.locales.find((l) => l.code !== defaultLocale.code)!;
  let release!: () => void;
  let seen!: () => void;
  let delivered!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const requested = new Promise<void>((r) => {
    seen = r;
  });
  const completed = new Promise<void>((r) => {
    delivered = r;
  });
  await page.route(`**/generated/${defaultLocale.code}/feed/latest/2.json`, async (route) => {
    const response = await route.fetch();
    seen();
    await gate;
    await route.fulfill({ response }).catch(() => {});
    delivered();
  });
  await page.goto(`${BASE}/${defaultLocale.pathPrefix}/prompts/`);
  await page.locator('[role="feed"] > article').last().scrollIntoViewIfNeeded();
  await requested;
  await page.evaluate(() => scrollTo(0, 0));
  await chooseLanguage(page, defaultLocale, target);
  release();
  await completed;
  await expect(page.locator('h1')).toHaveText(message(target.code, 'feed.title'));
  await checkCards(page, target);
  await page.locator('[role="feed"] > article').last().scrollIntoViewIfNeeded();
  await expect(page.locator('[data-feed-page="2"]').first()).toBeAttached();
  await checkCards(page, target);
});

test('a late popup request stays isolated when the same work opens in another locale', async ({ page }) => {
  const target = BUILD.locales.find((l) => l.code !== defaultLocale.code)!;
  const id = worksOnShow(defaultLocale.code).find((id) => localeIndex(target.code).prompts.some((p) => p.id === id))!;
  const source = promptDetail(defaultLocale.code, id);
  const translated = promptDetail(target.code, id);
  let release!: () => void;
  let seen!: () => void;
  let delivered!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const requested = new Promise<void>((r) => {
    seen = r;
  });
  const completed = new Promise<void>((r) => {
    delivered = r;
  });
  await page.route(`**/generated/${defaultLocale.code}/prompts/${source.slug}.json`, async (route) => {
    const response = await route.fetch();
    seen();
    await gate;
    await route.fulfill({ response }).catch(() => {});
    delivered();
  });
  await page.goto(`${BASE}${homePath(defaultLocale)}`);
  await page.locator(`[data-on-show] a[href="${BASE}${source.path}"]`).click();
  await requested;
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await chooseLanguage(page, defaultLocale, target);
  release();
  await completed;
  const link = page.locator(`main a[href="${BASE}${translated.path}"]`).first();
  await link.click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog.getByRole('heading', { name: translated.title, exact: true })).toBeVisible();
  await expect(dialog.locator('[id$="-prompt"]').first()).toHaveText(translated.prompt.text);
  await expect(page).toHaveTitle(new RegExp(translated.title));
});
