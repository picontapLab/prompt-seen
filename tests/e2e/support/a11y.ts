import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Waits for running CSS animations and transitions to finish (looping ones excepted). axe
 * measures colour contrast with the opacity of the moment, so a dialog or sheet still fading in
 * reads as low contrast; slower runners (WebKit on Linux CI) hit that window reliably.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

/** Serious and critical WCAG 2.2 AA violations (§16.3), checked once the page has settled. */
export async function seriousViolations(page: Page, include?: string): Promise<string[]> {
  await settle(page);
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']);
  const { violations } = await (include ? builder.include(include) : builder).analyze();
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id);
}
