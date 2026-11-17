import crypto from 'node:crypto';
import sharp from 'sharp';
import { expect, test } from '@playwright/test';
import { BASE } from './support/artifact';
import { promptDetail } from './support/content';
import { expectFrenchState, french } from './support/french';

test.beforeAll(expectFrenchState);
if (french) {
  for (const theme of ['light', 'dark'] as const) {
    test(`French GIFs decode and visibly animate against the ${theme} page`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'no-preference' });
      for (const id of ['p_224', 'p_290', 'p_300']) {
        await page.goto(`${BASE}${promptDetail('fr', id).path}`);
        const hero = page.locator('[data-stage-picture] img').first();
        await expect(hero).toBeVisible();
        await expect
          .poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
          .toBe(true);
        const response = await page.request.get(await hero.evaluate((img: HTMLImageElement) => img.currentSrc));
        expect(response.ok()).toBe(true);
        const metadata = await sharp(await response.body(), { animated: true }).metadata();
        expect(metadata.pages).toBeGreaterThan(1);
        expect(metadata.delay!.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
        if (id === 'p_300') expect(metadata.hasAlpha).toBe(true);
        const frames = new Set<string>();
        for (let frame = 0; frame < 5; frame++) {
          frames.add(
            crypto
              .createHash('sha256')
              .update(await hero.screenshot({ animations: 'allow' }))
              .digest('hex'),
          );
          await page.waitForTimeout(230);
        }
        expect(frames.size, `${id}: browser must paint different animation frames`).toBeGreaterThan(1);
      }
    });
  }
}
