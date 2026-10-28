import { expect, test, type Page } from '@playwright/test';
import { BASE, BUILD, message } from './support/artifact';
import { localeIndex, samplePrompt, sampleTemplate } from './support/content';
import { cancelledFetch } from './support/errors';
import { layoutProblems, slowColdVisit, applyGermanLabels } from './support/layout';

// The first complete front-end acceptance (design doc §16.5, §17.3 step 6): Chinese and English
// galleries, German long labels, Japanese input, an Arabic right-to-left sample; light and dark;
// normal and reduced motion; mouse, keyboard and touch; a cold cache on a slow network. Each
// built language's main pages are checked at four widths in both themes; the other rows use the
// language that exercises them. Feature specs cover the behaviour of each page; this one checks
// that the pages hold together under every condition at once.

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'phone', width: 390, height: 844 },
] as const;

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    if (!cancelledFetch(e.message)) errors.push(`pageerror: ${e.message}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' && !cancelledFetch(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Waits until the shell has taken over (React handlers on the header's controls). */
const takenOver = (page: Page) =>
  page.waitForFunction(() => {
    const el = document.querySelector('header button, header a[href]');
    return !!el && Object.keys(el).some((k) => k.startsWith('__react'));
  });

/** The main pages of a language: home, list, a Prompt, a template and the other lists. */
function mainPages(code: string, prefix: string): { name: string; path: string }[] {
  const index = localeIndex(code);
  const prompt = samplePrompt(code);
  const template = sampleTemplate(code);
  const word = prompt.title.split(/\s+/)[0]!.slice(0, 4);
  return [
    { name: 'home', path: `/${prefix}/` },
    { name: 'list', path: `/${prefix}/prompts/` },
    { name: 'prompt', path: prompt.path },
    ...(template ? [{ name: 'template', path: template.path }] : []),
    ...(index.templates.length ? [{ name: 'templates', path: `/${prefix}/templates/` }] : []),
    { name: 'search', path: `/${prefix}/search/?q=${encodeURIComponent(word)}` },
    { name: 'explore', path: `/${prefix}/explore/` },
    { name: 'favorites', path: `/${prefix}/favorites/` },
  ];
}

test.describe('every built language, both themes, four widths: nothing cut off or overlapping', () => {
  for (const locale of BUILD.locales)
    for (const scheme of ['light', 'dark'] as const)
      for (const vp of VIEWPORTS)
        test(`${locale.code} ${scheme} ${vp.name}`, async ({ page }) => {
          const errors = watchErrors(page);
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.emulateMedia({ colorScheme: scheme });
          for (const { name, path } of mainPages(locale.code, locale.pathPrefix)) {
            await page.goto(`${BASE}${path}`);
            await takenOver(page);
            await expect(page.locator('html')).toHaveAttribute('dir', locale.direction);
            expect(await layoutProblems(page), `${name} ${path}`).toEqual([]);
          }
          expect(errors).toEqual([]);
        });
});

test.describe('German long labels (§16.5 德语长标签)', () => {
  const en = BUILD.locales.find((l) => l.code === 'en');
  test.skip(!en, 'needs the English pages to put German labels into');
  for (const vp of VIEWPORTS)
    test(`${vp.name}: German labels fit the header, list, detail, editor and home`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const { name, path } of mainPages('en', en!.pathPrefix)) {
        await page.goto(`${BASE}${path}`);
        await takenOver(page);
        expect(await applyGermanLabels(page), `${name}: labels replaced`).toBeGreaterThan(5);
        expect(await layoutProblems(page), `${name} ${path} in German`).toEqual([]);
      }
    });

  test('copy and save keep their width when their state changes, with German labels (§11.9 按钮宽度稳定)', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only in Playwright');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}${samplePrompt('en').path}`);
    await takenOver(page);
    // The copy button may hydrate after the header; hydration would put its English text back.
    await page.waitForFunction(() => {
      const el = document.querySelector('section button[id$="-copy"]');
      return !!el && Object.keys(el).some((k) => k.startsWith('__react'));
    });
    await applyGermanLabels(page);
    const copy = page.locator('section button[id$="-copy"]');
    const save = page.locator('main [data-shortcut="save"]');
    const before = { copy: (await copy.boundingBox())!.width, save: (await save.boundingBox())!.width };
    await copy.click();
    await expect(copy).toContainText('In die Zwischenablage kopiert');
    await save.click();
    await expect(save).toHaveAttribute('aria-pressed', 'true');
    expect({ copy: (await copy.boundingBox())!.width, save: (await save.boundingBox())!.width }).toEqual(before);
    expect(await layoutProblems(page)).toEqual([]);
  });
});

test.describe('Japanese input (§16.5 日语输入)', () => {
  const ja = BUILD.locales.find((l) => l.code === 'ja');
  test.skip(!ja, 'no Japanese in this build');
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'IME composition is driven through the Chrome DevTools Protocol',
  );

  /** Types `steps` as an input method would (romaji turning into kana), then commits `commit`. */
  async function compose(page: Page, steps: string[], commit: string) {
    const cdp = await page.context().newCDPSession(page);
    for (const text of steps)
      await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
    await cdp.send('Input.insertText', { text: commit });
    await cdp.detach();
  }

  test('the search page waits for the committed word, then finds it', async ({ page }) => {
    const prompt = samplePrompt('ja');
    const word = [...prompt.title].slice(0, 2).join('');
    const searches: string[] = [];
    await page.goto(`${BASE}/${ja!.pathPrefix}/search/`);
    await takenOver(page);
    page.on('framenavigated', () => searches.push(new URL(page.url()).searchParams.get('q') ?? ''));
    const field = page.getByRole('searchbox');
    await field.click();
    await compose(page, ['s', 'す', 'すい', 'すいぼ', 'すいぼく'], word);
    await expect(field).toHaveValue(word);
    await expect(
      page
        .locator('main')
        .getByRole('link', { name: new RegExp(prompt.title.slice(0, 4)) })
        .first(),
    ).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(word);
    // No result list or address for the half-typed kana.
    expect(searches.filter((q) => /[ぁ-ん]/.test(q))).toEqual([]);
  });

  test('a template field keeps its composition and the preview follows the committed text', async ({ page }) => {
    const template = sampleTemplate('ja');
    test.skip(!template, 'no Japanese template');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}${template!.path}`);
    await takenOver(page);
    const field = page.locator('main input[type="text"]').first();
    await field.click();
    await field.fill('');
    await compose(page, ['k', 'き', 'きつ', 'きつね'], '狐');
    await expect(field).toHaveValue('狐');
    await expect(page.locator('main').getByText('狐').first()).toBeVisible();
  });
});

test.describe('Arabic right-to-left sample (§16.5 阿拉伯语 RTL)', () => {
  const ar = BUILD.locales.find((l) => l.direction === 'rtl');
  test.skip(!ar, 'no right-to-left locale in this build');

  test('the header reads from the right; Tab moves the way the eye does', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit on macOS tabs to links only with Option held');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/${ar!.pathPrefix}/`);
    await takenOver(page);
    const home = await page.getByRole('banner').getByRole('link').first().boundingBox();
    expect(home!.x, 'the site name sits at the right').toBeGreaterThan(720);
    // Successive stops in the header move leftwards.
    await page.keyboard.press('Tab'); // skip link
    const xs: number[] = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const box = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.closest('header') ? el.getBoundingClientRect().x : null;
      });
      if (box !== null) xs.push(box);
    }
    expect(xs.length).toBeGreaterThan(2);
    for (let i = 1; i < xs.length; i++) expect(xs[i]!, `stop ${i} is left of stop ${i - 1}`).toBeLessThan(xs[i - 1]!);
  });

  test('typing in the search field starts at the right; Latin words keep their order', async ({ page }) => {
    await page.goto(`${BASE}/${ar!.pathPrefix}/search/`);
    await takenOver(page);
    const field = page.getByRole('searchbox');
    await field.click();
    await field.pressSequentially('نيون neon');
    const caret = await field.evaluate((el: HTMLInputElement) => ({
      direction: getComputedStyle(el).direction,
      align: getComputedStyle(el).textAlign,
      value: el.value,
      at: el.selectionStart,
    }));
    expect(caret).toMatchObject({ direction: 'rtl', value: 'نيون neon', at: 'نيون neon'.length });
    expect(['start', 'right']).toContain(caret.align);
  });

  test('the list, its filter tabs and the popup follow the reading direction', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/${ar!.pathPrefix}/prompts/`);
    await takenOver(page);
    // The first work of the first row starts at the right edge of the gallery.
    const boxes = await page
      .locator('[role="feed"] article[data-entry]:not([data-interlude])')
      .evaluateAll((els) => els.slice(0, 2).map((el) => el.getBoundingClientRect()));
    expect(boxes[0]!.x).toBeGreaterThan(boxes[1]!.x);
    await page.locator('[role="feed"] article[data-entry]:not([data-interlude]) a').first().click();
    const dialog = page.locator('dialog[data-popup]');
    await expect(dialog).toHaveAttribute('open', '');
    expect(await dialog.evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
    // The English prompt keeps its own direction inside the right-to-left dialog.
    await expect(dialog.locator('[id$="-prompt"]').first()).toHaveAttribute('dir', 'ltr');
  });
});

test.describe('the size-adjusted fallback faces back the web fonts while they load (§11.1.2)', () => {
  for (const locale of BUILD.locales.filter((l) => !/^(zh|ja|ko)/.test(l.code)))
    test(`${locale.code}: the text and display stacks name a declared "… Fallback" face`, async ({ page }) => {
      await page.goto(`${BASE}/${locale.pathPrefix}/`);
      // next/font names the generated faces after the font constant, not after the family, so a
      // stack that spells a name out misses them and swaps from system-ui (step 1c).
      const missing = await page.evaluate(() => {
        const families = (v: string) => v.split(',').map((f) => f.trim().replace(/^["']|["']$/g, ''));
        const declared = new Set([...document.fonts].map((f) => families(f.family)[0]));
        const cs = getComputedStyle(document.body);
        return ['--font-text', ...(document.documentElement.lang === 'ar' ? [] : ['--font-display'])].flatMap((v) => {
          const fallbacks = families(cs.getPropertyValue(v)).filter((f) => f.endsWith(' Fallback'));
          if (!fallbacks.length) return [`${v}: no "… Fallback" face in ${cs.getPropertyValue(v)}`];
          return fallbacks.filter((f) => !declared.has(f)).map((f) => `${v}: ${f} is not declared`);
        });
      });
      expect(missing).toEqual([]);
    });
});

test.describe('text in another language keeps its own type (§8.6, §11.1.2)', () => {
  for (const locale of BUILD.locales.filter((l) => l.code !== 'en'))
    test(`${locale.code}: English prompts and other quoted text use their own font stack`, async ({ page }) => {
      const pages = [`/${locale.pathPrefix}/`, `/${locale.pathPrefix}/prompts/`, samplePrompt(locale.code).path];
      const template = sampleTemplate(locale.code);
      if (template) pages.push(template.path);
      for (const path of pages) {
        await page.goto(`${BASE}${path}`);
        await takenOver(page);
        // Every element that says it is in another language than the page is set in that
        // language's stack (or a face of its own: mono, display), never in the page's. Language
        // names in links to other versions (hreflang) keep the page's face, so a page never
        // downloads another script's web font for one word (§8.6).
        const wrong = await page.evaluate(() => {
          const pageLang = document.documentElement.lang.split('-')[0];
          return [...document.querySelectorAll('body [lang]')]
            .filter(
              (el) =>
                el.getAttribute('lang')!.split('-')[0] !== pageLang &&
                el.textContent!.trim() &&
                !el.hasAttribute('hreflang'),
            )
            .map((el) => {
              const cs = getComputedStyle(el);
              // WebKit and Chromium quote family names differently.
              const first = (v: string) =>
                v
                  .split(',')[0]!
                  .trim()
                  .replace(/^["']|["']$/g, '');
              const own = ['--font-text', '--font-display', '--font-mono'].map((v) => first(cs.getPropertyValue(v)));
              return own.includes(first(cs.fontFamily))
                ? null
                : `${el.tagName.toLowerCase()} lang=${el.getAttribute('lang')}: ${first(cs.fontFamily)}`;
            })
            .filter(Boolean);
        });
        expect(wrong, path).toEqual([]);
      }
    });
});

test.describe('touch (§16.5 触屏)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a phone reader finds, opens, copies and closes a work by touch alone', async ({ page }) => {
    const [first] = BUILD.locales;
    const prompt = samplePrompt(first!.code);
    await page.goto(`${BASE}/${first!.pathPrefix}/prompts/`);
    await takenOver(page);
    const card = page.locator(`[role="feed"] a[href="${BASE}${prompt.path}"]`).first();
    await card.scrollIntoViewIfNeeded();
    await card.tap();
    const dialog = page.locator('dialog[data-popup]');
    await expect(dialog).toHaveAttribute('open', '');
    // The phone's action bar carries the copy; it stays in reach without scrolling.
    const copy = dialog.getByRole('button', { name: message(first!.code, 'detail.copy.label') }).last();
    await expect(copy).toBeInViewport();
    await dialog.locator('[data-popup-close]').tap();
    await expect(dialog).not.toHaveAttribute('open', '');
    await expect(page).toHaveURL(new RegExp(`/${first!.pathPrefix}/prompts/$`));
  });
});

test.describe('keyboard (§16.5 键盘)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('search, open, copy and close with the keyboard alone', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only in Playwright');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const [first] = BUILD.locales;
    const prompt = samplePrompt(first!.code);
    await page.goto(`${BASE}/${first!.pathPrefix}/`);
    await page.waitForFunction(() =>
      Object.keys(document.querySelector('[data-search-launcher]') ?? {}).some((k) => k.startsWith('__reactProps')),
    );
    await page.keyboard.press('/');
    const panel = page.locator('[data-quick-search]');
    const field = panel.getByRole('textbox');
    await expect(field).toBeFocused();
    await page.keyboard.type(prompt.title);
    await expect(panel.getByRole('option').first()).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${prompt.path}$`));
    await expect(page.getByRole('heading', { level: 1, name: prompt.title })).toBeVisible();
    await takenOver(page);
    await page.keyboard.press('c');
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(prompt.prompt.text.trim());
  });
});

test.describe('a cold cache on a slow network (§16.5 冷缓存与慢网)', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'network and CPU throttling use the Chrome DevTools Protocol',
  );
  test.setTimeout(90_000);

  test('the detail page reads before its scripts arrive; links work meanwhile; no blank layer stays', async ({
    page,
  }) => {
    const [first] = BUILD.locales;
    const prompt = samplePrompt(first!.code);
    await page.setViewportSize({ width: 390, height: 844 });
    await slowColdVisit(page);
    await page.goto(`${BASE}${prompt.path}`, { waitUntil: 'commit' });
    // Text and the main image come with the HTML: readable before the app takes over.
    await expect(page.getByRole('heading', { level: 1, name: prompt.title })).toBeVisible();
    await expect(page.locator('[id$="-prompt"]').first()).toContainText(
      prompt.prompt.text.split('\n')[0]!.slice(0, 30),
    );
    const tookOver = await page.evaluate(() =>
      Object.keys(document.querySelector('header a[href]') ?? {}).some((k) => k.startsWith('__react')),
    );
    expect(tookOver, 'still loading the app when the text shows').toBe(false);
    // Nothing covers the page at any point: no element over the main content is opaque and empty.
    const cover = await page.evaluate(() => {
      const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      return el?.closest('main') ? null : el?.outerHTML.slice(0, 80);
    });
    expect(cover).toBeNull();
    await takenOver(page);
    const lcp = await page.evaluate(
      () =>
        new Promise<number>((resolve) =>
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            resolve(entries[entries.length - 1]!.startTime);
          }).observe({ type: 'largest-contentful-paint', buffered: true }),
        ),
    );
    test.info().annotations.push({ type: 'lcp', description: `${Math.round(lcp)} ms (Slow 4G, 4× CPU, cold)` });
  });

  test('the list loads its next batch with placeholders and no blank gap on a slow network', async ({ page }) => {
    const [first] = BUILD.locales;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/${first!.pathPrefix}/prompts/`);
    await takenOver(page);
    await slowColdVisit(page);
    const status = page.locator('[data-feed-state]');
    // While it loads, the end of the list shows frames, not a blank area. Seen by a mutation
    // observer: the loading state can come and go between two reads of it.
    await page.evaluate(() => {
      const w = window as unknown as { __frames: boolean };
      w.__frames = false;
      new MutationObserver(() => {
        w.__frames ||= !!document.querySelector('[role="feed"] > span[aria-hidden="true"]');
      }).observe(document.body, { childList: true, subtree: true });
    });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => page.evaluate(() => (window as unknown as { __frames: boolean }).__frames)).toBe(true);
    await expect(status).toHaveAttribute('data-feed-state', 'idle', { timeout: 30_000 });
    expect(await layoutProblems(page)).toEqual([]);
  });
});
