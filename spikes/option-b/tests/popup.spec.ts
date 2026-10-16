// Prototype 1: pushState popup under basePath (memo §3.5, design doc §11.3 and §12.8 scenarios 2–4).
// Runs against the static export served by the reference nginx at /prompt-seen/.
import { expect, test } from '@playwright/test';
import {
  BASE,
  SLUGS,
  card,
  delayJson,
  detailUrl,
  expectGalleryClosed,
  expectPopupOpen,
  gotoGallery,
  listUrl,
  snapshot,
  tagDocuments,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await tagDocuments(page);
});

test('click: pushState to the prefixed detail URL, dialog opens, no document load', async ({ page }) => {
  await gotoGallery(page);
  const before = await snapshot(page);
  await card(page, 'neon-alley').click();
  await expectPopupOpen(page, 'neon-alley');
  const after = await snapshot(page);
  expect(after.historyLength).toBe(before.historyLength + 1);
  expect(after.ourEntry).toBe(true);
  expect(after.docId).toBe(before.docId);
  // Same body as the full page: the popup renders PromptDetailBody from the per-item JSON.
  await expect(page.locator('dialog [data-testid="prompt-text"]')).toHaveText(
    'Neon Alley, soft natural light, 35mm film, high detail',
  );
});

test('browser Back closes and returns focus to the card; Forward reopens from cached JSON', async ({ page }) => {
  let jsonRequests = 0;
  page.on('request', (r) => r.url().endsWith('/generated/en/prompts/neon-alley.json') && jsonRequests++);
  await gotoGallery(page);
  const { docId } = await snapshot(page);
  await card(page, 'neon-alley').click();
  await expectPopupOpen(page, 'neon-alley');
  await page.goBack();
  await expectGalleryClosed(page, 'neon-alley');
  await page.goForward();
  await expectPopupOpen(page, 'neon-alley');
  await page.goBack();
  await expectGalleryClosed(page, 'neon-alley');
  expect(jsonRequests).toBe(1);
  expect((await snapshot(page)).docId).toBe(docId);
});

test('Close button and Esc call history.back() for our own entry', async ({ page }) => {
  await gotoGallery(page);
  await card(page, 'tea-tin').click();
  await expectPopupOpen(page, 'tea-tin');
  const { historyLength } = await snapshot(page);
  await page.getByTestId('popup-close').click();
  await expectGalleryClosed(page, 'tea-tin');
  // history.back() keeps the forward entry; a push would have grown the stack.
  expect((await snapshot(page)).historyLength).toBe(historyLength);
  await page.goForward();
  await expectPopupOpen(page, 'tea-tin');

  await page.keyboard.press('Escape');
  await expectGalleryClosed(page, 'tea-tin');
  expect((await snapshot(page)).historyLength).toBe(historyLength);
});

test('memo §3.5: a scrolled gallery keeps its position across open and close (no restore needed)', async ({
  page,
}) => {
  await gotoGallery(page);
  await card(page, SLUGS[17]).scrollIntoViewIfNeeded();
  const y0 = await page.evaluate(() => scrollY);
  expect(y0).toBeGreaterThan(0);
  await card(page, SLUGS[17]).click();
  await expectPopupOpen(page, SLUGS[17]);
  await page.mouse.wheel(0, 2000); // scroll lock: the page behind must not move
  await page.keyboard.press('Escape');
  await expectGalleryClosed(page, SLUGS[17]);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => scrollY)).toBe(y0);
});

test('§12.8-3: Esc right after opening (JSON still loading) cleans up scroll lock and focus', async ({ page }) => {
  await delayJson(page, 'ramen-bowl', 1500);
  await gotoGallery(page);
  const { docId } = await snapshot(page);
  await card(page, 'ramen-bowl').click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape'); // a second Esc must not go back past the gallery
  await expectGalleryClosed(page, 'ramen-bowl');
  await page.waitForTimeout(1800); // late JSON arrives
  await expectGalleryClosed(page, 'ramen-bowl');
  expect((await snapshot(page)).docId).toBe(docId);
});

test('§12.8-2: rapid successive clicks end on the last target; one Back returns to gallery', async ({ page }) => {
  await delayJson(page, 'misty-ridges', 800); // first target answers last
  await gotoGallery(page);
  const { historyLength } = await snapshot(page);
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('[data-card-slug="misty-ridges"]')!.click();
    document.querySelector<HTMLElement>('[data-card-slug="ramen-bowl"]')!.click();
  });
  await expectPopupOpen(page, 'ramen-bowl');
  await page.waitForTimeout(1200); // stale misty-ridges response must not win
  await expectPopupOpen(page, 'ramen-bowl');
  expect((await snapshot(page)).historyLength).toBe(historyLength + 1);
  await page.goBack();
  await expectGalleryClosed(page, 'ramen-bowl');
});

test('§11.3: 20 × next via replaceState, then one Back returns to gallery at the last viewed card', async ({
  page,
}) => {
  await gotoGallery(page);
  await card(page, SLUGS[0]).click();
  await expectPopupOpen(page, SLUGS[0]);
  const { historyLength, docId } = await snapshot(page);
  for (let i = 1; i <= 20; i++) {
    if (i % 2) await page.keyboard.press('ArrowRight');
    else await page.getByTestId('popup-next').click();
    await expectPopupOpen(page, SLUGS[i]);
  }
  await page.keyboard.press('ArrowLeft');
  await expectPopupOpen(page, SLUGS[19]);
  await page.keyboard.press('ArrowRight');
  await expectPopupOpen(page, SLUGS[20]);
  expect((await snapshot(page)).historyLength).toBe(historyLength);

  await page.goBack();
  await expectGalleryClosed(page, SLUGS[20]);
  await expect(card(page, SLUGS[20])).toBeInViewport();
  expect((await snapshot(page)).docId).toBe(docId);
});

test('§12.8-4: refresh on a detail URL shows the full page, then Back and Forward work', async ({ page }) => {
  await gotoGallery(page);
  const first = await snapshot(page);
  await card(page, 'neon-alley').click();
  await expectPopupOpen(page, 'neon-alley');

  await page.reload();
  await expect(page.locator('[data-page="detail"] h1')).toHaveText('Neon Alley');
  let s = await snapshot(page);
  expect(s).toMatchObject({ path: detailUrl('neon-alley'), galleryMounted: false, scrollLocked: false });
  expect(s.docId).not.toBe(first.docId);
  await expect(page).toHaveTitle('Neon Alley | Prompt Seen');

  await page.goBack();
  await expect(page.locator('[data-gallery][data-hydrated="true"]')).toBeAttached();
  s = await snapshot(page);
  expect(s).toMatchObject({ path: listUrl(), nextPathname: '/en/prompts/', dialogOpen: false, scrollLocked: false });

  await page.goForward();
  await expect(page.locator('[data-page="detail"] h1')).toHaveText('Neon Alley');
  expect((await snapshot(page)).path).toBe(detailUrl('neon-alley'));
});

test('soft navigation from inside the popup to another route, then Back reopens the popup', async ({ page }) => {
  await gotoGallery(page);
  const { docId } = await snapshot(page);
  await card(page, 'ink-portrait').click();
  await expectPopupOpen(page, 'ink-portrait');

  await page.locator('dialog [data-testid="open-template"]').click();
  await expect(page.locator('[data-page="templates"] h1')).toHaveText('Templates');
  let s = await snapshot(page);
  expect(s).toMatchObject({
    path: `${BASE}/en/templates/`,
    galleryMounted: false,
    dialogOpen: false,
    scrollLocked: false,
    title: 'Templates | Prompt Seen',
  });
  expect(s.docId).toBe(docId);

  await page.goBack();
  await expectPopupOpen(page, 'ink-portrait');
  expect((await snapshot(page)).ourEntry).toBe(true);
  await page.keyboard.press('Escape');
  await expectGalleryClosed(page, 'ink-portrait');

  await page.goForward();
  await expectPopupOpen(page, 'ink-portrait');
  await page.goForward();
  await expect(page.locator('[data-page="templates"] h1')).toHaveText('Templates');
  s = await snapshot(page);
  expect(s).toMatchObject({ dialogOpen: false, scrollLocked: false });
  expect(s.docId).toBe(docId);
});

test('usePathname follows foreign pushState; Esc on an untagged entry goes to the list, not back', async ({
  page,
}) => {
  await gotoGallery(page);
  const { historyLength, docId } = await snapshot(page);
  await page.evaluate((url) => history.pushState(null, '', url), detailUrl('tea-tin'));
  await expectPopupOpen(page, 'tea-tin');
  expect((await snapshot(page)).ourEntry).toBe(false);
  await page.keyboard.press('Escape');
  await expectGalleryClosed(page, 'tea-tin');
  const s = await snapshot(page);
  expect(s.historyLength).toBe(historyLength + 2); // foreign entry + pushed list entry
  expect(s.docId).toBe(docId);
});

test('modifier click and no-JS fall back to the real detail page', async ({ page, context, browser, baseURL }) => {
  await gotoGallery(page);
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    card(page, 'fern-macro').click({ modifiers: [modifier] }),
  ]);
  await expect(tab.locator('[data-page="detail"] h1')).toHaveText('Fern Macro');
  expect(new URL(tab.url()).pathname).toBe(detailUrl('fern-macro'));
  expect(await snapshot(page)).toMatchObject({ path: listUrl(), dialogOpen: false });

  const noJs = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const p = await noJs.newPage();
  await p.goto(listUrl());
  await p.locator('[data-card-slug="fern-macro"]').click();
  await expect(p.locator('[data-page="detail"] h1')).toHaveText('Fern Macro');
  expect(new URL(p.url()).pathname).toBe(detailUrl('fern-macro'));
  await noJs.close();
});

test('zh-hans gallery: same behaviour under the second locale', async ({ page }) => {
  await gotoGallery(page, 'zh-hans');
  await card(page, 'tea-tin').click();
  await expectPopupOpen(page, 'tea-tin', 'zh-hans', 'zh-Hans');
  await page.keyboard.press('ArrowRight');
  await expectPopupOpen(page, 'travel-poster', 'zh-hans', 'zh-Hans');
  await page.goBack();
  await expectGalleryClosed(page, 'travel-poster', 'zh-hans');
});
