import { describe, expect, it } from 'vitest';
import { formatLocale, registryCode } from './format-locale';

describe('formatLocale', () => {
  it('formats Italian numbers and UTC dates while retaining the registry identity', () => {
    const locale = formatLocale('it');
    expect(registryCode(locale)).toBe('it');
    expect(new Intl.NumberFormat(locale).format(12345.6)).toBe('12.345,6');
    expect(
      new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date('2026-11-17T00:00:00Z')),
    ).toBe('17 novembre 2026');
    expect([0, 1, 2, 21, 1.5, 1000000].map((n) => new Intl.PluralRules(locale).select(n))).toEqual([
      'other',
      'one',
      'other',
      'other',
      'other',
      'many',
    ]);
  });
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

it('formats French numbers and UTC dates with explicit Latin digits', () => {
  const locale = formatLocale('fr');
  expect(locale).toBe('fr-u-nu-latn');
  expect(registryCode(locale)).toBe('fr');
  expect(new Intl.NumberFormat(locale).format(1234.5)).toBe('1\u202f234,5');
  expect(new Intl.NumberFormat(locale, { style: 'percent' }).format(0.25)).toBe('25\u00a0%');
  expect(
    new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date('2026-11-17T00:00:00Z')),
  ).toBe('17 novembre 2026');
});
