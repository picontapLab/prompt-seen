import { afterEach, expect, it, vi } from 'vitest';
import { languageName } from './language';

afterEach(() => vi.restoreAllMocks());

it.each([
  ['en', 'inglês'],
  ['ja', 'japonês'],
  ['tr', 'turco'],
  ['zh-Hans', 'chinês simplificado'],
])('keeps %s identical across Node and WebKit Portuguese casing', (language, expected) => {
  const display = vi.spyOn(Intl.DisplayNames.prototype, 'of');
  for (const label of [expected!, expected!.charAt(0).toLocaleUpperCase('pt-BR') + expected!.slice(1)]) {
    display.mockReturnValue(label);
    expect(languageName(language!, 'pt-BR')).toBe(expected);
  }
});

it('keeps region names and other languages grammatical when normalizing Portuguese labels', () => {
  const display = vi.spyOn(Intl.DisplayNames.prototype, 'of');
  display.mockReturnValue('Português (Brasil)');
  expect(languageName('pt-BR', 'pt-BR')).toBe('português (Brasil)');
  display.mockReturnValue('Englisch');
  expect(languageName('en', 'de')).toBe('Englisch');
});

it('keeps the existing Spanish preview label stable across the same ICU casing difference', () => {
  vi.spyOn(Intl.DisplayNames.prototype, 'of').mockReturnValue('Inglés');
  expect(languageName('en', 'es')).toBe('inglés');
});
