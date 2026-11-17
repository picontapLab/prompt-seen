import { describe, expect, it } from 'vitest';
import { suggestLanguage } from './language-match';

const locales = [
  { code: 'en', htmlLang: 'en' },
  { code: 'zh-Hans', htmlLang: 'zh-Hans' },
  { code: 'zh-Hant', htmlLang: 'zh-Hant' },
  { code: 'pt-BR', htmlLang: 'pt-BR' },
  { code: 'ja', htmlLang: 'ja' },
];

describe('suggestLanguage (§8.2)', () => {
  it.each(['it', 'it-IT', 'it-CH'])('suggests %s only when Italian is built', (preferred) => {
    expect(suggestLanguage([preferred], [...locales, { code: 'it', htmlLang: 'it' }])).toBe('it');
    expect(suggestLanguage([preferred], locales)).toBeNull();
    expect(suggestLanguage(['ja-JP', preferred], [...locales, { code: 'it', htmlLang: 'it' }])).toBe('ja');
  });
  it('suggests Russian regional preferences only when Russian is available', () => {
    const available = [...locales, { code: 'ru', htmlLang: 'ru' }];
    for (const tag of ['ru', 'ru-RU', 'ru-BY', 'ru-KZ']) {
      expect(suggestLanguage([tag], available)).toBe('ru');
      expect(suggestLanguage([tag], locales)).toBeNull();
    }
    expect(suggestLanguage(['uk', 'be'], available)).toBeNull();
    expect(suggestLanguage(['en', 'ru'], available)).toBe('en');
  });
  it('takes the first preferred language the site has', () => {
    expect(suggestLanguage(['fr-FR', 'ja-JP', 'en'], locales)).toBe('ja');
    expect(suggestLanguage(['en-GB'], locales)).toBe('en');
  });
  it('maps Chinese by script, or by region when there is none', () => {
    expect(suggestLanguage(['zh-CN'], locales)).toBe('zh-Hans');
    expect(suggestLanguage(['zh'], locales)).toBe('zh-Hans');
    expect(suggestLanguage(['zh-TW'], locales)).toBe('zh-Hant');
    expect(suggestLanguage(['zh-Hant-HK'], locales)).toBe('zh-Hant');
    expect(suggestLanguage(['zh-Hans-SG'], locales)).toBe('zh-Hans');
  });
  it('falls back to another variant of the same language', () => {
    expect(suggestLanguage(['pt-PT'], locales)).toBe('pt-BR');
    expect(suggestLanguage(['pt'], locales)).toBe('pt-BR');
  });
  it.each(['zh-Hant', 'zh-Hant-TW', 'zh-Hant-HK', 'zh-Hant-MO', 'zh-TW', 'zh-HK', 'zh-MO'])(
    'recommends Traditional Chinese for %s when available',
    (tag) => expect(suggestLanguage([tag], locales)).toBe('zh-Hant'),
  );
  it('honours the explicit script before the region and continues unavailable preferences', () => {
    expect(suggestLanguage(['zh-Hans-TW'], locales)).toBe('zh-Hans');
    expect(suggestLanguage(['zh-Hant-CN'], locales)).toBe('zh-Hant');
    expect(
      suggestLanguage(
        ['zh-HK', 'en'],
        locales.filter((locale) => locale.code !== 'zh-Hant'),
      ),
    ).toBe('en');
  });
  it('suggests nothing when no language matches', () => {
    expect(suggestLanguage(['de-DE', 'fr'], locales)).toBeNull();
    expect(suggestLanguage([], locales)).toBeNull();
    expect(suggestLanguage(['zh-TW'], [{ code: 'zh-Hans', htmlLang: 'zh-Hans' }])).toBeNull();
  });
});

it.each(['fr', 'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH'])('suggests %s only when French is available', (tag) => {
  expect(suggestLanguage([tag], locales)).toBeNull();
  expect(suggestLanguage([tag], [...locales, { code: 'fr', htmlLang: 'fr' }])).toBe('fr');
  expect(suggestLanguage(['ja', tag], [...locales, { code: 'fr', htmlLang: 'fr' }])).toBe('ja');
});
