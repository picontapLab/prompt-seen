import { expect, test, type Page } from '@playwright/test';
import { seriousViolations } from './support/a11y';
import { BASE, BUILD, message } from './support/artifact';
import { samplePrompt, sampleTemplate } from './support/content';

// Prompt and template details in real browsers (design doc §11.8.3, §11.1.9, §16.2, §16.5,
// §17.3 step 2): first screen, copy, annotations by keyboard, pointer and touch, the mobile
// action bar, language switching and accessibility.

const [first] = BUILD.locales;
const code = first!.code;
const detail = samplePrompt(code);
const url = `${BASE}${detail.path}`;
const annotated = detail.annotations.length > 0;

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** The sheet's copy button, by id: its accessible name changes once it has copied. */
const sheetCopy = (page: Page) => page.locator('section button[id$="-copy"]');

/** Waits until React has attached its handlers to an element, so a click is handled. */
const hydrated = (page: Page, selector: string) =>
  page.waitForFunction((s) => {
    const el = document.querySelector(s);
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  }, selector);
const promptBlock = (page: Page) => page.locator('[id$="-prompt"]').first();
const box = (page: Page, letter: string) => page.locator(`[id$="-box-${letter}"]`);
const phrase = (page: Page, letter: string) => page.locator(`button[data-letter="${letter}"]`);

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the first screen shows the image, title, summary, the prompt opening and copy (§16.5)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(url);
    const inView = async (selector: ReturnType<Page['locator']>, minVisible = 1) => {
      const b = await selector.boundingBox();
      expect(b, 'element is rendered').not.toBeNull();
      expect(b!.y, 'starts on the first screen').toBeLessThan(800);
      expect(Math.min(b!.y + b!.height, 800) - Math.max(b!.y, 0), 'visible height').toBeGreaterThanOrEqual(minVisible);
    };
    await inView(page.locator('img[fetchpriority="high"]'), 200);
    await inView(page.getByRole('heading', { level: 1, name: detail.title }));
    await inView(page.getByText(detail.description, { exact: true }));
    const lineHeight = await promptBlock(page).evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    await inView(promptBlock(page), Math.min(4 * lineHeight, (await promptBlock(page).boundingBox())!.height));
    const copy = (await sheetCopy(page).boundingBox())!;
    expect(copy.y + copy.height).toBeLessThanOrEqual(800);
    expect(errors).toEqual([]);
  });

  test('copy puts exactly the prompt on the clipboard and says so in place', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only in Playwright');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(url);
    await hydrated(page, 'section button[id$="-copy"]');
    const button = sheetCopy(page);
    const before = (await button.boundingBox())!.width;
    await button.click();
    await expect(button).toHaveAttribute('data-copy-state', 'done');
    expect((await button.boundingBox())!.width).toBe(before);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(detail.prompt.text.trim());
  });

  test('annotations: pointing at a phrase frames its region; the note describes the phrase', async ({ page }) => {
    test.skip(!annotated, 'the sample prompt has no annotations');
    await page.goto(url);
    const a = detail.annotations.at(-1)!;
    await phrase(page, a.letter).hover();
    await expect(box(page, a.letter)).toHaveAttribute('data-state', 'current');
    await expect(phrase(page, a.letter)).toHaveAttribute('aria-pressed', 'true');
    const describedBy = await phrase(page, a.letter).getAttribute('aria-describedby');
    await expect(page.locator(`[id="${describedBy}"]`)).toContainText(a.note);
    await page.mouse.move(5, 5);
    await expect(box(page, a.letter)).not.toHaveAttribute('data-state', 'current');
  });

  test('annotations: the keyboard walks the phrases in reading order and Esc clears', async ({ page, browserName }) => {
    test.skip(!annotated, 'the sample prompt has no annotations');
    await page.goto(url);
    const [a, b] = detail.annotations;
    await phrase(page, a!.letter).focus();
    await page.keyboard.press('Enter');
    await expect(box(page, a!.letter)).toHaveAttribute('data-state', 'current');
    if (b) {
      // WebKit on macOS tabs to buttons with Option held, as Safari does by default.
      await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
      await expect(phrase(page, b.letter)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(box(page, b.letter)).toHaveAttribute('data-state', 'current');
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('[id*="-box-"][data-state="current"]')).toHaveCount(0);
  });

  test('copying the text by hand gives the prompt alone, without annotation letters', async ({ page }) => {
    await page.goto(url);
    const selected = await promptBlock(page).evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      return selection.toString();
    });
    expect(selected.trim()).toBe(detail.prompt.text.trim());
  });

  test('the language switch keeps the prompt when it has a version in that language', async ({ page }) => {
    const target = BUILD.locales.find((l) => l.code !== code && detail.alternates.some((a) => a.locale === l.code));
    test.skip(!target, 'no other built version of the sample prompt');
    await page.goto(url);
    const label = message(code, 'shell.language.label');
    await page
      .getByRole('banner')
      .getByRole('button', { name: `${label}: ${first!.nativeName}` })
      .click();
    await page.getByRole('option', { name: new RegExp(target!.nativeName) }).click();
    const alt = detail.alternates.find((a) => a.locale === target!.code)!;
    await expect(page).toHaveURL(`${BASE}${alt.path}`);
    await expect(page.locator('html')).toHaveAttribute('lang', target!.htmlLang);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`axe (${scheme}): prompt and template details`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(url);
      if (annotated) await phrase(page, detail.annotations[0]!.letter).hover();
      expect(await seriousViolations(page)).toEqual([]);
      const template = sampleTemplate(code);
      if (template) {
        await page.goto(`${BASE}${template.path}`);
        expect(await seriousViolations(page)).toEqual([]);
      }
    });
  }
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('tapping a phrase shows its box; the action bar stands in for the sheet copy', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(url);
    const bar = page.getByRole('group', { name: message(code, 'detail.actions.label') });
    await hydrated(page, 'section button[id$="-copy"]');
    // Copy stays one tap away: the bar appears whenever the sheet's own button is off screen.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('button', { name: message(code, 'detail.copy.label') })).toBeVisible();
    await sheetCopy(page).scrollIntoViewIfNeeded();
    await expect(bar).toBeHidden();
    if (annotated) {
      const a = detail.annotations[0]!;
      await phrase(page, a.letter).tap();
      await expect(box(page, a.letter)).toHaveAttribute('data-state', 'current');
      await expect(box(page, a.letter)).toBeInViewport();
      // Phones show the current box only (§11.1.9).
      for (const other of detail.annotations.slice(1)) await expect(box(page, other.letter)).toBeHidden();
    }
    expect(errors).toEqual([]);
  });

  test('axe: prompt detail on a phone', async ({ page }) => {
    await page.goto(url);
    expect(await seriousViolations(page)).toEqual([]);
  });
});

const rtl = BUILD.locales.find((l) => l.direction === 'rtl');
test('right-to-left: the page mirrors, the prompt and the image coordinates do not', async ({ page }) => {
  test.skip(!rtl, 'no right-to-left locale in this build');
  const d = samplePrompt(rtl!.code);
  // A hydration mismatch (React #418) re-renders the page under the test; report it as such.
  const errors = watchErrors(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE}${d.path}`);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await promptBlock(page).evaluate((el) => getComputedStyle(el).direction)).toBe('ltr');
  // The stage sits on the right in a right-to-left page.
  const stage = (await page.locator('img[fetchpriority="high"]').boundingBox())!;
  const title = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
  expect(stage.x).toBeGreaterThan(title.x);
  if (d.annotations.length) {
    const a = d.annotations[0]!;
    // Reference comparisons can make the image container narrow even on a desktop. Only the
    // current annotation is shown there, so activate it before measuring its physical position.
    await hydrated(page, `button[data-letter="${a.letter}"]`);
    await phrase(page, a.letter).hover();
    await expect(box(page, a.letter)).toBeVisible();
    const img = (await page.locator('img[fetchpriority="high"]').boundingBox())!;
    const b = (await box(page, a.letter).boundingBox())!;
    // Regions are measured from the image's left edge in every direction (§8.6).
    expect(Math.abs(b.x - (img.x + a.region.x * img.width))).toBeLessThan(3);
  }
  expect(await seriousViolations(page)).toEqual([]);
  expect(errors).toEqual([]);
});
