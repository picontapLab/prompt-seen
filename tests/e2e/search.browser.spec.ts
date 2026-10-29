import { expect, test, type Page } from '@playwright/test';
import { seriousViolations } from './support/a11y';
import { BASE, BUILD, message } from './support/artifact';
import { localeIndex } from './support/content';

// Search in the browser (design doc §11.8.6, §11.10, §13.3, §16.2, §16.4): the quick panel from
// any page, the search page, loading on intent, stale and failed indexes, and input methods.

const en = BUILD.locales.find((l) => l.code === 'en')!;
const zh = BUILD.locales.find((l) => l.code === 'zh-Hans')!;
const INDEX = /\/generated\/[^/]+\/search\/index\.json$/;

const panel = (page: Page) => page.locator('[data-quick-search]');
const field = (page: Page) => panel(page).getByRole('textbox');
const options = (page: Page) => panel(page).getByRole('option');
const launcher = (page: Page) => page.locator('[data-search-launcher]');

/** Waits until React has attached its handlers to the header's search link. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const el = document.querySelector('[data-search-launcher]');
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  });

async function openPage(page: Page, path: string) {
  await page.goto(`${BASE}${path}`);
  await hydrated(page);
}

/** A word from the title of the newest prompt of a locale: a query that must find it. */
const titleWord = (code: string) => localeIndex(code).prompts[0]!.title.split(/[\s-]+/)[0]!;

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('an ordinary page never requests a search index; pointing at the button does (§16.4)', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => {
      if (INDEX.test(new URL(r.url()).pathname)) requests.push(r.url());
    });
    await openPage(page, `/${en.pathPrefix}/prompts/`);
    await page.waitForLoadState('networkidle');
    expect(requests).toEqual([]);
    await launcher(page).hover();
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toContain(`/generated/en/search/index.json`);
  });

  test('"/" opens the panel; results are grouped, marked and open with the keyboard (§11.8.6)', async ({ page }) => {
    await openPage(page, `/${en.pathPrefix}/prompts/`);
    await page.keyboard.press('/');
    await expect(field(page)).toBeFocused();
    const word = titleWord('en');
    await field(page).fill(word);
    await expect(options(page).first()).toBeVisible();
    await expect(panel(page).getByText(message('en', 'search.groups.prompt'), { exact: true })).toBeVisible();
    await expect(options(page).first().locator('mark').first()).toHaveText(new RegExp(word, 'i'));
    // The last item opens every result on the search page.
    await expect(options(page).last()).toHaveAttribute(
      'href',
      `${BASE}/${en.pathPrefix}/search/?q=${encodeURIComponent(word)}`,
    );

    await field(page).press('ArrowDown');
    const first = options(page).first();
    await expect(first).toHaveAttribute('data-focused', 'true');
    const href = await first.getAttribute('href');
    await field(page).press('Enter');
    await page.waitForURL((u) => u.pathname === href);
  });

  test('⌘K / Ctrl+K open the panel anywhere; "/" in a text field is typed (§11.10)', async ({ page, browserName }) => {
    const template = localeIndex('en').templates[0];
    test.skip(!template, 'no template in this build');
    await openPage(page, template!.path);
    const text = page.locator('input[type="text"], textarea').first();
    await text.click();
    await text.evaluate((el: HTMLInputElement | HTMLTextAreaElement) =>
      el.setSelectionRange(el.value.length, el.value.length),
    );
    await page.keyboard.type('/');
    await expect(panel(page)).toHaveCount(0);
    await expect(text).toHaveValue(/\/$/);
    await page.keyboard.press(browserName === 'webkit' ? 'Meta+k' : 'Control+k');
    await expect(field(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
  });

  test('Esc closes the panel and focus returns to the button', async ({ page }) => {
    await openPage(page, `/${en.pathPrefix}/prompts/`);
    // From the keyboard: Safari does not focus a link on click, so there would be nothing to return to.
    await launcher(page).focus();
    await page.keyboard.press('Enter');
    await expect(field(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    await expect(launcher(page)).toBeFocused();
  });

  test('Enter with nothing chosen opens the search page; recent searches come back and clear', async ({ page }) => {
    await openPage(page, `/${en.pathPrefix}/prompts/`);
    await page.keyboard.press('/');
    const word = titleWord('en');
    await field(page).fill(word);
    await expect(options(page).first()).toBeVisible();
    await field(page).press('Enter');
    await page.waitForURL((u) => u.pathname === `${BASE}/${en.pathPrefix}/search/` && u.searchParams.get('q') === word);

    await page.goto(`${BASE}/${en.pathPrefix}/prompts/`);
    await hydrated(page);
    await page.keyboard.press('/');
    await expect(panel(page).getByText(message('en', 'search.panel.recent'), { exact: true })).toBeVisible();
    await expect(options(page).filter({ hasText: word })).toHaveCount(1);
    // Popular uses link to the list filtered by that use (§11.8.6 热门用途).
    await expect(
      options(page)
        .filter({ hasText: localeIndex('en').terms.find((t) => t.kind === 'useCase')!.label })
        .first(),
    ).toBeVisible();
    await expect(panel(page).locator(`a[href*="/prompts/#use="]`).first()).toBeVisible();

    await options(page)
      .filter({ hasText: message('en', 'search.panel.clearRecent') })
      .click();
    await expect(panel(page).getByText(message('en', 'search.panel.recent'), { exact: true })).toHaveCount(0);
  });

  test('the search page reads ?q=, groups with counts, marks words and keeps the address in step', async ({ page }) => {
    const word = titleWord('en');
    await openPage(page, `/${en.pathPrefix}/search/?q=${encodeURIComponent(word)}`);
    const input = page.locator('#search-field');
    await expect(input).toHaveValue(word);
    await expect(input).toBeFocused();
    const prompts = page.locator('[data-group="prompt"]');
    await expect(prompts.getByRole('heading')).toContainText(message('en', 'search.groups.prompt'));
    await expect(prompts.locator('mark').first()).toBeVisible();
    await expect(page.locator('[data-search-status]')).toContainText(word);

    await input.fill('ink');
    await expect(page).toHaveURL(/\?q=ink$/);
    await expect(page.locator('[data-search-status]')).toContainText('ink');
    // On the search page, "/" moves to its own field instead of opening the panel.
    await page.locator('h1').click();
    await page.keyboard.press('/');
    await expect(input).toBeFocused();
    await expect(panel(page)).toHaveCount(0);
  });

  test('long groups grow as their end comes near, without a button (§11.12)', async ({ page }) => {
    await openPage(page, `/${en.pathPrefix}/search/?q=sample`);
    const rows = page.locator('[data-group="prompt"] li');
    await expect(rows.first()).toBeVisible();
    const total = Number(await page.locator('[data-group="prompt"] h2 span').textContent());
    test.skip(total <= 24, 'needs more than one step of results');
    await expect(rows).toHaveCount(24);
    await page.locator('[data-search-more]').scrollIntoViewIfNeeded();
    await expect.poll(() => rows.count()).toBeGreaterThan(24);
    await expect(page.getByRole('button', { name: /more|load/i })).toHaveCount(0);
  });

  test('nothing found: the query stays, with other languages’ counts and the whole list (§11.8.6)', async ({
    page,
  }) => {
    // Han characters of a Chinese title that no English entry, label or alias contains.
    const zhTitle = localeIndex('zh-Hans')
      .prompts.map((p) => p.title)
      .find((t) => t.includes('梅枝'));
    test.skip(!zhTitle, 'no matching Chinese sample in this build');
    await openPage(page, `/${en.pathPrefix}/search/?q=${encodeURIComponent('梅枝')}`);
    const help = page.locator('[data-no-results]');
    await expect(help.getByRole('heading')).toContainText('梅枝');
    const other = help.locator(`a[href="${BASE}/${zh.pathPrefix}/search/?q=${encodeURIComponent('梅枝')}"]`);
    await expect(other).toBeVisible();
    await expect(help.locator(`a[href="${BASE}/${en.pathPrefix}/prompts/"]`)).toBeVisible();
    await other.click();
    await expect(page.locator('[data-group="prompt"] li').first()).toContainText('梅枝');
  });

  test('a later query wins over an earlier one still on its way (§11.6.4)', async ({ page }) => {
    await page.route(INDEX, async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await openPage(page, `/${en.pathPrefix}/search/`);
    const input = page.locator('#search-field');
    await input.fill('neon');
    await input.fill('ink');
    await expect(page.locator('[data-search-status]')).toContainText('“ink”');
    const titles = await page.locator('[data-group] li').allTextContents();
    expect(titles.length).toBeGreaterThan(0);
    for (const t of titles.slice(0, 5)) expect(t.toLowerCase()).toMatch(/ink/);
  });

  test('a failed index load offers a retry; an index from another build offers a reload (§13.3)', async ({ page }) => {
    let fail = true;
    await page.route(INDEX, (route) => (fail ? route.fulfill({ status: 503, body: '' }) : route.continue()));
    await openPage(page, `/${en.pathPrefix}/search/?q=ink`);
    const alert = page.getByRole('main').getByRole('alert');
    await expect(alert).toContainText(message('en', 'search.error.body'));
    fail = false;
    await alert.getByRole('button', { name: message('en', 'search.error.retry') }).click();
    await expect(page.locator('[data-group="prompt"] li').first()).toBeVisible();

    await page.unrouteAll();
    await page.route(INDEX, async (route) => {
      const res = await route.fetch();
      const json = { ...(await res.json()), buildId: 'another-build' };
      await route.fulfill({ response: res, json });
    });
    await page.goto(`${BASE}/${en.pathPrefix}/search/?q=ink`);
    await expect(page.getByRole('main').getByRole('alert')).toContainText(message('en', 'search.error.stale'));
    await expect(page.getByRole('button', { name: message('en', 'search.error.reload') })).toBeVisible();
  });

  test('an input method composing pinyin does not search the syllables (§11.6.4)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'IME composition is driven through the Chrome DevTools Protocol');
    await openPage(page, `/${zh.pathPrefix}/search/`);
    const input = page.locator('#search-field');
    await input.focus();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: 'shuimo', selectionStart: 6, selectionEnd: 6 });
    await page.waitForTimeout(400);
    await expect(page.locator('[data-no-results]')).toHaveCount(0);
    await expect(page.locator('[data-search-status]')).toBeEmpty();
    await cdp.send('Input.insertText', { text: '水墨' });
    await expect(input).toHaveValue('水墨');
    await expect(page.locator('[data-group="prompt"] mark').first()).toHaveText('水墨');
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`axe (${scheme}): search page and the open panel`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await openPage(page, `/${en.pathPrefix}/search/?q=${encodeURIComponent(titleWord('en'))}`);
      await expect(page.locator('[data-group] li').first()).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
      await openPage(page, `/${en.pathPrefix}/prompts/`);
      await page.keyboard.press('/');
      await field(page).fill(titleWord('en'));
      await expect(options(page).first()).toBeVisible();
      expect(await seriousViolations(page, '[data-quick-search]')).toEqual([]);
    });
  }
});

test.describe('every built language', () => {
  for (const locale of BUILD.locales) {
    test(`${locale.code}: the panel and page speak the page’s language and find its entries`, async ({ page }) => {
      const prompts = localeIndex(locale.code).prompts;
      test.skip(prompts.length === 0, 'no prompts in this language');
      await openPage(page, `/${locale.pathPrefix}/search/`);
      await expect(page.locator('h1')).toHaveText(message(locale.code, 'search.page.title'));
      await expect(page.locator('#search-field')).toHaveAttribute(
        'placeholder',
        message(locale.code, 'search.panel.placeholder'),
      );
      const title = prompts[0]!.title;
      await page.locator('#search-field').fill(title);
      await expect(page.locator('[data-group="prompt"] li').first()).toContainText(title);
    });
  }
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('the header shows the search icon with its name, and the panel fills the screen', async ({ page }) => {
    await openPage(page, `/${en.pathPrefix}/prompts/`);
    await expect(launcher(page)).toHaveAccessibleName(new RegExp(message('en', 'search.open')));
    await launcher(page).tap();
    await expect(field(page)).toBeFocused();
    const box = await panel(page).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(388);
    await page.getByRole('button', { name: message('en', 'search.panel.close') }).tap();
    await expect(panel(page)).toHaveCount(0);
  });
});
