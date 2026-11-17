import { expect } from '@playwright/test';
import { BUILD } from './artifact';

export const arabic = BUILD.locales.find((locale) => locale.code === 'ar');

/** Explicit candidate expectations fail even when the artifact accidentally omits Arabic. */
export function expectArabicState() {
  const expected = process.env.AR_EXPECT_STATE;
  if (expected !== undefined && !['disabled', 'preview', 'enabled'].includes(expected))
    throw new Error(`Unknown AR_EXPECT_STATE: ${expected}`);
  if (expected === 'disabled') {
    expect(BUILD.buildMode).toBe('production');
    expect(arabic).toBeUndefined();
  } else if (expected === 'preview') {
    expect(BUILD.buildMode).toBe('preview');
    expect(arabic?.enabled).toBe(false);
  } else if (expected === 'enabled') {
    expect(arabic?.enabled, 'Arabic release artifact must enable ar').toBe(true);
  }
  if (arabic) expect(arabic).toMatchObject({ code: 'ar', htmlLang: 'ar', pathPrefix: 'ar', direction: 'rtl' });
}
