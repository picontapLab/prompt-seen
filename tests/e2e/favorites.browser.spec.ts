import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { seriousViolations } from './support/a11y';
import { BASE, BUILD, message } from './support/artifact';
import { feedIndex, localeIndex, samplePrompt, sampleTemplate } from './support/content';

// Favourites and keyboard shortcuts in real browsers (design doc §11.5, §11.6.2, §11.10, §17.3
// step 4c): saving from cards, detail pages and the popup; the favourites page with undo,
// export, import and unavailable works; other tabs following; disabled or corrupt storage never
// breaking browsing, copying or saving; single-key shortcuts that can be turned off and never
// fire while typing or composing.

const locale = BUILD.locales[0]!;
const code = locale.code;
const KEY = 'prompt-library:favorites:v1';
const PREFS = 'prompt-library:preferences:v1';
const listUrl = `${BASE}/${locale.pathPrefix}/prompts/`;
const favoritesUrl = `${BASE}/${locale.pathPrefix}/favorites/`;
const detail = samplePrompt(code);
const detailUrl = `${BASE}${detail.path}`;
const template = sampleTemplate(code);
const firstCard = (page: Page) => page.locator('[role="feed"] > article[data-entry]:not([data-interlude])').first();
const save = message(code, 'favorites.save');

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

const hydrated = (page: Page, selector: string) =>
  page.waitForFunction((s) => {
    const el = document.querySelector(s);
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  }, selector);

const stored = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{"items":[]}').items as { id: string }[], KEY);

/** Presses a key with the focus on the page itself, not in a field. */
async function pressOnPage(page: Page, key: string) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press(key);
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('saving a card updates the button, the circled frame number and the header count (§11.5)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(listUrl);
    await hydrated(page, '[data-favorite]');
    const card = firstCard(page);
    const id = (await card.getAttribute('data-entry'))!;
    const button = card.getByRole('button', { name: save });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await card.hover();
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(card.locator('[data-circle-mark]')).toBeVisible();
    expect((await stored(page)).map((f) => f.id)).toEqual([id]);
    await expect(page.locator('[data-favorites-count]')).toHaveText('1');
    // The one-time note, then never again (§11.9 一次性提示).
    await expect(page.getByText(message(code, 'favorites.note.title'))).toBeVisible();
    const prefs = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), PREFS);
    expect(prefs.favoritesNoteSeen).toBe(true);

    // Saved works keep their button in view without hover; reload restores the state.
    await page.reload();
    await hydrated(page, '[data-favorite]');
    await expect(page.locator(`article[data-entry="${id}"]:not([data-interlude]) [data-favorite]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Removing offers an undo (§11.5).
    await page.locator(`article[data-entry="${id}"]:not([data-interlude]) [data-favorite]`).click();
    const undo = page.getByRole('button', { name: message(code, 'favorites.undo') });
    await expect(undo).toBeVisible();
    await undo.click();
    await expect.poll(async () => (await stored(page)).map((f) => f.id)).toEqual([id]);
    expect(errors).toEqual([]);
  });

  test('the favourites page lists, removes in place with undo, exports and imports (§11.5)', async ({ page }) => {
    const errors = watchErrors(page);
    const ids = feedIndex(code)
      .items.slice(0, 3)
      .map((f) => f.id);
    const now = Date.now();
    const items = [
      ...ids.map((id, i) => ({ id, kind: 'prompt', at: new Date(now - i * 60_000).toISOString() })),
      { id: 'p_zzz_gone', kind: 'prompt', at: new Date(now - 3_600_000).toISOString() },
      ...(template ? [{ id: template.id, kind: 'template', at: new Date(now - 30_000).toISOString() }] : []),
    ];
    await page.addInitScript(([key, value]) => localStorage.setItem(key!, value!), [KEY, JSON.stringify({ items })]);
    await page.goto(favoritesUrl);
    await expect(page.locator('[data-saved-entry]')).toHaveCount(items.length);
    // Newest saved first, by type section; a work the content no longer has says so.
    const promptOrder = await page
      .locator('section[aria-labelledby="saved-prompts"] [data-saved-entry]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-saved-entry')));
    expect(promptOrder).toEqual([...ids, 'p_zzz_gone']);
    await expect(page.locator('[data-saved-entry="p_zzz_gone"]')).toContainText(
      message(code, 'favorites.page.unavailable'),
    );
    expect(await seriousViolations(page)).toEqual([]);

    // Type filter.
    if (template) {
      await page.getByRole('radio', { name: new RegExp(message(code, 'favorites.page.templates')) }).click();
      await expect(page.locator('[data-saved-entry]')).toHaveCount(1);
      await page.getByRole('radio', { name: new RegExp(message(code, 'favorites.page.all')) }).click();
    }

    // Remove in place: faded, with its own undo and no toast; then gone after the window.
    const first = page.locator(`[data-saved-entry="${ids[0]}"]`);
    await first.hover();
    await first.getByRole('button', { name: save }).click();
    await expect(first).toHaveAttribute('data-removed', 'true');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await first.getByRole('button', { name: message(code, 'favorites.undo') }).click();
    await expect(first).not.toHaveAttribute('data-removed', 'true');
    expect((await stored(page)).map((f) => f.id)).toContain(ids[0]);
    await first.hover();
    await first.getByRole('button', { name: save }).click();
    await expect(first).toHaveCount(0, { timeout: 8000 });

    // Unavailable works can be removed.
    await page.locator('[data-saved-entry="p_zzz_gone"]').getByRole('button').click();
    await expect(page.locator('[data-saved-entry="p_zzz_gone"]')).toHaveCount(0);

    // Export: only IDs, kinds and times.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: message(code, 'favorites.page.export') }).click(),
    ]);
    const file = JSON.parse(fs.readFileSync((await download.path())!, 'utf8'));
    expect(file.format).toBe('prompt-seen-favorites');
    expect(Object.keys(file.items[0]).sort()).toEqual(['at', 'id', 'kind']);
    expect(file.items.map((f: { id: string }) => f.id)).not.toContain(ids[0]);

    // Import merges: the removed work comes back, the rest is already saved.
    await page.locator('[data-import-file]').setInputFiles({
      name: 'saved.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...file, items: [...file.items, items[0]] })),
    });
    if (code === 'en') await expect(page.getByText('Added 1 work')).toBeVisible();
    await expect(page.locator(`[data-saved-entry="${ids[0]}"]`)).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('another tab follows (§11.6.2 storage event)', async ({ context }) => {
    // Each tab in front while it loads: background tabs may be throttled until they are shown.
    const b = await context.newPage();
    await b.goto(favoritesUrl);
    await expect(b.locator('[data-favorites-empty]')).toBeVisible();
    const a = await context.newPage();
    await a.goto(listUrl);
    await hydrated(a, '[data-favorite]');
    const card = firstCard(a);
    await card.hover();
    await card.getByRole('button', { name: save }).click();
    await b.bringToFront();
    await expect(b.locator('[data-saved-entry]')).toHaveCount(1);
    await expect(b.locator('[data-favorites-count]')).toHaveText('1');
  });

  test('disabled storage: browsing, copying and saving still work for the visit (§11.6.2)', async ({
    page,
    context,
    browserName,
  }) => {
    const errors = watchErrors(page);
    await page.addInitScript(() => {
      const deny = () => {
        throw new DOMException('denied', 'SecurityError');
      };
      Object.defineProperty(window, 'localStorage', { configurable: true, get: deny });
    });
    await page.goto(listUrl);
    await hydrated(page, '[data-favorite]');
    const card = firstCard(page);
    await card.hover();
    await card.getByRole('button', { name: save }).click();
    await expect(card.getByRole('button', { name: save })).toHaveAttribute('aria-pressed', 'true');
    await card.locator('a').first().click({ modifiers: [] });
    await expect(page.locator('dialog[open]')).toBeVisible();
    await page.keyboard.press('Escape');
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto(detailUrl);
      await hydrated(page, '[data-shortcut="copy"]');
      await page.locator('[data-shortcut="copy"]').click();
      await expect(page.locator('[data-shortcut="copy"]')).toHaveAttribute('data-copy-state', 'done');
    }
    expect(errors).toEqual([]);
  });

  test('corrupt stored data reads as empty and is replaced on the next save (§11.6.2)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.addInitScript(
      ([key]) => {
        if (!sessionStorage.getItem('seeded')) {
          localStorage.setItem(key!, '{"items": [oops');
          sessionStorage.setItem('seeded', '1');
        }
      },
      [KEY],
    );
    await page.goto(favoritesUrl);
    await expect(page.locator('[data-favorites-empty]')).toBeVisible();
    await page.goto(detailUrl);
    await hydrated(page, '[data-shortcut="save"]');
    await page.locator('[data-shortcut="save"]').click();
    expect((await stored(page)).map((f) => f.id)).toEqual([detail.id]);
    expect(errors).toEqual([]);
  });

  test('S saves and C copies on a detail page; ? lists the shortcuts; the switch turns them off (§11.10)', async ({
    page,
    context,
    browserName,
  }) => {
    await page.goto(detailUrl);
    await hydrated(page, '[data-shortcut="save"]');
    const saveButton = page.locator('[data-shortcut="save"]');
    await pressOnPage(page, 's');
    await expect(saveButton).toHaveAttribute('aria-pressed', 'true');
    await pressOnPage(page, 's');
    await expect(saveButton).toHaveAttribute('aria-pressed', 'false');
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await pressOnPage(page, 'c');
      await expect(page.locator('[data-shortcut="copy"]')).toHaveAttribute('data-copy-state', 'done');
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(detail.prompt.text.trim());
    }
    // Typing in a field and composing with an IME never trigger shortcuts.
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.id = 'scratch';
      document.querySelector('main')!.prepend(input);
    });
    await page.locator('#scratch').pressSequentially('sss');
    await expect(saveButton).toHaveAttribute('aria-pressed', 'false');
    await page.evaluate(() =>
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 's', isComposing: true, bubbles: true })),
    );
    await expect(saveButton).toHaveAttribute('aria-pressed', 'false');

    // `?` opens the list (dispatched: `?` needs a layout-specific Shift combination).
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.evaluate(() =>
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true })),
    );
    const dialog = page.getByRole('dialog', { name: message(code, 'shortcuts.title') });
    await expect(dialog).toBeVisible();
    expect(await seriousViolations(page, '[role="dialog"]')).toEqual([]);
    const toggle = dialog.getByRole('checkbox', { name: message(code, 'shortcuts.single') });
    await expect(toggle).toBeChecked();
    await toggle.uncheck();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await pressOnPage(page, 's');
    await expect(saveButton).toHaveAttribute('aria-pressed', 'false');
    // Remembered on the device; the footer button still opens the list (WCAG 2.1.4).
    await page.reload();
    await hydrated(page, '[data-shortcuts-open]');
    await pressOnPage(page, 's');
    await expect(page.locator('[data-shortcut="save"]')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('[data-shortcuts-open]').click();
    await expect(page.getByRole('checkbox', { name: message(code, 'shortcuts.single') })).not.toBeChecked();
  });

  test('in the detail popup, S saves the work on show, not the list behind it (§11.10)', async ({ page }) => {
    await page.goto(listUrl);
    await hydrated(page, '[role="feed"]');
    const card = firstCard(page);
    const id = (await card.getAttribute('data-entry'))!;
    await card.locator('a').first().click();
    const popup = page.locator('dialog[open]');
    await expect(popup.locator('[data-shortcut="save"]')).toBeVisible();
    await page.keyboard.press('s');
    await expect(popup.locator('[data-shortcut="save"]')).toHaveAttribute('aria-pressed', 'true');
    expect((await stored(page)).map((f) => f.id)).toEqual([id]);
  });

  test('C copies the template editor preview (§11.10)', async ({ page, context, browserName }) => {
    test.skip(!template, 'needs a template');
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only in Playwright');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${BASE}${template!.path}`);
    await hydrated(page, '[data-shortcut="copy"]');
    await pressOnPage(page, 'c');
    await expect(page.locator('[data-shortcut="copy"]')).toHaveAttribute('data-copy-state', 'done');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(template!.version.defaultPrompt.trim());
  });
});

test('every locale: the favourites page speaks its language and shows the empty state', async ({ page }) => {
  for (const l of BUILD.locales) {
    if (!localeIndex(l.code)) continue;
    await page.goto(`${BASE}/${l.pathPrefix}/favorites/`);
    await expect(page.locator('h1')).toHaveText(message(l.code, 'favorites.page.title'));
    await expect(page.locator('[data-favorites-empty] h2')).toHaveText(message(l.code, 'favorites.page.empty.title'));
  }
});
