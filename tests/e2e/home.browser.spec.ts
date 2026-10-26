import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { parse } from 'yaml';
import { featuredOrder } from '../../src/modules/home/featured';
import { seriousViolations } from './support/a11y';
import { BASE, BUILD, message, ROOT } from './support/artifact';
import { feedIndex, localeIndex, promptDetail } from './support/content';

// The home page in real browsers (design doc §11.8.1, §11.1.9, §16.2 首屏展示, §16.5 首屏吸引力,
// §17.3 step 4b): the work on show, its quote and "Copy prompt" on the first screen of a desktop
// and a phone without scrolling; lettered phrases framing their regions by pointer, keyboard and
// touch; "Another frame" stepping through the works on show; develop; the popup; accessibility.

const locale = BUILD.locales[0]!;
const code = locale.code;
const url = `${BASE}/${locale.pathPrefix}/`;
const site = parse(fs.readFileSync(path.join(ROOT, 'content/site.yaml'), 'utf8')) as {
  home: { featured: { prompt: string; from?: string }[] };
};

function worksOnShow(c: string): string[] {
  const prompts = new Map(localeIndex(c).prompts.map((p) => [p.id, p]));
  const today = new Date().toISOString().slice(0, 10);
  const configured = featuredOrder(site.home.featured, today).filter((id) => prompts.get(id)?.annotated);
  if (configured.length) return configured;
  const stand = feedIndex(c).featured.find((id) => prompts.get(id)?.annotated) ?? localeIndex(c).prompts[0]?.id;
  return stand ? [stand] : [];
}
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
    await expect(hero(page).locator('p[aria-hidden="true"]', { hasText: a.note })).toBeVisible();
    const describedBy = await phrase(page, a.letter).getAttribute('aria-describedby');
    await expect(page.locator(`[id="${describedBy}"]`)).toContainText(a.note);
    await page.mouse.move(5, 5);
    await expect(box(page, a.letter)).not.toHaveAttribute('data-state', 'current');
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

  test('"Another frame" steps through the works on show, keeps focus and announces the work', async ({ page }) => {
    test.skip(onShow.length < 2, 'one work on show');
    await page.goto(url);
    await hydrated(page);
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

for (const l of BUILD.locales)
  test(`${l.code}: the home page's text comes from its own catalog`, async ({ page }) => {
    await page.goto(`${BASE}/${l.pathPrefix}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(message(l.code, 'home.hero.title'));
    await expect(page.locator('#home-search')).toHaveAccessibleName(message(l.code, 'home.search.label'));
    if (worksOnShow(l.code).length > 1)
      await expect(page.getByRole('button', { name: message(l.code, 'home.hero.another') })).toBeVisible();
  });
