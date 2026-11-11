import { expect, test } from '@playwright/test';
import { BASE, BUILD, message } from './support/artifact';
import { layoutProblems } from './support/layout';
import { seriousViolations } from './support/a11y';
import { cancelledFetch } from './support/errors';

const spanish = BUILD.locales.find((locale) => locale.code === 'es');

test.describe('Spanish foundation preview', () => {
  test.skip(!spanish, 'Spanish is disabled in this production artifact; this is not Spanish release acceptance');
  for (const width of [360, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${width}px ${theme}: foundation pages and navigation`, async ({ page }) => {
        test.setTimeout(60_000);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          if (!cancelledFetch(error.message)) errors.push(error.message);
        });
        for (const [slug, title] of [
          ['about', 'Acerca de Prompt Seen'],
          ['license', 'Licencia'],
        ]) {
          await page.goto(`${BASE}/${spanish!.pathPrefix}/${slug}/`);
          await expect(page.locator('html')).toHaveAttribute('lang', 'es');
          await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
          await expect(page.locator('h1')).toHaveText(title!);
          await expect(page.getByRole('link', { name: message('es', 'shell.skipToContent') })).toBeAttached();
          expect(await layoutProblems(page), slug).toEqual([]);
          expect(await seriousViolations(page), slug).toEqual([]);
        }
        expect(errors).toEqual([]);
      });
    }
  }
});
