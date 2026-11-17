import { describe, expect, it } from 'vitest';
import { formatLocale, registryCode } from './format-locale';

describe('formatLocale', () => {
  it('keeps Arabic regional formatters on the site Gregorian calendar and Latin digits', () => {
    const date = new Date('2026-11-17T00:00:00Z');
    for (const code of ['ar', 'ar-SA', 'ar-EG']) {
      expect(new Intl.Locale(formatLocale(code)).calendar).toBe('gregory');
      const format = new Intl.DateTimeFormat(formatLocale(code), { year: 'numeric', timeZone: 'UTC' });
      expect(format.resolvedOptions().calendar).toBe('gregory');
      expect(format.formatToParts(date).find((part) => part.type === 'year')?.value).toBe('2026');
    }
  });

  it('pins Latin digits, so every ICU formats like the build', () => {
    expect(new Intl.NumberFormat(formatLocale('ar')).format(1234)).toBe('1,234');
    expect(new Intl.NumberFormat(formatLocale('ar')).resolvedOptions().numberingSystem).toBe('latn');
    expect(new Intl.NumberFormat(formatLocale('zh-Hans')).format(1234)).toBe('1,234');
  });

  it('round-trips registry codes', () => {
    for (const code of ['en', 'zh-Hans', 'pt-BR', 'ar']) expect(registryCode(formatLocale(code))).toBe(code);
  });
});
