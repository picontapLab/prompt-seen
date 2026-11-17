import { afterEach, expect, it, vi } from 'vitest';
import { languageName } from './language';

afterEach(() => vi.restoreAllMocks());

it.each(['ru', 'ru-RU'])('keeps %s language labels stable across Node and WebKit casing', (pageLang) => {
  const display = vi.spyOn(Intl.DisplayNames.prototype, 'of');
  for (const [language, expected] of [
    ['en', 'английский'],
    ['pt-BR', 'португальский (Бразилия)'],
  ]) {
    for (const label of [expected!, expected!.charAt(0).toLocaleUpperCase(pageLang) + expected!.slice(1)]) {
      display.mockReturnValue(label);
      expect(languageName(language!, pageLang)).toBe(expected);
    }
  }
  display.mockReturnValue('zz');
  expect(languageName('zz', pageLang)).toBe('zz');
});

it.each([
  ['en', 'inglese'],
  ['zh-Hans', 'cinese semplificato'],
  ['ja', 'giapponese'],
  ['pt-BR', 'portoghese (Brasile)'],
])('keeps Italian %s labels stable across Node and WebKit ICU versions', (language, expected) => {
  const display = vi.spyOn(Intl.DisplayNames.prototype, 'of');
  for (const label of [expected!, expected!.charAt(0).toLocaleUpperCase('it') + expected!.slice(1)]) {
    display.mockReturnValue(label);
    expect(languageName(language!, 'it')).toBe(expected);
  }
  display.mockReturnValue(language);
  expect(languageName(language!, 'it')).toBe(language);
});

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
