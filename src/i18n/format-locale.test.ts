import { describe, expect, it } from 'vitest';
import { formatLocale, registryCode } from './format-locale';

describe('formatLocale', () => {
  it('pins Latin digits, so every ICU formats like the build', () => {
    expect(new Intl.NumberFormat(formatLocale('ar')).format(1234)).toBe('1,234');
    expect(new Intl.NumberFormat(formatLocale('ar')).resolvedOptions().numberingSystem).toBe('latn');
    expect(new Intl.NumberFormat(formatLocale('zh-Hans')).format(1234)).toBe('1,234');
  });

  it('round-trips registry codes', () => {
    for (const code of ['en', 'zh-Hans', 'pt-BR', 'ar']) expect(registryCode(formatLocale(code))).toBe(code);
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
