import { expect } from '@playwright/test';
import { BUILD } from './artifact';

export const italian = BUILD.locales.find((locale) => locale.code === 'it');

/** Explicit release expectations must fail even when no Italian test pages were generated. */
export function expectItalianState() {
  const state = process.env.IT_EXPECT_STATE;
  if (state !== undefined) expect(['disabled', 'preview', 'enabled']).toContain(state);
  if (state === 'disabled') expect(italian, 'disabled production artifact must not contain Italian').toBeUndefined();
  if (state === 'preview') {
    expect(BUILD.buildMode).toBe('preview');
    expect(italian, 'preview artifact must contain Italian').toBeDefined();
    expect(italian?.enabled).toBe(false);
  }
  if (state === 'enabled') {
    expect(italian, 'release artifact must contain Italian').toBeDefined();
    expect(italian?.enabled, 'release artifact must enable Italian').toBe(true);
  }
  if (italian)
    expect(italian).toMatchObject({
      code: 'it',
      pathPrefix: 'it',
      nativeName: 'Italiano',
      htmlLang: 'it',
      direction: 'ltr',
    });
}
