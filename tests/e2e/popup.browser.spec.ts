import { expect, test, type Page } from '@playwright/test';
import type { FeedCard } from '../../src/modules/feed/types';
import { seriousViolations } from './support/a11y';
import { BASE, BUILD, message } from './support/artifact';
import { feedIndex, feedPage, localeIndex, promptDetail } from './support/content';

// The detail popup in real browsers (design doc §11.3, §11.3.1, §11.3.2, §12.8 scenarios 1–5
// and 8, §16.2 "详情弹层", §16.5 "可打断" "可恢复", §17.3 step 4a). Also the regression suite for
// Next.js's handling of native pushState / replaceState (§16.3): run it on every upgrade.

const locale = BUILD.locales[0]!;
const code = locale.code;
const prefix = locale.pathPrefix;
const index = feedIndex(code);
const listUrl = `${BASE}/${prefix}/prompts/`;
const detailUrl = (slug: string, p = prefix) => `${BASE}/${p}/prompts/${slug}/`;

/** Works of the list in reading order, as the popup steps through them: cards and extreme feature rows. */
function listWorks(code: string): FeedCard[] {
  const out: FeedCard[] = [];
  for (let n = 1; n <= feedIndex(code).pageCount; n += 1)
    for (const b of feedPage(code, n).blocks) {
      if (b.t === 'cards') out.push(...b.items);
      else if (b.t === 'feature' && b.reason === 'extreme') out.push(b.card);
    }
  return out;
}
const works = listWorks(code);
const bySlug = new Map(works.map((w) => [w.slug, w]));
const detailOf = (slug: string) => promptDetail(code, bySlug.get(slug)!.id);

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

const popup = (page: Page) => page.locator('dialog[data-popup]');
/** The heading that names the dialog: the work's title (the body has more level-2 headings). */
const dialogTitle = (page: Page) => popup(page).locator('h2').first();
/**
 * Animations in the popup that move or scale something. Reduced motion keeps short fades and
 * stops movement (§12.7), so only these must be absent then.
 */
const popupMovement = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => {
        const effect = a.effect as KeyframeEffect | null;
        if (!effect?.target?.closest?.('dialog[data-popup]')) return false;
        return effect
          .getKeyframes()
          .some((k) => ['transform', 'translate', 'scale'].some((p) => p in k && k[p] !== 'none'));
      })
      .map((a) => (a as CSSAnimation).animationName ?? 'script animation'),
  );
const card = (page: Page, slug: string) => page.locator(`[role="feed"] a[href="${detailUrl(slug)}"]`).first();

/** Marks the document, so a full reload is detectable. */
async function tagDocument(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __doc: string }).__doc = Math.random().toString(36).slice(2);
  });
}
const state = (page: Page) =>
  page.evaluate(() => ({
    path: location.pathname,
    historyLength: history.length,
    doc: (window as unknown as { __doc: string }).__doc,
    ours: !!(history.state && typeof history.state === 'object' && 'promptSeenPopup' in history.state),
    locked: 'popupOpen' in document.documentElement.dataset,
    open: !!document.querySelector<HTMLDialogElement>('dialog[data-popup]')?.open,
    focused: document.activeElement?.getAttribute('href') ?? null,
    title: document.title,
  }));

async function gotoList(page: Page, url = listUrl) {
  await page.goto(url);
  // React has attached its handlers to the host and the feed.
  await page.waitForFunction(() => {
    const el = document.querySelector('[role="feed"]');
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  });
}

async function expectOpen(page: Page, slug: string, p = prefix) {
  await expect(popup(page)).toHaveAttribute('open', '');
  await expect(popup(page)).toHaveAttribute('data-popup-slug', slug);
  await expect.poll(() => page.evaluate(() => location.pathname)).toBe(detailUrl(slug, p));
}

/** Closed, the address is the gallery's, nothing is locked and focus is on the work's card. */
async function expectClosed(page: Page, slug: string) {
  await expect(popup(page)).not.toHaveAttribute('open', '');
  await expect.poll(async () => (await state(page)).locked).toBe(false);
  expect((await state(page)).path).not.toBe(detailUrl(slug));
  await expect.poll(async () => (await state(page)).focused).toBe(detailUrl(slug));
}

/** Holds the popup JSON of one work for `ms`. */
async function delayJson(page: Page, slug: string, ms: number) {
  await page.route(`**/generated/${code}/prompts/${slug}.json`, async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

const first = works[0]!;
const second = works[1]!;
const third = works[2]!;

test.beforeEach(async ({ page }) => tagDocument(page));

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('a click opens the popup at the detail address without loading a page (§11.3, §16.2)', async ({ page }) => {
    const errors = watchErrors(page);
    await gotoList(page);
    const before = await state(page);
    await card(page, second.slug).click();
    await expectOpen(page, second.slug);
    const after = await state(page);
    expect(after).toMatchObject({ ours: true, locked: true, doc: before.doc, historyLength: before.historyLength + 1 });

    // The same body as the full page, from the same model; the title names the dialog.
    const detail = detailOf(second.slug);
    const heading = popup(page).getByRole('heading', { level: 2, name: detail.title });
    await expect(heading).toBeVisible();
    await expect(popup(page)).toHaveAccessibleName(detail.title);
    await expect(popup(page).locator('[id$="-prompt"]').first()).toContainText(detail.prompt.text.split('\n')[0]!);
    await expect(page).toHaveTitle(
      message(code, 'detail.documentTitle', {
        title: detail.seo.title,
        kind: message(code, 'detail.kinds.prompt'),
        siteName: BUILD.siteName,
      }),
    );
    // Focus moves into the dialog, onto Close.
    await expect(popup(page).locator('[data-popup-close]')).toBeFocused();
    expect(await seriousViolations(page, 'dialog[data-popup]')).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('§12.8-1: the image flies from the card; text keeps its size', async ({ page }) => {
    await gotoList(page);
    // Intent prefetch, as a resting pointer does (§11.8.2), so the model is there at the click.
    const prefetched = page.waitForResponse((r) => r.url().endsWith(`/prompts/${third.slug}.json`));
    await card(page, third.slug).hover();
    await prefetched;
    await card(page, third.slug).click();
    await expect(popup(page).locator('img[data-popup-flight]')).toHaveCount(1);
    const title = dialogTitle(page);
    const size = await title.evaluate((el) => getComputedStyle(el).fontSize);
    const transforms = await title.evaluate((el) => {
      const out: string[] = [];
      for (let e: Element | null = el; e && e.tagName !== 'DIALOG'; e = e.parentElement)
        out.push(getComputedStyle(e).transform);
      return out;
    });
    expect(transforms.every((t) => t === 'none' || /^matrix\(1, 0, 0, 1,/.test(t))).toBe(true);
    await expect(popup(page).locator('img[data-popup-flight]')).toHaveCount(0);
    await expect(popup(page).locator('[data-stage-picture]')).toBeVisible();
    expect(await title.evaluate((el) => getComputedStyle(el).fontSize)).toBe(size);
  });

  test('Close returns to the gallery with one Back; Forward reopens from the cache (§11.3.1)', async ({ page }) => {
    let requests = 0;
    page.on('request', (r) => r.url().endsWith(`/generated/${code}/prompts/${first.slug}.json`) && requests++);
    await gotoList(page);
    const { historyLength, doc } = await state(page);
    await card(page, first.slug).click();
    await expectOpen(page, first.slug);
    await popup(page).locator('[data-popup-close]').click();
    await expectClosed(page, first.slug);
    expect((await state(page)).historyLength).toBe(historyLength + 1); // Back, not a new entry
    await page.goForward();
    await expectOpen(page, first.slug);
    await page.keyboard.press('Escape');
    await expectClosed(page, first.slug);
    await page.goForward();
    await expectOpen(page, first.slug);
    await page.goBack();
    await expectClosed(page, first.slug);
    expect(requests).toBe(1);
    expect((await state(page)).doc).toBe(doc);
  });

  test('§12.8-2: quick successive clicks end on the last target; one Back leaves', async ({ page }) => {
    await delayJson(page, first.slug, 900); // the first target answers last
    await gotoList(page);
    const { historyLength } = await state(page);
    await page.evaluate(
      ([a, b]) => {
        document.querySelector<HTMLElement>(`[role="feed"] a[href="${a}"]`)!.click();
        document.querySelector<HTMLElement>(`[role="feed"] a[href="${b}"]`)!.click();
      },
      [detailUrl(first.slug), detailUrl(second.slug)],
    );
    await expectOpen(page, second.slug);
    await page.waitForTimeout(1200); // the stale answer arrives and must not win
    await expectOpen(page, second.slug);
    await expect(dialogTitle(page)).toHaveText(detailOf(second.slug).title);
    expect((await state(page)).historyLength).toBe(historyLength + 1);
    await page.goBack();
    await expectClosed(page, second.slug);
  });

  test('§12.8-3: Esc right after opening, data still loading, cleans up everything', async ({ page }) => {
    await delayJson(page, third.slug, 1500);
    await gotoList(page);
    const { doc, historyLength } = await state(page);
    await card(page, third.slug).click();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape'); // a second Esc must not go back past the gallery
    await expectClosed(page, third.slug);
    await page.waitForTimeout(1700); // the late answer must not reopen it
    await expectClosed(page, third.slug);
    expect(await state(page)).toMatchObject({ doc, historyLength: historyLength + 1, path: listUrl });
  });

  test('§12.8-4: Back, Forward and a refresh show the content of the address', async ({ page }) => {
    await gotoList(page);
    await card(page, first.slug).click();
    await expectOpen(page, first.slug);
    const { doc } = await state(page);
    await page.reload();
    await expect(page.locator('[data-page="prompt-detail"] h1')).toHaveText(detailOf(first.slug).title);
    expect(await state(page)).toMatchObject({ path: detailUrl(first.slug), open: false, locked: false });
    expect((await state(page)).doc).not.toBe(doc);
    await page.goBack();
    await expect(page.locator('[role="feed"]')).toBeVisible();
    await expect.poll(async () => (await state(page)).path).toBe(listUrl);
    expect((await state(page)).open).toBe(false);
    await page.goForward();
    await expect(page.locator('[data-page="prompt-detail"] h1')).toHaveText(detailOf(first.slug).title);
  });

  test('§12.8-5: on a slow network the frame shows at once and stays closable; failures offer a retry', async ({
    page,
  }) => {
    await delayJson(page, second.slug, 2500);
    let fail = true;
    await page.route(`**/generated/${code}/prompts/${third.slug}.json`, (route) =>
      fail ? route.fulfill({ status: 503, body: 'down' }) : route.continue(),
    );
    await gotoList(page);
    await card(page, second.slug).click();
    await expectOpen(page, second.slug);
    // The frame, the work's title and a status line, before any data (§11.3.2).
    await expect(popup(page).getByRole('heading', { level: 2, name: second.title })).toBeVisible();
    await expect(popup(page).getByRole('status')).toHaveText(message(code, 'popup.loading'));
    await expect(popup(page).locator('[data-popup-close]')).toBeEnabled();
    await expect(popup(page).locator('[data-stage-picture]')).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expectClosed(page, second.slug);

    await card(page, third.slug).click();
    const alert = popup(page).getByRole('alert');
    await expect(alert).toContainText(message(code, 'popup.failed'));
    await expect(alert.getByRole('link', { name: message(code, 'popup.openFull') })).toHaveAttribute(
      'href',
      detailUrl(third.slug),
    );
    fail = false;
    await alert.getByRole('button', { name: message(code, 'popup.retry') }).click();
    await expect(popup(page).getByRole('heading', { level: 2, name: detailOf(third.slug).title })).toBeVisible();
  });

  test('previous / next replace the entry, load the next batch at the end, and Back lands on the last work (§11.3)', async ({
    page,
  }) => {
    test.skip(index.pageCount < 2, 'needs two pages');
    test.setTimeout(90_000);
    const errors = watchErrors(page);
    await gotoList(page);
    const { historyLength, doc } = await state(page);
    await card(page, first.slug).click();
    await expectOpen(page, first.slug);
    const pageSize = index.pageSize;
    const steps = Math.min(works.length - 1, pageSize + 3); // across the first batch boundary
    for (let i = 1; i <= steps; i += 1) {
      if (i % 3 === 0) await popup(page).locator('[data-popup-step="next"]').click();
      else await page.keyboard.press('ArrowRight');
      await expectOpen(page, works[i]!.slug);
    }
    await page.keyboard.press('ArrowLeft');
    await expectOpen(page, works[steps - 1]!.slug);
    await page.keyboard.press('ArrowRight');
    await expectOpen(page, works[steps]!.slug);
    await expect(dialogTitle(page)).toHaveText(detailOf(works[steps]!.slug).title);
    expect((await state(page)).historyLength).toBe(historyLength + 1);
    // The second batch is in the list behind.
    await expect(card(page, works[steps]!.slug)).toBeAttached();

    await page.goBack();
    await expectClosed(page, works[steps]!.slug);
    await expect(card(page, works[steps]!.slug)).toBeInViewport();
    expect((await state(page)).doc).toBe(doc);
    expect(errors).toEqual([]);
  });

  test('a work outside the list (a related prompt) replaces the popup; prev / next stay hidden there', async ({
    page,
  }) => {
    const host = works.find((w) => detailOf(w.slug).similar.length > 0);
    test.skip(!host, 'no prompt with similar prompts');
    const detail = detailOf(host!.slug);
    const related = detail.similar[0]!;
    await gotoList(page);
    const { historyLength } = await state(page);
    await card(page, host!.slug).click();
    await expectOpen(page, host!.slug);
    await popup(page)
      .locator(`a[href="${detailUrl(related.slug)}"]`)
      .first()
      .click();
    await expectOpen(page, related.slug);
    expect((await state(page)).historyLength).toBe(historyLength + 1);
    await page.goBack();
    await expect(popup(page)).not.toHaveAttribute('open', '');
    await expect.poll(async () => (await state(page)).path).toBe(listUrl);
  });

  test('a link to another page leaves the popup; Back returns to it (§11.3.1)', async ({ page }) => {
    const host = works.find((w) => detailOf(w.slug).relatedTemplates.length > 0);
    test.skip(!host, 'no prompt with a related template');
    const template = detailOf(host!.slug).relatedTemplates[0]!;
    await gotoList(page);
    const { doc } = await state(page);
    await card(page, host!.slug).click();
    await expectOpen(page, host!.slug);
    await popup(page).locator(`a[href="${BASE}${template.path}"]`).first().click();
    await expect(page.locator('[data-page="template-detail"]')).toBeVisible();
    expect(await state(page)).toMatchObject({ open: false, locked: false, doc });
    await page.goBack();
    await expectOpen(page, host!.slug);
    expect((await state(page)).ours).toBe(true);
    await page.keyboard.press('Escape');
    await expect(popup(page)).not.toHaveAttribute('open', '');
    await expect.poll(async () => (await state(page)).locked).toBe(false);
  });

  test('Esc first cancels a current annotation, then closes (§11.1.9)', async ({ page }) => {
    const annotated = works.find((w) => detailOf(w.slug).annotations.length > 0);
    test.skip(!annotated, 'no annotated prompt');
    await gotoList(page);
    await card(page, annotated!.slug).click();
    await expectOpen(page, annotated!.slug);
    const phrase = popup(page).locator('button[data-letter="A"]');
    await phrase.focus();
    await page.keyboard.press('Enter');
    await expect(phrase).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(phrase).not.toHaveAttribute('aria-pressed', 'true');
    await expectOpen(page, annotated!.slug);
    await page.keyboard.press('Escape');
    await expectClosed(page, annotated!.slug);
  });

  test('an entry written by other code (no popup mark) closes by replacing it with the gallery', async ({ page }) => {
    await gotoList(page);
    const { historyLength, doc } = await state(page);
    await page.evaluate((url) => history.pushState(null, '', url), detailUrl(second.slug));
    await expectOpen(page, second.slug);
    expect((await state(page)).ours).toBe(false);
    await page.keyboard.press('Escape');
    await expect(popup(page)).not.toHaveAttribute('open', '');
    expect(await state(page)).toMatchObject({ path: listUrl, historyLength: historyLength + 1, doc, locked: false });
  });

  test('§12.8-8: with reduced motion the same tasks work, without flight or movement', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoList(page);
    const prefetched = page.waitForResponse((r) => r.url().endsWith(`/prompts/${first.slug}.json`));
    await card(page, first.slug).hover();
    await prefetched;
    await card(page, first.slug).click();
    await expectOpen(page, first.slug);
    expect(await popup(page).locator('img[data-popup-flight]').count()).toBe(0);
    expect(await popupMovement(page)).toEqual([]);
    await page.keyboard.press('ArrowRight');
    await expectOpen(page, second.slug);
    expect(await popupMovement(page)).toEqual([]);
    await popup(page).locator('[data-popup-close]').click();
    await expectClosed(page, second.slug);
  });

  test('modified clicks and pages without JavaScript reach the full page', async ({
    page,
    context,
    browser,
    baseURL,
  }) => {
    await gotoList(page);
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    const [tab] = await Promise.all([
      context.waitForEvent('page'),
      card(page, first.slug).click({ modifiers: [modifier] }),
    ]);
    await expect(tab.locator('[data-page="prompt-detail"] h1')).toHaveText(detailOf(first.slug).title);
    expect(await state(page)).toMatchObject({ path: listUrl, open: false });

    const noJs = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const p = await noJs.newPage();
    await p.goto(listUrl);
    await p
      .locator(`[role="feed"] a[href="${detailUrl(first.slug)}"]`)
      .first()
      .click();
    await expect(p.locator('[data-page="prompt-detail"] h1')).toHaveText(detailOf(first.slug).title);
    await noJs.close();
  });

  test('topic pages open their works in the popup too', async ({ page }) => {
    const topic = localeIndex(code).topics[0];
    test.skip(!topic, 'no topic page in this locale');
    await page.goto(`${BASE}${topic!.path}`);
    const links = page.locator('[data-page="topic"] section ul a[href*="/prompts/"]');
    await expect(links.first()).toBeVisible();
    await page.waitForFunction(() =>
      Object.keys(document.querySelector('[data-page="topic"] section ul a')!).some((k) => k.startsWith('__react')),
    );
    const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
    const slugOf = (href: string) => href.split('/').filter(Boolean).at(-1)!;
    await links.first().click();
    await expectOpen(page, slugOf(hrefs[0]!));
    if (hrefs.length > 1) {
      await page.keyboard.press('ArrowRight');
      await expectOpen(page, slugOf(hrefs[1]!));
    }
    await page.keyboard.press('Escape');
    await expect(popup(page)).not.toHaveAttribute('open', '');
    await expect.poll(() => page.evaluate(() => location.pathname)).toBe(`${BASE}${topic!.path}`);
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute('href')))
      .toBe(hrefs[hrefs.length > 1 ? 1 : 0]);
  });
});

test.describe('right-to-left', () => {
  const ar = BUILD.locales.find((l) => l.direction === 'rtl');
  test.skip(!ar, 'no right-to-left locale in this build');
  test.use({ viewport: { width: 1280, height: 800 } });

  test('← goes to the next work in reading order (§11.3)', async ({ page }) => {
    const arWorks = listWorks(ar!.code);
    test.skip(arWorks.length < 2, 'needs two works');
    await gotoList(page, `${BASE}/${ar!.pathPrefix}/prompts/`);
    await page
      .locator(`[role="feed"] a[href="${detailUrl(arWorks[0]!.slug, ar!.pathPrefix)}"]`)
      .first()
      .click();
    await expectOpen(page, arWorks[0]!.slug, ar!.pathPrefix);
    await page.keyboard.press('ArrowLeft');
    await expectOpen(page, arWorks[1]!.slug, ar!.pathPrefix);
    await page.keyboard.press('ArrowRight');
    await expectOpen(page, arWorks[0]!.slug, ar!.pathPrefix);
  });
});

test.describe('phone', () => {
  // As the other phone tests: no isMobile (unsupported in Firefox); buttons are tapped.
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  /** A one-finger swipe on the popup, as touch events (Chromium builds Touch objects). */
  async function swipe(page: Page, from: [number, number], to: [number, number], ms = 160) {
    await page.evaluate(
      async ([[x0, y0], [x1, y1], duration]) => {
        const target = document.elementFromPoint(x0!, y0!)!;
        const touch = (x: number, y: number) =>
          new Touch({ identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y });
        const fire = (type: string, x: number, y: number, end = false) =>
          target.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches: end ? [] : [touch(x, y)],
              targetTouches: end ? [] : [touch(x, y)],
              changedTouches: [touch(x, y)],
            }),
          );
        fire('touchstart', x0!, y0!);
        const steps = 8;
        for (let i = 1; i <= steps; i += 1) {
          await new Promise((r) => setTimeout(r, (duration as number) / steps));
          fire('touchmove', x0! + ((x1! - x0!) * i) / steps, y0! + ((y1! - y0!) * i) / steps);
        }
        fire('touchend', x1!, y1!, true);
      },
      [from, to, ms] as const,
    );
  }

  test('swipe sideways switches works, down closes; edge swipes stay with the system (§11.3)', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'synthetic Touch objects need Chromium');
    await gotoList(page);
    await card(page, first.slug).click();
    await expectOpen(page, first.slug);
    await expect(popup(page).locator('[data-stage-picture], [class*="pendingFrame"]').first()).toBeVisible();

    await swipe(page, [5, 400], [300, 400]); // starts at the edge: the system's back gesture
    await expectOpen(page, first.slug);
    await swipe(page, [320, 400], [60, 400]);
    await expectOpen(page, second.slug);
    await swipe(page, [60, 400], [320, 400]);
    await expectOpen(page, first.slug);
    await swipe(page, [200, 300], [200, 560]);
    await expectClosed(page, first.slug);
  });

  test('the popup fills the screen and keeps buttons for every gesture (WCAG 2.5.1)', async ({ page }) => {
    await gotoList(page);
    await card(page, first.slug).tap();
    await expectOpen(page, first.slug);
    // Full width of the dialog's content area: browsers with classic scrollbars (Chromium on
    // Linux without mobile emulation) take the scrollbar's width off the viewport.
    const { panel, inner } = await popup(page).evaluate((dlg) => ({
      panel: (dlg.firstElementChild as HTMLElement).getBoundingClientRect().width,
      inner: dlg.clientWidth,
    }));
    expect(inner).toBeGreaterThanOrEqual(390 - 20);
    expect(Math.abs(panel - inner)).toBeLessThanOrEqual(1);
    await expect(popup(page).locator('[data-popup-step="next"]')).toBeVisible();
    await expect(popup(page).locator('[data-popup-close]')).toBeVisible();
    await popup(page).locator('[data-popup-step="next"]').tap();
    await expectOpen(page, second.slug);
    expect(await seriousViolations(page, 'dialog[data-popup]')).toEqual([]);
    await popup(page).locator('[data-popup-close]').tap();
    await expectClosed(page, second.slug);
  });
});
