import { expect, test, type Locator, type Page } from '@playwright/test';
import { worksOnShow } from './support/home';
import { seriousViolations } from './support/a11y';
import { BASE, BUILD, homePath, message } from './support/artifact';
import { localeIndex, promptDetail } from './support/content';

// The home page in real browsers (design doc §11.8.1, §11.1.9, §16.2 首屏展示, §16.5 首屏吸引力,
// §17.3 step 4b): the work on show, its quote and "Copy prompt" on the first screen of a desktop
// and a phone without scrolling; lettered phrases framing their regions by pointer, keyboard and
// touch; "Another frame" stepping through the works on show; develop; the popup; accessibility.

const locale = BUILD.locales[0]!;
const code = locale.code;
const url = `${BASE}${homePath(locale)}`;

const onShow = worksOnShow(code);
const work = promptDetail(code, onShow[0]!);

const hero = (page: Page) => page.locator('[data-on-show]');
const heroImage = (page: Page) => hero(page).locator('figure img[alt]:not([alt=""])');
const phrase = (page: Page, letter: string) => hero(page).locator(`button[data-letter="${letter}"]`);
const box = (page: Page, letter: string) => hero(page).locator(`[id$="-box-${letter}"]`);
const copyButton = (page: Page) => hero(page).getByRole('button', { name: message(code, 'detail.copy.label') });
const another = (page: Page) => hero(page).getByRole('button', { name: message(code, 'home.hero.another') });

/** Waits until React has attached its handlers, so presses are handled. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const el = document.querySelector('[data-another], [data-on-show] button[data-letter]');
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  });

/** Top of "Copy prompt" in the document, so a scroll to the image does not count as a move. */
const copyTop = (page: Page) => copyButton(page).evaluate((el) => el.getBoundingClientRect().top + scrollY);

/** The whole element lies inside the viewport, with nothing scrolled. */
async function expectInFirstScreen(page: Page, target: Locator, what: string) {
  const viewport = page.viewportSize()!;
  const b = (await target.boundingBox())!;
  expect(b, `${what} is rendered`).toBeTruthy();
  expect(b.y, `${what} starts on the first screen`).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height, `${what} ends on the first screen`).toBeLessThanOrEqual(viewport.height);
  expect(b.x + b.width, `${what} fits the width`).toBeLessThanOrEqual(viewport.width);
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('the first screen shows the work, its label, the quote and both actions without scrolling', async ({ page }) => {
    await page.goto(url);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(heroImage(page)).toBeVisible();
    await expectInFirstScreen(page, heroImage(page), 'the work on show');
    await expectInFirstScreen(page, hero(page).locator('figcaption'), 'its label');
    await expectInFirstScreen(page, hero(page).locator('blockquote'), 'the prompt quote');
    await expectInFirstScreen(page, copyButton(page), '"Copy prompt"');
    await expectInFirstScreen(page, page.getByRole('heading', { level: 1 }), 'the title');
    // The image keeps its own ratio (§10.3), about 55–60 % of the width with its film (§11.8.1).
    const img = (await heroImage(page).boundingBox())!;
    expect(Math.abs(img.width / img.height - work.cover.width / work.cover.height)).toBeLessThan(0.02);
    const film = (await hero(page).locator('figure > div').first().boundingBox())!;
    expect(film.width / 1440).toBeGreaterThan(0.5);
    expect(film.width / 1440).toBeLessThan(0.62);
    // The next row peeks in at the bottom, so the page reads as having more (§11.8.1 更多展出).
    const more = (await page.locator('#home-more').boundingBox())!;
    expect(more.y).toBeLessThan(900);
  });

  test('pointing at a phrase frames its region and shows its note; leaving clears it', async ({ page }) => {
    const a = work.annotations[0]!;
    await page.goto(url);
    await hydrated(page);
    await phrase(page, a.letter).hover();
    await expect(box(page, a.letter)).toHaveAttribute('data-state', 'current');
    // Every note is in the caption, stacked in one cell; only the current one is shown.
    await expect(hero(page).locator('p[aria-hidden="true"] > [data-shown]')).toContainText(a.note);
    const describedBy = await phrase(page, a.letter).getAttribute('aria-describedby');
    await expect(page.locator(`[id="${describedBy}"]`)).toContainText(a.note);
    await page.mouse.move(5, 5);
    await expect(box(page, a.letter)).not.toHaveAttribute('data-state', 'current');
  });

  test('pointing at each phrase never moves "Copy prompt"', async ({ page }) => {
    // The hint and the notes share the caption's height (docs/home-ux-optimization-spec.md H-2).
    await page.goto(url);
    await hydrated(page);
    const before = await copyTop(page);
    for (const a of work.annotations) {
      await phrase(page, a.letter).hover();
      await expect(box(page, a.letter)).toHaveAttribute('data-state', 'current');
      expect(await copyTop(page), `"Copy prompt" with ${a.letter} current`).toBeCloseTo(before, 0);
    }
    await page.mouse.move(5, 5);
    await expect(hero(page).locator('[id*="-box-"][data-state="current"]')).toHaveCount(0);
    expect(await copyTop(page)).toBeCloseTo(before, 0);
  });

  test('the works on show fill one row, no smaller than the newest works', async ({ page }) => {
    // docs/home-ux-optimization-spec.md L-3, T-5: wrapped at 140 px they left 302 px empty.
    test.setTimeout(60_000);
    const failures: string[] = [];
    for (const viewport of DESKTOP_VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.goto(url);
      const m = await page.evaluate(() => {
        const section = (id: string) => document.getElementById(id)!.closest('section')!;
        const row = section('home-more').querySelector('ul')!;
        const more = [...row.querySelectorAll('li img')].map((img) => img.getBoundingClientRect());
        const latest = [...section('home-latest').querySelectorAll('li img')].map((img) => img.getBoundingClientRect());
        const box = row.getBoundingClientRect();
        return {
          count: more.length,
          rows: new Set(more.map((b) => Math.round(b.top))).size,
          gap: box.right - Math.max(...more.map((b) => b.right)),
          more: Math.min(...more.map((b) => b.height)),
          latest: Math.max(...latest.map((b) => b.height)),
        };
      });
      const at = `${viewport.width}×${viewport.height}`;
      if (m.count >= 4 && (m.rows !== 1 || Math.abs(m.gap) > 1))
        failures.push(`${at}: ${m.rows} row(s), ${Math.round(m.gap)} px left at the end`);
      if (viewport.width >= 1440 && m.more < m.latest)
        failures.push(`${at}: works on show ${Math.round(m.more)} px, newest works ${Math.round(m.latest)} px`);
    }
    expect(failures).toEqual([]);
  });

  test('rows that fill a desktop neither scroll, fade nor show scroll buttons', async ({ page }) => {
    // docs/home-ux-optimization-spec.md L-3: the last card's crop marks stuck out 11 px past the
    // filled "More on show" row, which then faded its last card and showed a button that did nothing.
    test.setTimeout(60_000);
    const failures: string[] = [];
    for (const viewport of DESKTOP_VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.goto(url);
      await hydrated(page);
      for (const id of ['home-more', 'home-uses']) {
        const state = await page.evaluate((heading) => {
          const scroller = document.getElementById(heading)!.closest('section')!.querySelector('ul')!;
          const root = scroller.parentElement!;
          return {
            overflow: getComputedStyle(scroller).overflowX,
            before: root.hasAttribute('data-more-before'),
            after: root.hasAttribute('data-more-after'),
            buttons: root.querySelectorAll('[data-scroll-button]').length,
          };
        }, id);
        if (state.overflow !== 'visible' || state.before || state.after || state.buttons)
          failures.push(`${viewport.width}×${viewport.height} #${id}: ${JSON.stringify(state)}`);
      }
    }
    expect(failures).toEqual([]);
    // The last work's crop marks show whole when it is pointed at.
    const last = page.locator('section:has(#home-more) li').last();
    await last.locator('a').hover();
    await expect(last.locator('[data-corner]').first()).toHaveCSS('opacity', '1');
    const marks = await last
      .locator('[data-corner]')
      .evaluateAll((corners) =>
        corners.map((c) => [Number(getComputedStyle(c).opacity), c.getBoundingClientRect().right] as const),
      );
    expect(marks.every(([opacity]) => opacity === 1)).toBe(true);
    expect(Math.max(...marks.map(([, right]) => right))).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test('the keyboard walks the phrases in reading order; Esc clears', async ({ page, browserName }) => {
    const [a, b] = work.annotations;
    await page.goto(url);
    await hydrated(page);
    await phrase(page, a!.letter).focus();
    await page.keyboard.press('Enter');
    await expect(box(page, a!.letter)).toHaveAttribute('data-state', 'current');
    if (b) {
      await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
      await expect(phrase(page, b.letter)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(box(page, b.letter)).toHaveAttribute('data-state', 'current');
    }
    await page.keyboard.press('Escape');
    await expect(hero(page).locator('[id*="-box-"][data-state="current"]')).toHaveCount(0);
  });

  test('"Copy prompt" copies the whole prompt, not just the quote', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only in Playwright');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(url);
    await hydrated(page);
    await copyButton(page).click();
    await expect(hero(page).getByRole('button', { name: message(code, 'detail.copy.done') })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(work.prompt.text.trim());
  });

  test('"Another frame" steps through the works on show, keeps focus and announces the work', async ({
    page,
  }, testInfo) => {
    test.skip(onShow.length < 2, 'one work on show');
    // Every configured work is exercised; give each additional rendering its own budget.
    test.setTimeout(testInfo.timeout + onShow.length * 2000);
    await page.goto(url);
    await hydrated(page);
    const title = await page.getByRole('heading', { level: 1 }).elementHandle();
    const search = page.locator('#home-search');
    await search.fill('sticker');
    for (let i = 1; i <= onShow.length; i++) {
      await another(page).click();
      const id = onShow[i % onShow.length]!;
      await expect(hero(page)).toHaveAttribute('data-on-show', id);
      await expect(another(page)).toBeFocused();
      const next = promptDetail(code, id);
      await expect(hero(page).locator('[aria-live="polite"]')).toHaveText(
        message(code, 'home.hero.showing', { frame: next.frameNumber, title: next.title }),
      );
      await expect(heroImage(page)).toHaveAttribute('alt', next.cover.alt);
    }
    expect(await title!.evaluate((heading) => heading === document.querySelector('main h1'))).toBe(true);
    await expect(search).toHaveValue('sticker');
    // Keys keep working on the new work's phrases.
    const first = promptDetail(code, onShow[0]!).annotations[0]!;
    await phrase(page, first.letter).hover();
    await expect(box(page, first.letter)).toHaveAttribute('data-state', 'current');
  });

  test('develop: the next work stays hidden until its file is whole, then surfaces over its preview', async ({
    page,
  }) => {
    test.skip(onShow.length < 2, 'one work on show');
    const next = promptDetail(code, onShow[1]!);
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    // Every size the srcset may pick is held; the thumbnail (the blurred preview) passes.
    const folder = next.cover.variants.detail!.key.split('/').slice(0, -1).join('/');
    await page.route(`**/${folder}/*`, async (route) => {
      if (!route.request().url().includes('-thumbnail-')) await held;
      await route.continue();
    });
    // The work is also in the row below, and WebKit counts an image in view there toward `load`,
    // which the held file would never fire: wait for the document and hydration instead.
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await another(page).click();
    await expect(heroImage(page)).toHaveAttribute('data-develop', 'pending');
    await expect(hero(page).locator('figure span[aria-hidden="true"] img')).toBeAttached(); // the blurred preview
    release();
    // Developed: the attribute goes and the preview is removed with it.
    await expect(heroImage(page)).not.toHaveAttribute('data-develop', /.+/, { timeout: 5000 });
    await expect(hero(page).locator('figure span[aria-hidden="true"] img')).toHaveCount(0);
    expect(await heroImage(page).evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  });

  test('a card link is named by its title and described by its summary and facts', async ({ page }) => {
    // docs/home-ux-optimization-spec.md S-2: the wrapper is a plain div, which ARIA does not let
    // be named, so the name and description sit on the link.
    await page.goto(url);
    const card = page.locator('section:has(#home-more) [data-save-scope]').first();
    const title = (await card.locator('[id$="-title"]').textContent())!;
    const summary = (await card.locator('[data-card-summary]').textContent())!;
    const link = card.getByRole('link');
    await expect(link).toHaveAccessibleName(title);
    await expect(link).toHaveAccessibleDescription(new RegExp(`^${summary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    expect(await card.getAttribute('aria-labelledby')).toBeNull();
    expect(await card.getAttribute('aria-describedby')).toBeNull();
  });

  test('a template card link is named by its title and described by its use and field count', async ({ page }) => {
    // docs/home-ux-optimization-spec.md S-2a: named by its content it read the title, count,
    // use and excerpt as one name. The excerpt is left out of the description.
    await page.goto(url);
    const card = page.locator('section:has(#home-templates) li[data-entry]').first();
    test.skip(!(await card.count()), 'no templates on the home page');
    const title = (await card.locator('[id$="-title"]').textContent())!;
    const summary = (await card.locator('[data-template-summary]').textContent())!;
    const fields = (await card.locator('[id$="-fields"]').textContent())!;
    const link = card.getByRole('link');
    await expect(link).toHaveAccessibleName(title);
    await expect(link).toHaveAccessibleDescription(`${summary} ${fields}`);
  });

  test('works on the page open in the detail popup at their own address; Esc returns', async ({ page }) => {
    await page.goto(url);
    await hydrated(page);
    const card = page.locator('section:has(#home-more) li a[href*="/prompts/"]').first();
    const href = (await card.getAttribute('href'))!;
    await card.click();
    await expect(page.locator('dialog[data-popup]')).toHaveAttribute('open', '');
    expect(new URL(page.url()).pathname).toBe(href);
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[data-popup]')).not.toHaveAttribute('open', '');
    expect(new URL(page.url()).pathname).toBe(url);
  });

  for (const scheme of ['light', 'dark'] as const)
    test(`no serious accessibility problems (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(url);
      await hydrated(page);
      expect(await seriousViolations(page)).toEqual([]);
    });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('the first screen shows the work, the quote and "Copy prompt" without scrolling', async ({ page }) => {
    await page.goto(url);
    await expect(heroImage(page)).toBeVisible();
    await expectInFirstScreen(page, heroImage(page), 'the work on show');
    await expectInFirstScreen(page, copyButton(page), '"Copy prompt"');
    const quote = (await hero(page).locator('blockquote').boundingBox())!;
    expect(quote.y + 40, 'the quote starts on the first screen').toBeLessThan(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('tapping a phrase shows only its box, with its letter at the corner', async ({ page }) => {
    const a = work.annotations.at(-1)!;
    await page.goto(url);
    await hydrated(page);
    await phrase(page, a.letter).tap();
    await expect(box(page, a.letter)).toHaveAttribute('data-state', 'current');
    await expect(box(page, a.letter)).toBeInViewport();
    for (const other of work.annotations.filter((x) => x.letter !== a.letter))
      await expect(box(page, other.letter)).toBeHidden();
  });

  test('tapping each phrase never moves "Copy prompt"', async ({ page }) => {
    await page.goto(url);
    await hydrated(page);
    const before = await copyTop(page);
    for (const a of work.annotations) {
      await phrase(page, a.letter).tap();
      await expect(box(page, a.letter)).toHaveAttribute('data-state', 'current');
      expect(await copyTop(page), `"Copy prompt" with ${a.letter} current`).toBeCloseTo(before, 0);
    }
  });

  test('the newest works come about two to a row, wide enough for their titles', async ({ page }) => {
    // docs/home-ux-optimization-spec.md S-1: three to a row made 112–128 px cards on a 390 px phone.
    // Rows of three only happen with portraits narrower than 3:4.
    await page.goto(url);
    const cards = await page.locator('section:has(#home-latest) [data-save-scope]').evaluateAll((els) =>
      els.map((el) => {
        const cs = getComputedStyle(el);
        const b = el.getBoundingClientRect();
        return {
          top: Math.round(b.top),
          width: b.width,
          ratio: parseFloat(cs.getPropertyValue('--w')) / parseFloat(cs.getPropertyValue('--h')),
        };
      }),
    );
    const rows = Map.groupBy(cards, (card) => card.top);
    const crowded = [...rows.values()].filter((row) => row.length > 2 && row.some((card) => card.ratio >= 0.75));
    expect(crowded, 'rows of three or more').toEqual([]);
    const narrowest = Math.min(...cards.filter((card) => card.ratio >= 0.75).map((card) => card.width));
    expect(narrowest).toBeGreaterThanOrEqual(150);
  });

  test('the featured row scrolls sideways on a phone, with its fade and a working button', async ({ page }) => {
    await page.goto(url);
    await hydrated(page);
    const scroller = page.locator('section:has(#home-more) ul');
    const root = scroller.locator('xpath=..');
    expect(await scroller.evaluate((el) => getComputedStyle(el).overflowX)).toBe('auto');
    await expect(root).toHaveAttribute('data-more-after', 'true');
    await root.locator('[data-scroll-button]').tap();
    await expect.poll(() => scroller.evaluate((el) => Math.abs(el.scrollLeft))).toBeGreaterThan(0);
    await expect(root).toHaveAttribute('data-more-before', 'true');
  });

  test('collection covers hold their place before their images load', async ({ page }) => {
    // docs/home-ux-optimization-spec.md L-1: the frames were 0 × 0 until the images arrived.
    const covers = localeIndex(code)
      .collections.slice(0, 2)
      .map((c) => c.cover);
    test.skip(!covers.length, 'no collections on the home page');
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    for (const cover of covers) {
      const folder = cover.variants.detail!.key.split('/').slice(0, -1).join('/');
      await page.route(`**/${folder}/*`, async (route) => {
        await held;
        await route.continue();
      });
    }
    // The held files would never fire `load`.
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const section = page.locator('section:has(#home-collections)');
    await section.scrollIntoViewIfNeeded();
    const frames = section.locator('figure > span');
    await expect(frames).toHaveCount(covers.length);
    for (const frame of await frames.all()) {
      const b = (await frame.boundingBox())!;
      expect(b.width, 'the frame has its width before the image').toBeGreaterThan(0);
      expect(b.height, 'the frame has its height before the image').toBeGreaterThan(0);
    }
    const before = (await section.boundingBox())!.height;
    release();
    await expect
      .poll(() =>
        section
          .locator('figure img')
          .evaluateAll((imgs) =>
            imgs.every((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0),
          ),
      )
      .toBe(true);
    expect((await section.boundingBox())!.height, 'the section keeps its height').toBeCloseTo(before, 0);
  });

  test('use cases form one row that scrolls sideways and Tab reaches the last one', async ({ page, browserName }) => {
    // docs/home-ux-optimization-spec.md L-2: wrapped, eight covers made five ragged rows.
    await page.goto(url);
    await hydrated(page);
    const tiles = page.locator('[data-use-case]');
    const count = await tiles.count();
    test.skip(count < 2, 'fewer than two use cases');
    const tops = await tiles.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'every use case on one row').toBe(1);
    const heights = await tiles.evaluateAll((els) =>
      els.map((el) => Math.round(el.querySelector('img')!.getBoundingClientRect().height)),
    );
    expect(new Set(heights).size, 'every cover the same height').toBe(1);
    const list = page.locator('section:has(#home-uses) ul');
    expect(await list.evaluate((ul) => ul.scrollWidth > ul.clientWidth), 'the row scrolls').toBe(true);
    const tab = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
    await tiles.first().focus();
    for (let i = 1; i < count; i++) await page.keyboard.press(tab);
    await expect(tiles.last()).toBeFocused();
    await expect(tiles.last()).toBeInViewport();
  });

  test('copy, opening the full work and switching frames keep their keyboard order', async ({ page, browserName }) => {
    test.skip(onShow.length < 2, 'one work on show');
    await page.goto(url);
    await hydrated(page);
    const tab = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
    const open = hero(page).locator('a[data-prefetch]');

    await copyButton(page).focus();
    await page.keyboard.press(tab);
    await expect(open).toBeFocused();
    await expect(open).toHaveAttribute('href', `${BASE}${work.path}`);
    await page.keyboard.press(tab);
    await expect(another(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(hero(page)).toHaveAttribute('data-on-show', onShow[1]!);
    await expect(another(page)).toBeFocused();
  });
});

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  test('the next work shows as soon as it loads, with no develop', async ({ page }) => {
    test.skip(onShow.length < 2, 'one work on show');
    await page.goto(url);
    await hydrated(page);
    await another(page).click();
    await expect(heroImage(page)).not.toHaveAttribute('data-develop', /.+/);
    expect(await heroImage(page).evaluate((img) => getComputedStyle(img).opacity)).toBe('1');
  });
});

// The first screen in the area a browser actually shows, in several languages (design doc §16.5
// 首屏吸引力, docs/home-ux-optimization-spec.md §2). 390 × 844 is a phone's screen; between
// Safari's bars a page sees about 390 × 664. A 1366 × 768 laptop leaves about 1366 × 650.
const DESKTOP_VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 650 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
];
const PHONE_VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 390, height: 664 },
  { width: 412, height: 839 },
];
/** A small phone: the work and the start of its quote, with "Copy prompt" allowed below. */
const SMALL_PHONE = { width: 320, height: 568 };
// Latin, CJK, long German words, and right-to-left Arabic with its taller lines.
const MATRIX_LOCALES = ['en', 'zh-Hans', 'de', 'ja', 'ar'].flatMap((c) => BUILD.locales.filter((l) => l.code === c));

/** Each target that is not wholly inside the viewport, as a readable line; none passes. */
async function outsideFirstScreen(page: Page, targets: [string, Locator][]): Promise<string[]> {
  const { width, height } = page.viewportSize()!;
  const out: string[] = [];
  for (const [what, target] of targets) {
    const b = await target.boundingBox();
    if (!b) out.push(`${width}×${height}: ${what} is not rendered`);
    else if (b.y < 0 || b.y + b.height > height || b.x < 0 || b.x + b.width > width)
      out.push(`${width}×${height}: ${what} spans y ${Math.round(b.y)}–${Math.round(b.y + b.height)}`);
  }
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    out.push(`${width}×${height}: the page scrolls sideways`);
  return out;
}

/** Loads the home page at a viewport once fonts are in, since they set the heading's lines. */
async function openAt(page: Page, at: string, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(at);
  await page.evaluate(() => document.fonts.ready);
}

test.describe('first screen in visible viewports', () => {
  for (const l of MATRIX_LOCALES) {
    const at = `${BASE}${homePath(l)}`;
    const copy = (page: Page) => hero(page).getByRole('button', { name: message(l.code, 'detail.copy.label') });
    const required = (page: Page): [string, Locator][] => [
      ['the work on show', heroImage(page)],
      ['its label', hero(page).locator('figcaption')],
      ['the prompt quote', hero(page).locator('blockquote')],
      ['"Copy prompt"', copy(page)],
    ];

    test(`${l.code}: desktops show the work, its quote, "Copy prompt" and the title`, async ({ page }) => {
      test.skip(!worksOnShow(l.code).length, 'no work on show');
      test.setTimeout(60_000);
      const failures: string[] = [];
      for (const viewport of DESKTOP_VIEWPORTS) {
        await openAt(page, at, viewport);
        failures.push(
          ...(await outsideFirstScreen(page, [
            ...required(page),
            ['the title', page.getByRole('heading', { level: 1 })],
          ])),
        );
        // The work outweighs the heading, also on a short window (H-3).
        const img = (await heroImage(page).boundingBox())!;
        const h1 = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
        if (img.width * img.height < h1.width * h1.height)
          failures.push(`${viewport.width}×${viewport.height}: the title is larger than the work`);
      }
      expect(failures).toEqual([]);
    });

    test.describe(() => {
      test.use({ hasTouch: true });

      test(`${l.code}: phones show the work, its quote and "Copy prompt"`, async ({ page }) => {
        test.skip(!worksOnShow(l.code).length, 'no work on show');
        test.setTimeout(60_000);
        const failures: string[] = [];
        for (const viewport of PHONE_VIEWPORTS) {
          await openAt(page, at, viewport);
          failures.push(...(await outsideFirstScreen(page, required(page))));
        }
        await openAt(page, at, SMALL_PHONE);
        failures.push(...(await outsideFirstScreen(page, required(page).slice(0, 2))));
        const quote = (await hero(page).locator('blockquote').boundingBox())!;
        if (quote.y + 24 > SMALL_PHONE.height) failures.push('320×568: the quote starts below the first screen');
        expect(failures).toEqual([]);
      });
    });
  }
});

for (const l of BUILD.locales)
  test(`${l.code}: the home page's text comes from its own catalog`, async ({ page }) => {
    await page.goto(`${BASE}${homePath(l)}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(message(l.code, 'home.hero.title'));
    await expect(page.locator('#home-search')).toHaveAccessibleName(message(l.code, 'home.search.label'));
    if (worksOnShow(l.code).length > 1)
      await expect(page.getByRole('button', { name: message(l.code, 'home.hero.another') })).toBeVisible();
  });
