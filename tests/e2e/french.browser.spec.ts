import { expect, test } from '@playwright/test';
import { BASE, message } from './support/artifact';
import { expectFrenchState, french } from './support/french';
import { layoutProblems } from './support/layout';
import { seriousViolations } from './support/a11y';
import { cancelledFetch } from './support/errors';

test.beforeAll(expectFrenchState);

test('fr: browser acceptance verifies artifact state before checking pages', expectFrenchState);

if (french) {
  for (const width of [360, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`fr: foundation ${width}px ${theme}`, async ({ page }) => {
        test.setTimeout(60_000);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          if (!cancelledFetch(error.message)) errors.push(error.message);
        });
        page.on('console', (event) => {
          if (event.type() === 'error' && /hydrat|server.rendered|did not match/i.test(event.text()))
            errors.push(event.text());
        });
        for (const [slug, title] of [
          ['about', 'À propos de Prompt Seen'],
          ['license', 'Licence'],
        ]) {
          await page.goto(`${BASE}/fr/${slug}/`);
          await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
          await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
          await expect(page.locator('h1')).toHaveText(title!);
          await expect(page.getByRole('link', { name: message('fr', 'shell.skipToContent') })).toBeAttached();
          expect(await layoutProblems(page), slug).toEqual([]);
          expect(await seriousViolations(page), slug).toEqual([]);
        }
        expect(errors).toEqual([]);
      });
    }
  }
}
