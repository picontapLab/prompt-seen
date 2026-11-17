import { expect } from '@playwright/test';
import { BUILD } from './artifact';

export const french = BUILD.locales.find((locale) => locale.code === 'fr');

/** Release acceptance must fail when the artifact silently omits the requested language. */
export function expectFrenchState() {
  const expected = process.env.FR_EXPECT_STATE;
  if (expected && !['disabled', 'preview', 'enabled'].includes(expected))
    throw new Error(`Unknown FR_EXPECT_STATE: ${expected}`);
  if (expected === 'disabled') {
    expect(BUILD.buildMode).toBe('production');
    expect(french, 'disabled production artifact must omit French').toBeUndefined();
  } else if (expected === 'preview') {
    expect(BUILD.buildMode).toBe('preview');
    expect(french, 'preparation preview must include French').toBeDefined();
    expect(french?.enabled).toBe(false);
  } else if (expected === 'enabled') {
    expect(french, 'release artifact must include French').toBeDefined();
    expect(french?.enabled, 'release artifact must enable French').toBe(true);
  }
  if (french)
    expect(french).toMatchObject({
      code: 'fr',
      htmlLang: 'fr',
      pathPrefix: 'fr',
      nativeName: 'Français',
      direction: 'ltr',
    });
}
