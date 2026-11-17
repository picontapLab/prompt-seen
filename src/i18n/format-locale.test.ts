import { describe, expect, it } from 'vitest';
import { formatLocale, registryCode } from './format-locale';

describe('formatLocale', () => {
  it('pins Latin digits, so every ICU formats like the build', () => {
    expect(new Intl.NumberFormat(formatLocale('ar')).format(1234)).toBe('1,234');
    expect(new Intl.NumberFormat(formatLocale('ar')).resolvedOptions().numberingSystem).toBe('latn');
    expect(new Intl.NumberFormat(formatLocale('zh-Hans')).format(1234)).toBe('1,234');
  });

  it('round-trips registry codes', () => {
    for (const code of ['en', 'zh-Hans', 'pt-BR', 'ar', 'ru']) expect(registryCode(formatLocale(code))).toBe(code);
  });

  it('uses Russian decimal punctuation and UTC calendar dates', () => {
    expect(new Intl.NumberFormat(formatLocale('ru')).format(12345.5)).toBe('12\u00a0345,5');
    expect(
      new Intl.DateTimeFormat(formatLocale('ru'), {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date('2026-11-17T00:00:00Z')),
    ).toBe('17 ноября 2026 г.');
  });
});
