import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Waits for running CSS animations and transitions to finish (looping ones excepted). axe
 * measures colour contrast with the opacity of the moment, so a dialog or sheet still fading in
 * reads as low contrast; slower runners (WebKit on Linux CI) hit that window reliably.
 */
export async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const overlay = Array.from(document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]')).find(
      (dialog) => dialog.checkVisibility(),
    );
    return document.getAnimations().every((animation) => {
      if (animation.playState !== 'running' || animation.playbackRate === 0) return true;
      const effect = animation.effect;
      if (!(effect instanceof KeyframeEffect) || effect.getTiming().iterations === Infinity) return true;
      const target = effect.target;
      if (!target?.checkVisibility({ contentVisibilityAuto: true })) return true;
      // An offscreen feed can suspend its animations when a filter dialog opens.
      // Only the dialog, its contents and its ancestors can be transitioning into view.
      return !!overlay && !overlay.contains(target) && !target.contains(overlay);
    });
  });
}

/**
 * Scrolls to the top once the page has stopped scrolling. An instant scroll during a smooth one
 * (the editor going to a field) does not stop it: Chromium ends a few pixels short of the top,
 * and axe then reports links under the sticky header as obscured targets.
 */
export async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let last = scrollY;
        let still = 0;
        const tick = () => {
          still = scrollY === last ? still + 1 : 0;
          last = scrollY;
          if (still >= 5) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => scrollY)).toBe(0);
}

/** Serious and critical WCAG 2.2 AA violations (§16.3), checked once the page has settled. */
export async function seriousViolations(page: Page, include?: string): Promise<string[]> {
  await settle(page);
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']);
  const { violations } = await (include ? builder.include(include) : builder).analyze();
  return violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.nodes.map(({ target }) => target.join(' ')).join(', ')}`);
}
