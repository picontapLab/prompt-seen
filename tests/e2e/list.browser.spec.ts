import { expect, test, type Page } from '@playwright/test';
import { seriousViolations } from './support/a11y';
import { BASE, BUILD, message } from './support/artifact';
import { feedIndex, feedPage, hasBand, pagePromptIds } from './support/content';

// The Prompt list in real browsers (design doc §11.1.4, §11.8.2, §16.2 "列表与连续加载"
// "原比例显示", §17.3 step 3a): automatic loading with no button, the address following the page
// in view, loading earlier pages, return restore, retry after a failure, justified rows at the
// original ratio, filters with counts, intent prefetch and accessibility.

const locale = BUILD.locales[0]!;
const code = locale.code;
const index = feedIndex(code);
const listUrl = (n = 1) => `${BASE}/${locale.pathPrefix}/prompts/${n > 1 ? `page/${n}/` : ''}`;
const articles = (page: Page) => page.locator('[role="feed"] > article');
const feedState = (page: Page) => page.locator('[data-feed-state]');

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Waits until React has attached its handlers, so scroll and clicks are handled. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const el = document.querySelector('[role="feed"]');
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  });

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('scrolling loads every batch by itself; the address follows the page in view (§9.4)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(listUrl());
    await hydrated(page);
    await expect(page.getByRole('button', { name: /load more/i })).toHaveCount(0);
    await expect(page.locator('footer')).toBeHidden(); // waits for the end of the list

    const seenPaths = new Set<string>();
    page.on('framenavigated', () => seenPaths.add(new URL(page.url()).pathname));
    let lastPath = '';
    for (let i = 0; i < 80; i += 1) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(80);
      const path = await page.evaluate(() => location.pathname);
      if (path !== lastPath) seenPaths.add((lastPath = path));
      if (await page.locator('[data-feed-end]').count()) break;
    }
    await expect(page.locator('[data-feed-end]')).toHaveText(
      message(code, 'feed.status.end', { total: String(index.items.length) }),
    );
    // Every page's address was shown on the way down (replaceState, no new history entries).
    for (let n = 2; n < index.pageCount; n += 1) expect(seenPaths).toContain(listUrl(n));
    expect(await page.evaluate(() => history.length)).toBeLessThanOrEqual(2);

    // The feed pattern: positions run 1…n without gaps; nothing is busy at the end.
    const positions = await articles(page).evaluateAll((els) =>
      els.map((e) => Number(e.getAttribute('aria-posinset'))),
    );
    expect(positions).toEqual(positions.map((_, i) => i + 1));
    const size = Number(await articles(page).first().getAttribute('aria-setsize'));
    expect(size).toBe(positions.length);
    await expect(page.locator('[role="feed"]')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('footer')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a list opened at a later page loads earlier pages above without moving the view', async ({ page }) => {
    test.skip(index.pageCount < 3, 'needs three pages');
    // Hold page 2 until the position of the work in view has been measured.
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    const requested = new Promise<void>((resolve) =>
      page.route('**/feed/latest/2.json', async (route) => {
        resolve();
        await held;
        await route.continue();
      }),
    );
    await page.goto(listUrl(3));
    await hydrated(page);
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(200);
    await page.mouse.wheel(0, -300);
    await requested;
    const key = await page.evaluate(() => {
      const els = [...document.querySelectorAll<HTMLElement>('[role="feed"] > [data-key]')];
      return els.find((el) => el.getBoundingClientRect().bottom > 120)!.dataset.key!;
    });
    const work = page.locator(`[role="feed"] > [data-key="${key}"]`);
    const before = await work.evaluate((el) => el.getBoundingClientRect().top);
    release();
    await expect
      .poll(() => articles(page).first().getAttribute('data-entry'))
      .not.toBe(pagePromptIds(feedPage(code, 3))[0]);
    expect(pagePromptIds(feedPage(code, 2))).toContain(await articles(page).first().getAttribute('data-entry'));
    await page.waitForTimeout(300);
    const after = await work.evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(after - before), 'the work in view stays put').toBeLessThan(8);
  });

  test('returning from a detail page restores the batches and the position (§11.6.1)', async ({
    page,
    browserName,
  }) => {
    await page.goto(listUrl());
    await hydrated(page);
    for (let i = 0; i < 8; i += 1) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(100);
    }
    await expect(feedState(page)).toHaveAttribute('data-feed-state', 'idle');
    const loaded = await articles(page).count();
    expect(loaded, 'more than one batch is loaded').toBeGreaterThan(pagePromptIds(feedPage(code, 1)).length + 1);
    const card = page.locator('[role="feed"] > article:not([data-interlude])');
    const target = card.nth(Math.floor((await card.count()) * 0.7));
    await target.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(200);
    const id = await target.getAttribute('data-entry');
    const top = await target.evaluate((el) => el.getBoundingClientRect().top);
    // A plain click on the link where it is: Playwright's own click would scroll it first.
    await Promise.all([
      page.waitForURL(/\/prompts\/(?!page\/)[^/]+\/$/),
      target
        .locator('a')
        .first()
        .evaluate((a) => (a as HTMLElement).click()),
    ]);
    await page.goBack();
    await hydrated(page);
    // The batches come back; one more may follow, since the spot is near the end of them.
    await expect.poll(() => articles(page).count(), { timeout: 5000 }).toBeGreaterThanOrEqual(loaded);
    const restored = page.locator(`[role="feed"] > article[data-entry="${id}"]:not([data-interlude])`);
    await expect
      .poll(async () => Math.abs((await restored.evaluate((el) => el.getBoundingClientRect().top)) - top), {
        message: `${browserName}: the work keeps its place`,
      })
      .toBeLessThan(40);
  });

  test('a failed batch shows a retry; retrying loads it (§11.8.2 失败)', async ({ page }) => {
    test.skip(index.pageCount < 2, 'needs two pages');
    // The first request for page 2 fails; the next one goes through.
    await page.route('**/feed/latest/2.json', (route) => route.abort(), { times: 1 });
    await page.goto(listUrl());
    await hydrated(page);
    for (
      let i = 0;
      i < 20 && !(await page.getByRole('button', { name: message(code, 'feed.status.retry') }).count());
      i += 1
    ) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(100);
    }
    const retry = page.getByRole('button', { name: message(code, 'feed.status.retry') });
    await expect(retry).toBeVisible();
    const before = await articles(page).count();
    // At the very end of the page the status line can still settle while the view scrolls to it.
    await retry.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await retry.click();
    await expect.poll(() => articles(page).count()).toBeGreaterThan(before);
  });

  test('justified rows keep each work whole at its own ratio, rows level, nothing shifting', async ({ page }) => {
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(listUrl());
      await hydrated(page);
      const report = await page.evaluate(async () => {
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
            if (!e.hadRecentInput) cls += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
        await new Promise((r) => setTimeout(r, 600));
        const cards = [...document.querySelectorAll<HTMLElement>('[role="feed"] > article:not([data-interlude])')];
        const rows = new Map<number, number[]>();
        const ratios: number[] = [];
        for (const c of cards) {
          const img = c.querySelector('img')!;
          const box = img.getBoundingClientRect();
          const natural = Number(img.getAttribute('width')) / Number(img.getAttribute('height'));
          ratios.push(Math.abs(box.width / box.height - natural) / natural);
          const key = Math.round(box.top + scrollY);
          rows.set(key, [...(rows.get(key) ?? []), box.height]);
        }
        const unlevel = [...rows.values()].map((h) => Math.max(...h) - Math.min(...h));
        return {
          cls,
          worstRatio: Math.max(...ratios),
          worstRow: Math.max(...unlevel),
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      expect(report.worstRatio, `${width}px: image ratio`).toBeLessThan(0.02);
      expect(report.worstRow, `${width}px: row heights`).toBeLessThanOrEqual(1);
      expect(report.overflow, `${width}px: horizontal overflow`).toBeLessThanOrEqual(0);
      expect(report.cls, `${width}px: layout shift`).toBeLessThan(0.1);
    }
  });

  test('a style filter narrows the list, folds the band and keeps counts honest', async ({ page }) => {
    const style = index.styles.find((s) => index.items.filter((f) => f.s.includes(s.id)).length >= 2)!;
    const expected = index.items.filter((f) => f.s.includes(style.id)).map((f) => f.id);
    await page.goto(listUrl());
    await hydrated(page);
    await page.locator('[role="group"] button', { hasText: style.label }).click();
    await expect(page).toHaveURL(new RegExp(`#style=${style.id}$`));
    await expect(feedState(page)).toHaveAttribute('data-feed-state', 'idle');
    const shown = await page
      .locator('[role="feed"] > article')
      .evaluateAll((els) =>
        els
          .filter((e) => !e.hasAttribute('data-interlude') || e.getAttribute('data-reason') === 'extreme')
          .map((e) => e.getAttribute('data-entry')),
      );
    expect(shown.slice(0, 24)).toEqual(expected.slice(0, 24));
    if (hasBand(code)) await expect(page.locator('[data-band]')).toBeHidden();

    // Clearing restores the newest-first list and the band.
    await page
      .getByRole('button', { name: message(code, 'feed.filters.clear') })
      .first()
      .click();
    await expect(page).toHaveURL(listUrl());
    if (hasBand(code)) await expect(page.locator('[data-band]')).toBeVisible();
  });

  test('the use and shape panel offers counted chips and shows its result count', async ({ page }) => {
    await page.goto(listUrl());
    await hydrated(page);
    await page.getByRole('button', { name: message(code, 'feed.filters.panel') }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const chip = dialog.getByRole('button', { name: new RegExp(message(code, 'feed.filters.shapes.square')) });
    await chip.click();
    const squares = index.items.filter((f) => f.r === 'square').length;
    await expect(dialog.getByRole('button', { name: new RegExp(`${squares}`) }).last()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#shape=square$/);
  });

  // The sort list's code loads when the visitor reaches for it (§16.4): the control is a plain
  // button until then, and the first press or ↑ ↓ opens the real list with focus in it.
  const sortControl = (page: Page) => page.getByRole('button', { name: message(code, 'feed.filters.sort') });

  test('the sort list opens on the first press and sorts by featured', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(listUrl());
    await hydrated(page);
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await sortControl(page).click();
    const list = page.getByRole('listbox');
    await expect(list).toBeVisible();
    await list.getByRole('option', { name: message(code, 'feed.filters.featured') }).click();
    await expect(page).toHaveURL(/#sort=featured$/);
    await expect(list).toBeHidden();
    await expect(sortControl(page)).toContainText(message(code, 'feed.filters.featured'));
    await expect(sortControl(page)).toBeFocused();
    expect(errors).toEqual([]);
  });

  test('the sort list opens from the keyboard and Esc returns focus to it', async ({ page }) => {
    await page.goto(listUrl());
    await hydrated(page);
    await sortControl(page).focus();
    await page.keyboard.press('ArrowDown');
    const list = page.getByRole('listbox');
    await expect(list).toBeVisible();
    await expect(list.getByRole('option', { name: message(code, 'feed.filters.latest') })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await expect(sortControl(page)).toBeFocused();
    await expect(page).toHaveURL(listUrl());
  });

  test('resting on a card prefetches its popup data, not the page or large image', async ({ page }) => {
    await page.goto(listUrl());
    await hydrated(page);
    const card = articles(page)
      .filter({ hasNot: page.locator('[data-interlude]') })
      .nth(2);
    const slug = (await card.locator('a').first().getAttribute('href'))!.split('/').filter(Boolean).pop();
    const request = page.waitForRequest((r) => r.url().endsWith(`/generated/${code}/prompts/${slug}.json`), {
      timeout: 3000,
    });
    await card.locator('img').hover();
    await request;
  });

  for (const scheme of ['light', 'dark'] as const)
    test(`no serious accessibility problems (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(listUrl());
      await hydrated(page);
      expect(await seriousViolations(page)).toEqual([]);
    });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('one Filters button opens every condition with a live result count', async ({ page }) => {
    await page.goto(listUrl());
    await hydrated(page);
    await expect(page.locator('[role="group"][aria-label]').first()).toBeHidden();
    await page.getByRole('button', { name: message(code, 'feed.filters.open'), exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('group', { name: message(code, 'feed.filters.style') })).toBeVisible();
    const total = index.items.length;
    await expect(dialog.getByRole('button', { name: new RegExp(String(total)) }).last()).toBeVisible();
  });
});

for (const l of BUILD.locales)
  test(`${l.code}: the list's text comes from its own catalog`, async ({ page }) => {
    await page.goto(`${BASE}/${l.pathPrefix}/prompts/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(message(l.code, 'feed.title'));
    await expect(page.locator('[role="feed"]')).toHaveAttribute('aria-label', message(l.code, 'feed.feed.label'));
    await expect(feedState(page)).toBeAttached();
  });
