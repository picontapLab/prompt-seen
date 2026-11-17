import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { BUILD, ROOT } from './artifact';

export const arabic = BUILD.locales.find((locale) => locale.code === 'ar');

/** Client controls must have their handlers before a click can be an acceptance action. */
export const hydrated = (page: Page, selector: string) =>
  page.waitForFunction((selector) => {
    const element = document.querySelector(selector);
    return element && Object.keys(element).some((key) => key.startsWith('__reactProps'));
  }, selector);

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
  if (arabic) {
    expect(arabic).toMatchObject({ code: 'ar', htmlLang: 'ar', pathPrefix: 'ar', direction: 'rtl' });
    const frozen = JSON.parse(fs.readFileSync(path.join(ROOT, 'production/localization/ar/search-cases.json'), 'utf8'));
    expect(frozen).toMatchObject({ schemaVersion: 1, locale: 'ar' });
    expect(
      new Set(frozen.cases.map((entry: { query: string }) => entry.query)).size,
      'Arabic acceptance requires at least 30 distinct frozen search scenarios',
    ).toBeGreaterThanOrEqual(30);
  }
}
