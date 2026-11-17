import { describe, expect, it } from 'vitest';
import { formatLocale, registryCode } from './format-locale';

describe('formatLocale', () => {
  it('pins Latin digits, so every ICU formats like the build', () => {
    expect(new Intl.NumberFormat(formatLocale('ar')).format(1234)).toBe('1,234');
    expect(new Intl.NumberFormat(formatLocale('ar')).resolvedOptions().numberingSystem).toBe('latn');
    expect(new Intl.NumberFormat(formatLocale('zh-Hans')).format(1234)).toBe('1,234');
  });

  it('round-trips registry codes', () => {
    for (const code of ['en', 'zh-Hans', 'zh-Hant', 'pt-BR', 'ar']) expect(registryCode(formatLocale(code))).toBe(code);
  });
  it('uses Gregorian dates and Latin digits for Traditional Chinese', () => {
    const code = formatLocale('zh-Hant');
    expect(new Intl.NumberFormat(code).format(1000000)).toBe('1,000,000');
    expect(new Intl.DateTimeFormat(code, { timeZone: 'UTC' }).resolvedOptions().calendar).toBe('gregory');
    expect(new Intl.NumberFormat(code, { style: 'percent' }).format(0.25)).toBe('25%');
  });
});
