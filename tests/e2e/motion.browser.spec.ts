import { expect, test, type Page } from '@playwright/test';
import { BASE, BUILD, message } from './support/artifact';
import { localeIndex, samplePrompt, templateDetail } from './support/content';
import { slowColdVisit } from './support/layout';

// The motion scenarios of design doc §12.8 that the feature specs do not already cover
// (§17.3 step 6). Scenarios 1–5 and 8 are in popup.browser.spec.ts, input methods (part of 6)
// in editor.browser.spec.ts and search.browser.spec.ts; failed list batches and search index
// loads (part of 7) in list.browser.spec.ts and search.browser.spec.ts.

const [first] = BUILD.locales;
const code = first!.code;
const prefix = first!.pathPrefix;
const prompt = samplePrompt(code);
const index = localeIndex(code);
const templateSummary = [...index.templates].sort((a, b) => b.fieldCount - a.fieldCount)[0];
const template = templateSummary ? templateDetail(code, templateSummary.id) : null;
const textField = template?.version.fields.find((f) => f.type === 'string' && f.required);

const takenOver = (page: Page) =>
  page.waitForFunction(() => {
    const el = document.querySelector('header button, header a[href]');
    return !!el && Object.keys(el).some((k) => k.startsWith('__react'));
  });
const editorReady = (page: Page) =>
  page.waitForFunction(() => {
    const el = document.querySelector('[data-field-shell] input');
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  });
const field = (page: Page, name: string) =>
  page.locator(`[data-field-shell="${name}"]`).locator('input:not([type=radio]), textarea').first();
const preview = (page: Page) => page.locator('[id$="-prompt"]').first();

test.describe('§12.8-6: typing while the preview changes keeps the input, the caret and the values', () => {
  test.skip(!template || !textField, 'needs a template with a required text field');

  test('desktop: typing mid-word updates the preview and leaves the caret where it was', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}${template!.path}`);
    await editorReady(page);
    const input = field(page, textField!.name);
    await input.fill('Neon');
    await input.evaluate((el: HTMLInputElement) => el.setSelectionRange(2, 2));
    for (const ch of 'XYZ') {
      await page.keyboard.type(ch);
      // Every keystroke reaches the preview, and the caret moves on by one, never to the end.
      await expect(preview(page)).toContainText((await input.inputValue()).trim());
    }
    await expect(input).toHaveValue('NeXYZon');
    expect(await input.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([5, 5]);
  });

  test('phone: opening and closing the docked preview keeps what was typed', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}${template!.path}`);
    await editorReady(page);
    const input = field(page, textField!.name);
    await input.fill('Lantern');
    const handle = page.locator('section:has(> [data-sheet-body]) button[aria-expanded]');
    await handle.click();
    await expect(handle).toHaveAttribute('aria-expanded', 'true');
    await expect(preview(page)).toContainText('Lantern');
    await page.keyboard.press('Escape');
    await expect(handle).toHaveAttribute('aria-expanded', 'false');
    await input.focus();
    await page.keyboard.press('End');
    await page.keyboard.type(' glow');
    await expect(input).toHaveValue('Lantern glow');
    await expect(preview(page)).toContainText('Lantern glow');
  });
});

test.describe('§12.8-7: no results, failed requests and broken images each say what to do', () => {
  test('filters with no result show the empty state, and clearing them brings the list back', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // A combination that matches nothing: the rarest style with the rarest use.
    const styles = [...new Set(index.prompts.flatMap((p) => p.styleIds))];
    const uses = [...new Set(index.prompts.flatMap((p) => p.useCaseIds))];
    const pair = styles
      .flatMap((s) => uses.map((u) => [s, u] as const))
      .find(([s, u]) => !index.prompts.some((p) => p.styleIds.includes(s) && p.useCaseIds.includes(u)));
    test.skip(!pair, 'every style and use combine in this content');
    await page.goto(`${BASE}/${prefix}/prompts/#style=${pair![0]}&use=${pair![1]}`);
    await takenOver(page);
    await expect(page.getByRole('heading', { name: message(code, 'feed.filters.empty.title') })).toBeVisible();
    await page
      .getByRole('button', { name: message(code, 'feed.filters.clear') })
      .first()
      .click();
    await expect(page.locator('[role="feed"] article[data-entry]').first()).toBeVisible();
    await expect(page).not.toHaveURL(/use=/);
  });

  test('a detail image that fails to load offers a retry that loads it', async ({ page }) => {
    let fail = true;
    // Every variant of the work's image: the browser picks one from srcset.
    await page.route(new RegExp(`/media/${prompt.cover.assetId}/`), (route) =>
      fail ? route.abort() : route.continue(),
    );
    await page.goto(`${BASE}${prompt.path}`);
    await takenOver(page);
    const alert = page.locator('main [role="alert"]').filter({ hasText: message(code, 'detail.image.failed') });
    await expect(alert).toBeVisible();
    fail = false;
    await alert.getByRole('button', { name: message(code, 'detail.image.retry') }).click();
    await expect(page.locator('main img[fetchpriority="high"]')).toHaveJSProperty('complete', true);
    expect(
      await page.locator('main img[fetchpriority="high"]').evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0);
  });
});

test.describe('§12.8-9: switching theme or language replays no page animation and loses no edits', () => {
  test.skip(!template || !textField, 'needs a template with a required text field');

  test('the theme switch keeps the values and starts no entrance animation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}${template!.path}`);
    await editorReady(page);
    await field(page, textField!.name).fill('Copper kettle');
    await page.waitForTimeout(500); // the draft is written 400 ms after a change
    const before = await page.evaluate(() => document.getAnimations().length);
    await page.getByRole('banner').getByRole('button', { name: /theme/i }).click();
    // Colours may ease between themes (CSS transitions); nothing may enter or develop again.
    const started = await page.evaluate(() =>
      document
        .getAnimations()
        .filter(
          (a) =>
            !(a instanceof CSSTransition) &&
            a.playState === 'running' &&
            (a.effect?.getTiming().iterations ?? 1) !== Infinity,
        )
        .map((a) => (a as CSSAnimation).animationName ?? 'script'),
    );
    expect(started, `animations before: ${before}`).toEqual([]);
    await expect(field(page, textField!.name)).toHaveValue('Copper kettle');
    await expect(preview(page)).toContainText('Copper kettle');
  });

  test('switching language and back keeps the template draft', async ({ page }) => {
    const other = BUILD.locales.find(
      (l) => l.code !== code && localeIndex(l.code).templates.some((t) => t.id === template!.id),
    );
    test.skip(!other, 'the template has no version in another built language');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}${template!.path}`);
    await editorReady(page);
    await field(page, textField!.name).fill('Copper kettle');
    await page.waitForTimeout(500);
    const there = localeIndex(other!.code).templates.find((t) => t.id === template!.id)!;
    await page.goto(`${BASE}${there.path}`);
    await editorReady(page);
    await expect(field(page, textField!.name)).toHaveValue('Copper kettle');
    await page.goBack();
    await editorReady(page);
    await expect(field(page, textField!.name)).toHaveValue('Copper kettle');
  });
});

test.describe('§12.8-10: nothing moves once fonts and images have loaded', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'layout shifts are read with the Layout Instability API');
  test.setTimeout(240_000);
  // Every built language's home and list (CJK and Arabic pages swap other faces than Latin
  // ones), and one Prompt and template page.
  const pages = [
    ...BUILD.locales.flatMap((l) => [
      { name: `${l.code} home`, path: `/${l.pathPrefix}/` },
      { name: `${l.code} list`, path: `/${l.pathPrefix}/prompts/` },
    ]),
    { name: 'prompt', path: prompt.path },
    ...(template ? [{ name: 'template', path: template.path }] : []),
  ];
  for (const vp of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
  ])
    test(`${vp.name}, cold cache on a slow network: layout shift stays under 0.1`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number; __shifts: string[] };
        w.__cls = 0;
        w.__shifts = [];
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
            sources?: { node?: Node }[];
          })[]) {
            if (e.hadRecentInput) continue;
            w.__cls += e.value;
            w.__shifts.push(
              `${e.value.toFixed(3)} ${(e.sources ?? []).map((s) => (s.node as Element | undefined)?.className ?? s.node?.nodeName).join(',')}`,
            );
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await slowColdVisit(page);
      const results: string[] = [];
      for (const { name, path } of pages) {
        await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 60_000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(1000);
        const { cls, shifts } = await page.evaluate(() => {
          const w = window as unknown as { __cls: number; __shifts: string[] };
          return { cls: w.__cls, shifts: w.__shifts };
        });
        results.push(`${name} ${cls.toFixed(3)}`);
        expect(cls, `${name}: ${shifts.join(' | ')}`).toBeLessThan(0.1);
      }
      test.info().annotations.push({ type: 'cls', description: results.join(', ') });
    });
});
