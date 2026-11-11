import { expect, test, type Page } from '@playwright/test';
import { BASE, BUILD, homePath } from './support/artifact';
import { feedPage } from './support/content';

const locale = BUILD.locales[0]!;
const cards = feedPage(locale.code, 1).blocks.flatMap((block) => (block.t === 'cards' ? block.items : []));
const work = cards.find((card) => card.cover.height > card.cover.width && card.title.length > 60) ?? cards[0]!;
const href = `${BASE}/${locale.pathPrefix}/prompts/${work.slug}/`;

async function expectToolbar(page: Page, scrolled: boolean) {
  const geometry = await page.locator('dialog[data-popup]').evaluate((dialog) => {
    const close = dialog.querySelector<HTMLElement>('[data-popup-close]')!;
    const bar = close.parentElement!;
    const bounds = bar.getBoundingClientRect();
    const buttons = [...bar.querySelectorAll('button')].map((button) => button.getBoundingClientRect());
    return {
      top: bounds.top,
      overflow: dialog.scrollWidth - dialog.clientWidth,
      contained: buttons.every(
        (button) =>
          button.top >= bounds.top &&
          button.bottom <= bounds.bottom &&
          button.left >= bounds.left &&
          button.right <= bounds.right &&
          button.width >= 44 &&
          button.height >= 44,
      ),
      separate: buttons.every((button, index) =>
        buttons.slice(index + 1).every((other) => button.right <= other.left || other.right <= button.left),
      ),
      covered: [0.25, 0.6, 0.9].every((fraction) =>
        bar.contains(document.elementFromPoint(bounds.left + bounds.width * fraction, bounds.top + 2)),
      ),
    };
  });
  expect(geometry).toMatchObject({ overflow: 0, contained: true, separate: true, covered: true });
  if (scrolled) expect(geometry.top).toBeLessThanOrEqual(1);
}

for (const viewport of [
  { width: 1512, height: 861 },
  { width: 1280, height: 720 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]) {
  test(`popup toolbar stays separate and covers scrolling content at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${BASE}/${locale.pathPrefix}/prompts/`);
    await page.waitForFunction(() => {
      const host = document.querySelector('[data-popup-host]');
      return host && Object.keys(host).some((key) => key.startsWith('__reactProps'));
    });
    await page.locator(`[role="feed"] a[href="${href}"]`).first().click();
    const dialog = page.locator('dialog[data-popup]');
    await expect(dialog.locator('[data-detail]')).toBeVisible();
    await expectToolbar(page, false);

    // Native dialog scrolling must pin the toolbar flush with its viewport. Padding on the
    // scroll container used to leave a strip of moving body text above the sticky toolbar.
    await dialog.evaluate((element) => element.scrollTo(0, 600));
    await expect.poll(() => dialog.evaluate((element) => element.scrollTop)).toBe(600);
    await expectToolbar(page, true);
    await dialog.locator('[data-popup-close]').click();
    await expect(dialog).not.toHaveAttribute('open', '');
  });
}

test('popup navigation survives a later primitive stylesheet from another route', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 861 });
  await page.goto(`${BASE}${homePath(locale)}`);
  await page.waitForFunction(() => {
    const host = document.querySelector('[data-popup-host]');
    return host && Object.keys(host).some((key) => key.startsWith('__reactProps'));
  });
  const link = page.locator('[data-popup-host] a[href*="/prompts/"]').first();
  await link.click();
  const dialog = page.locator('dialog[data-popup]');
  await expect(dialog.locator('[data-detail]')).toBeVisible();

  // Reapply the actual shared button rules last, as route chunks / Fast Refresh can do.
  // The old fixed arrows lost position:fixed to the primitive's position:relative, while
  // retaining their offsets and translate, so both arrows landed on top of each other.
  await page.evaluate(() => {
    const button = document.querySelector('[data-popup-close]')!;
    const matches: string[] = [];
    const visit = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule && rule.style.position === 'relative' && button.matches(rule.selectorText))
          matches.push(rule.cssText);
        else if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules);
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        visit(sheet.cssRules);
      } catch {
        // Cross-origin font stylesheets do not expose their rules.
      }
    }
    if (!matches.length) throw new Error('shared button position rule not found');
    const style = document.createElement('style');
    style.textContent = `@layer components { ${matches.join('\n')} }`;
    document.head.append(style);
  });
  await expectToolbar(page, false);
  await dialog.evaluate((element) => element.scrollTo(0, 600));
  await expectToolbar(page, true);
  const slug = await dialog.getAttribute('data-popup-slug');
  await dialog.locator('[data-popup-step="next"]').click();
  await expect(dialog).not.toHaveAttribute('data-popup-slug', slug!);
  await expect.poll(() => dialog.evaluate((element) => element.scrollTop)).toBe(0);
  await expectToolbar(page, false);
});
