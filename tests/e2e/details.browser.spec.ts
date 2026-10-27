import { expect, test, type Page } from '@playwright/test';
import { BASE, BUILD, message } from './support/artifact';
import { feedIndex, localeIndex, samplePrompt, sampleTemplate } from './support/content';

// The detail checklist of design doc §11.9, row by row (§17.3 step 6). Rows whose behaviour a
// feature spec already proves name that spec instead of repeating it:
// - 复制内容: detail.browser.spec.ts ("copy puts exactly the prompt on the clipboard"), with the
//   normalisation itself in src/ui/feedback/copy.test.ts.
// - 文档标题 in the popup: popup.browser.spec.ts (the title follows the work on show).
// - 记住偏好 for the theme and the shortcut switch: shell.browser.spec.ts, favorites.browser.spec.ts.
// - 一次性提示: favorites.browser.spec.ts ("saving a card … the one-time note").
// - 列表末尾 end marker: list.browser.spec.ts ("scrolling loads every batch by itself").

const [first] = BUILD.locales;
const code = first!.code;
const prefix = first!.pathPrefix;
const prompt = samplePrompt(code);
const template = sampleTemplate(code);
const list = `${BASE}/${prefix}/prompts/`;

const takenOver = (page: Page) =>
  page.waitForFunction(() => {
    const el = document.querySelector('header button, header a[href]');
    return !!el && Object.keys(el).some((k) => k.startsWith('__react'));
  });
const cards = (page: Page) => page.locator('[role="feed"] article[data-entry]:not([data-interlude])');

test.describe('主色占位: the frame shows the work’s colour; the picture fades in once it arrives', () => {
  /** Holds the images of later cards until released, so they arrive after the page has taken over. */
  async function holdLazyImages(page: Page) {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route(/\/media\/.*-card-.*\.webp$/, async (route) => {
      await gate;
      await route.continue();
    });
    // Records, per image, whether an opacity animation runs when it loads.
    await page.addInitScript(() => {
      const seen: { src: string; fades: boolean; ms: number }[] = [];
      (window as unknown as { __fades: typeof seen }).__fades = seen;
      window.addEventListener('DOMContentLoaded', () => {
        document.addEventListener(
          'load',
          (e) => {
            const img = e.target;
            if (!(img instanceof HTMLImageElement)) return;
            // After the page's own listener, which the app adds later and so runs after this one.
            setTimeout(() =>
              seen.push({
                src: img.currentSrc,
                // An opacity fade that takes time (reduced motion turns other reveals into 0 ms).
                fades: img.getAnimations().some((a) => {
                  const frames = (a.effect as KeyframeEffect).getKeyframes();
                  const ms = Number(a.effect?.getTiming().duration) || 0;
                  return ms > 0 && frames.some((k) => 'opacity' in k && Number(k.opacity) === 0);
                }),
                ms: Math.max(0, ...img.getAnimations().map((a) => Number(a.effect?.getTiming().duration) || 0)),
              }),
            );
          },
          true,
        );
      });
    });
    return release;
  }

  test('a card’s frame is its colour, and a later image fades in over about 160 ms', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const release = await holdLazyImages(page);
    // The first rows' images are held too; the page's load event waits for them.
    await page.goto(list, { waitUntil: 'domcontentloaded' });
    await takenOver(page);
    const card = cards(page).nth(14);
    const frame = card.locator('a > span').first();
    const id = await card.getAttribute('data-entry');
    const summary = localeIndex(code).prompts.find((p) => p.id === id)!;
    await card.scrollIntoViewIfNeeded();
    // Before the image arrives the frame shows the work's dominant colour.
    const background = await frame.evaluate((el) => getComputedStyle(el).backgroundColor);
    const hex = summary.cover.placeholder.replace('#', '');
    const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    expect(background).toBe(`rgb(${rgb.join(', ')})`);
    release();
    await expect(card.locator('img')).toHaveJSProperty('complete', true);
    // It fades in over the image duration token, 160 ms.
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { __fades: { fades: boolean; ms: number }[] }).__fades
            .filter((f) => f.fades)
            .map((f) => f.ms),
        ),
      )
      .toContain(160);
  });

  test('with reduced motion the image shows at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 800 });
    const release = await holdLazyImages(page);
    await page.goto(list, { waitUntil: 'domcontentloaded' });
    await takenOver(page);
    const card = cards(page).nth(14);
    await card.scrollIntoViewIfNeeded();
    release();
    await expect(card.locator('img')).toHaveJSProperty('complete', true);
    await page.waitForTimeout(300);
    const fades = await page.evaluate(() => (window as unknown as { __fades: { fades: boolean }[] }).__fades);
    expect(fades.length).toBeGreaterThan(0);
    expect(fades.filter((f) => f.fades)).toEqual([]);
  });
});

test('图片描边: every work on the main pages has the 1 px inner hairline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const paths = [`/${prefix}/`, `/${prefix}/prompts/`, prompt.path, ...(template ? [template.path] : [])];
  for (const path of paths) {
    await page.goto(`${BASE}${path}`);
    await takenOver(page);
    const missing = await page.evaluate(() => {
      const inset = (v: string) => /inset/.test(v) && /1px/.test(v);
      const lined = (img: HTMLImageElement) => {
        const cs = getComputedStyle(img);
        if (cs.outlineStyle !== 'none' && cs.outlineWidth === '1px' && parseFloat(cs.outlineOffset) < 0) return true;
        for (let el: Element | null = img.parentElement, i = 0; el && i < 3; el = el.parentElement, i++)
          if (inset(getComputedStyle(el, '::after').boxShadow) || inset(getComputedStyle(el).boxShadow)) return true;
        return false;
      };
      return [...document.querySelectorAll<HTMLImageElement>('main img')]
        .filter((img) => img.getBoundingClientRect().width > 24 && !lined(img))
        .map((img) => img.currentSrc.split('/').pop());
    });
    expect(missing, path).toEqual([]);
  }
});

test.describe('按钮宽度稳定: copy and save keep their width in every built language', () => {
  for (const locale of BUILD.locales)
    test(locale.code, async ({ page, context, browserName }) => {
      test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only in Playwright');
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE}${samplePrompt(locale.code).path}`);
      await takenOver(page);
      const copy = page.locator('section button[id$="-copy"]');
      const save = page.locator('main [data-shortcut="save"]');
      const before = [(await copy.boundingBox())!.width, (await save.boundingBox())!.width];
      await copy.click();
      await expect(copy).toContainText(message(locale.code, 'detail.copy.done'));
      await save.click();
      await expect(save).toHaveAttribute('aria-pressed', 'true');
      expect([(await copy.boundingBox())!.width, (await save.boundingBox())!.width]).toEqual(before);
    });
});

test('数字不跳动: counts, sizes and dates use digits of one width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  /** Visible elements under `selector` whose text is a count, size or date, and whether their digits are tabular. */
  const numerals = (selector: string) =>
    page.locator(selector).evaluateAll((els) =>
      els
        .filter(
          (el) =>
            el.getClientRects().length &&
            /^[\d\s,.:·×/年月日-]+$|\d{4}|\d+\s*×\s*\d+|\b\d+:\d+\b|^\d+$/.test((el.textContent ?? '').trim()),
        )
        .map((el) => {
          const cs = getComputedStyle(el);
          return {
            text: (el.textContent ?? '').trim().slice(0, 30),
            tabular: cs.fontVariantNumeric.includes('tabular') || /mono/i.test(cs.fontFamily),
          };
        }),
    );
  const expectTabular = (rows: { text: string; tabular: boolean }[]) => {
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row, row.text).toMatchObject({ tabular: true });
  };
  await page.goto(list);
  await takenOver(page);
  expectTabular(
    await numerals('main [class*="count"], [role="feed"] [id$="-facts"], [data-feed-state] p, main [class*="meta"]'),
  );
  await page.goto(`${BASE}${prompt.path}`);
  await takenOver(page);
  expectTabular(await numerals('main dd, main figcaption span, main p span, main time'));
  await page.goto(`${BASE}/${prefix}/search/?q=${encodeURIComponent(prompt.title.split(' ')[0]!)}`);
  await takenOver(page);
  await expect(page.locator('main [class*="status"]').first()).toContainText(/\d/);
  const status = await page
    .locator('main [class*="status"]')
    .first()
    .evaluate((el) => getComputedStyle(el).fontVariantNumeric);
  expect(status).toContain('tabular');
});

test('绝对日期: test and update dates are absolute and formatted for the language', async ({ page }) => {
  for (const locale of BUILD.locales) {
    const detail = samplePrompt(locale.code);
    if (!detail.lastTestedAt) continue;
    await page.goto(`${BASE}${detail.path}`);
    // Bidi marks (U+200F in Arabic dates) are invisible, and Firefox's text of the page has none.
    const bare = (s: string) => s.replace(/[‎‏؜]/g, '');
    const text = bare(await page.locator('main').innerText()).replace(/\s+/g, ' ');
    const expected = new Intl.DateTimeFormat(locale.htmlLang, { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date(`${detail.lastTestedAt}T00:00:00Z`),
    );
    expect(text, locale.code).toContain(bare(expected));
    expect(text).not.toMatch(/\b(ago|yesterday|today)\b|前$|天前|日前/);
  }
});

test('浏览器界面配色: both colour schemes are declared, and the browser chrome follows each', async ({ page }) => {
  await page.goto(`${BASE}/${prefix}/`);
  const metas = await page.evaluate(() =>
    [...document.head.querySelectorAll('meta[name="color-scheme"], meta[name="theme-color"]')].map((m) => ({
      name: m.getAttribute('name'),
      content: m.getAttribute('content'),
      media: m.getAttribute('media'),
    })),
  );
  expect(metas).toContainEqual({ name: 'color-scheme', content: 'light dark', media: null });
  expect(metas.filter((m) => m.name === 'theme-color').map((m) => m.media)).toEqual([
    '(prefers-color-scheme: light)',
    '(prefers-color-scheme: dark)',
  ]);
});

test('选中文字: selected text sits on accent-subtle in both themes', async ({ page }) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`${BASE}${prompt.path}`);
    const colours = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--accent-subtle)';
      document.body.append(probe);
      const token = getComputedStyle(probe).color;
      probe.remove();
      return { selection: getComputedStyle(document.querySelector('main p')!, '::selection').backgroundColor, token };
    });
    expect(colours.selection, scheme).toBe(colours.token);
  }
});

test('悬停效果: hover styles apply only with a fine pointer that can hover', async ({ page }) => {
  for (const path of [`/${prefix}/`, `/${prefix}/prompts/`, prompt.path, `/${prefix}/collections/`]) {
    await page.goto(`${BASE}${path}`);
    await takenOver(page);
    const outside = await page.evaluate(() => {
      const found: string[] = [];
      const walk = (rules: CSSRuleList, guarded: boolean, reducing: boolean) => {
        for (const rule of rules) {
          if (rule instanceof CSSMediaRule)
            walk(
              rule.cssRules,
              guarded || /hover:\s*hover/.test(rule.conditionText),
              reducing || /prefers-reduced-motion/.test(rule.conditionText),
            );
          else if (rule instanceof CSSStyleRule) {
            // Rules under reduced motion only switch movement off, hover included.
            if (/:hover/.test(rule.selectorText) && !guarded && !reducing) found.push(rule.selectorText);
            if (rule.cssRules.length) walk(rule.cssRules, guarded, reducing);
          } else if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules, guarded, reducing);
        }
      };
      for (const sheet of document.styleSheets) walk(sheet.cssRules, false, false);
      return found;
    });
    expect(outside, path).toEqual([]);
  }
});

test.describe('横向滚动: rows that scroll sideways snap, fade at the edge with more, and have visible buttons', () => {
  test('the list’s style tabs at 1024 px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(list);
    await takenOver(page);
    const tabs = page.getByRole('group', { name: message(code, 'feed.filters.style') });
    const overflows = await tabs.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    test.skip(!overflows, 'the style tabs fit at this width');
    const row = tabs.locator('xpath=..');
    expect(await tabs.evaluate((el) => getComputedStyle(el).scrollSnapType)).toMatch(/x|inline/);
    const back = row.getByRole('button', { name: message(code, 'primitives.scrollRow.previous') });
    const forward = row.getByRole('button', { name: message(code, 'primitives.scrollRow.next') });
    // At the start: more content at the end, faded there, and only the forward button.
    await expect(forward).toBeVisible();
    await expect(back).toBeHidden();
    expect(await tabs.evaluate((el) => getComputedStyle(el).maskImage)).toMatch(/gradient/);
    const offset = () => tabs.evaluate((el) => Math.abs(el.scrollLeft));
    /** Presses forward and waits for the smooth scroll to come to rest. */
    const press = async () => {
      const before = await offset();
      await forward.click();
      await expect.poll(offset).toBeGreaterThan(before);
      let previous = -1;
      await expect
        .poll(async () => {
          const now = await offset();
          const still = now === previous;
          previous = now;
          return still;
        })
        .toBe(true);
    };
    await press();
    await expect(back).toBeVisible();
    // The last tab can be reached and pressed with the pointer alone; no tab was chosen meanwhile.
    for (let i = 0; i < 10 && (await forward.isVisible()); i++) await press();
    await expect(page).not.toHaveURL(/#/);
    await expect(forward).toBeHidden();
    const last = tabs.getByRole('button').last();
    await expect(last).toBeInViewport({ ratio: 1 });
  });

  test('related works on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}${prompt.path}`);
    await takenOver(page);
    const rows = page.locator('main section ul').filter({ has: page.locator('li a[href] img') });
    const row = rows.last();
    await row.scrollIntoViewIfNeeded();
    const overflows = await row.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    test.skip(!overflows, 'the related row fits');
    expect(await row.evaluate((el) => getComputedStyle(el).scrollSnapType)).toMatch(/x|inline/);
    const forward = row.locator('xpath=..').getByRole('button', { name: message(code, 'primitives.scrollRow.next') });
    await expect(forward).toBeVisible();
    await forward.click();
    await expect.poll(() => row.evaluate((el) => Math.abs(el.scrollLeft))).toBeGreaterThan(0);
  });
});

test('标题截断: a card title stays on one line with an ellipsis; the whole title is in the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(list);
  await takenOver(page);
  const titles = await cards(page).evaluateAll((els) =>
    els.slice(0, 24).map((card) => {
      const title = document.getElementById(card.getAttribute('aria-labelledby')!)!;
      const cs = getComputedStyle(title);
      return {
        text: title.textContent ?? '',
        truncated: title.scrollWidth > title.clientWidth,
        ellipsis: cs.textOverflow === 'ellipsis' && cs.whiteSpace === 'nowrap',
      };
    }),
  );
  expect(titles.every((t) => t.ellipsis)).toBe(true);
  const cut = titles.find((t) => t.truncated);
  test.skip(!cut, 'no title is long enough to be cut at this width');
  // The full title is the card's accessible name.
  await expect(page.getByRole('article', { name: cut!.text, exact: true }).first()).toBeAttached();
});

test('列表末尾: a slow batch shows frames at work ratios after 300 ms; a quick one shows nothing', async ({ page }) => {
  test.skip(feedIndex(code).pageCount < 3, 'needs three pages');
  await page.setViewportSize({ width: 1280, height: 800 });
  let delay = 60;
  await page.route(/\/feed\/latest\/\d+\.json$/, async (route) => {
    await new Promise((r) => setTimeout(r, delay));
    await route.continue();
  });
  await page.goto(list);
  await takenOver(page);
  type Seen = { frame: number; start: number | null; visible: number | null; ratios: number[] };
  // Timed on the frame clock that runs the delay: `start` is the last frame before placeholder
  // frames entered the feed (a mutation observer sees them at once), and the delay counts from the
  // first frame that draws them, never earlier; `visible` is the first frame they show in. Timing
  // from the insertion itself comes up to a frame short when it lands mid-frame (283 ms in CI).
  const watch = () =>
    page.evaluate(() => {
      const seen: Seen = { frame: performance.now(), start: null, visible: null, ratios: [] };
      (window as unknown as { __seen: Seen }).__seen = seen;
      const selector = '[role="feed"] > span[aria-hidden="true"][class*="placeholder"]';
      new MutationObserver(() => {
        if (document.querySelector(selector)) seen.start ??= seen.frame;
      }).observe(document.body, { childList: true, subtree: true });
      const check = (now: number) => {
        seen.frame = now;
        const frames = [...document.querySelectorAll(selector)];
        if (frames.length) {
          if (frames.some((el) => getComputedStyle(el).opacity !== '0')) {
            seen.visible ??= now;
            seen.ratios = frames.map((el) => el.getBoundingClientRect().width / el.getBoundingClientRect().height);
          }
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  const seen = () => page.evaluate(() => (window as unknown as { __seen: Seen }).__seen);
  const state = page.locator('[data-feed-state]');
  for (const ms of [60, 1500]) {
    delay = ms;
    await watch();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // A 60 ms batch can be done before the state is read, so wait for its frames instead.
    await expect.poll(async () => (await seen()).start).not.toBeNull();
    await expect(state).toHaveAttribute('data-feed-state', 'idle', { timeout: 10_000 });
    const s = await seen();
    expect(s.start, `${ms} ms: frames take their place while loading`).not.toBeNull();
    if (s.visible !== null) expect(s.visible - s.start!, `${ms} ms`).toBeGreaterThanOrEqual(300);
    if (ms > 300) {
      expect(s.visible, `${ms} ms`).not.toBeNull();
      for (const r of s.ratios) expect(r).toBeGreaterThan(0.5);
    }
  }
});

test('加载指示: the popup says it is loading only once loading has taken 300 ms', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  type Seen = { pressed: number | null; visible: number | null };
  for (const delay of [60, 1500]) {
    await page.unrouteAll();
    await page.route(/\/generated\/[^/]+\/prompts\/[^/]+\.json$/, async (route) => {
      await new Promise((r) => setTimeout(r, delay));
      await route.continue();
    });
    await page.goto(list);
    await takenOver(page);
    // When the work was pressed, and when the "loading" status first became visible.
    await page.evaluate(
      (text) => {
        const seen: Seen = { pressed: null, visible: null };
        (window as unknown as { __seen: Seen }).__seen = seen;
        document.addEventListener('pointerdown', () => (seen.pressed ??= performance.now()), true);
        const check = () => {
          const el = [...document.querySelectorAll('dialog[data-popup] [role="status"]')].find(
            (s) => s.textContent === text,
          );
          if (el && getComputedStyle(el).opacity !== '0') seen.visible ??= performance.now();
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      },
      message(code, 'popup.loading'),
    );
    await cards(page).nth(4).locator('a').click();
    await expect(page.locator('dialog[data-popup] [id$="-prompt"]').first()).toBeVisible({ timeout: 5000 });
    const seen = await page.evaluate(() => (window as unknown as { __seen: Seen }).__seen);
    // Never visible within 300 ms of the press. Timed from the press, not from when a frame first
    // saw the status: a busy frame (WebKit) samples late and would shorten the wait it measures.
    if (seen.visible !== null) expect(seen.visible - seen.pressed!, `${delay} ms`).toBeGreaterThanOrEqual(300);
    // A slow load does say so.
    if (delay > 300) expect(seen.visible, `${delay} ms`).not.toBeNull();
  }
});

test.describe('自动聚焦: only search takes focus on arrival; phones get no keyboard', () => {
  for (const vp of [
    { name: 'desktop', width: 1280, height: 800, touch: false },
    { name: 'phone', width: 390, height: 844, touch: true },
  ])
    test(vp.name, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.touch,
        isMobile: vp.touch,
      });
      const page = await context.newPage();
      const pages = [
        `/${prefix}/`,
        `/${prefix}/prompts/`,
        prompt.path,
        ...(template ? [template.path] : []),
        `/${prefix}/explore/`,
        `/${prefix}/favorites/`,
      ];
      for (const path of pages) {
        await page.goto(`${BASE}${path}`);
        await takenOver(page);
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => document.activeElement?.tagName), path).toBe('BODY');
      }
      await page.goto(`${BASE}/${prefix}/search/`);
      await takenOver(page);
      const field = page.getByRole('searchbox');
      if (vp.touch) {
        await page.waitForTimeout(300);
        await expect(field).not.toBeFocused();
      } else await expect(field).toBeFocused();
      await context.close();
    });
});

test('文档标题: “{title} · {kind} · {site}” on Prompt and template pages', async ({ page }) => {
  await page.goto(`${BASE}${prompt.path}`);
  await expect(page).toHaveTitle(
    message(code, 'detail.documentTitle', {
      title: prompt.seo.title,
      kind: message(code, 'detail.kinds.prompt'),
      siteName: BUILD.siteName,
    }),
  );
  test.skip(!template, 'no template');
  await page.goto(`${BASE}${template!.path}`);
  await expect(page).toHaveTitle(
    message(code, 'detail.documentTitle', {
      title: template!.seo.title,
      kind: message(code, 'detail.kinds.template'),
      siteName: BUILD.siteName,
    }),
  );
});

test('外部链接: links to other sites say so with ↗ and stay in this tab; the original image opens apart', async ({
  page,
}) => {
  const paths = [prompt.path, ...localeIndex(code).pages.map((p) => p.path)];
  let checked = 0;
  for (const path of paths) {
    await page.goto(`${BASE}${path}`);
    const links = await page.locator('main a[href^="http"]').evaluateAll((els) =>
      els
        .filter((a) => new URL((a as HTMLAnchorElement).href).host !== location.host)
        .map((a) => ({
          href: (a as HTMLAnchorElement).href,
          target: (a as HTMLAnchorElement).target,
          arrow: /↗/.test(`${a.textContent}${getComputedStyle(a, '::after').content}`) || !!a.querySelector('svg'),
        })),
    );
    for (const link of links) expect(link, `${path} ${link.href}`).toMatchObject({ target: '', arrow: true });
    checked += links.length;
  }
  expect(checked).toBeGreaterThan(0);
  await page.goto(`${BASE}${prompt.path}`);
  await expect(page.locator('main a[href*="-original-"]').first()).toHaveAttribute('target', '_blank');
});

test('记住偏好: sort and filters live in the address only, never on the device', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(list);
  await takenOver(page);
  const tabs = page.getByRole('group', { name: message(code, 'feed.filters.style') });
  await tabs.getByRole('button').nth(1).click();
  await expect(page).toHaveURL(/#/);
  const stored = await page.evaluate(() => Object.entries(localStorage).map(([k, v]) => `${k}=${v}`));
  for (const entry of stored) expect(entry).not.toMatch(/style|sort|shape|use=/);
  await page.goto(list);
  await takenOver(page);
  await expect(tabs.getByRole('button').first()).toHaveAttribute('aria-pressed', 'true');
});
