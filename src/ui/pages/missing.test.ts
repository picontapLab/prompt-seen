import { describe, expect, it } from 'vitest';
import { missingTranslationFragment, parseMissingFragment, pathInLocale } from './missing';

const locales = [
  { code: 'en', pathPrefix: 'en' },
  { code: 'zh-Hans', pathPrefix: 'zh-hans' },
  { code: 'ja', pathPrefix: 'ja' },
];

describe('missing-translation fragment (§11.8.7)', () => {
  it('round-trips the page and its languages', () => {
    const hash = missingTranslationFragment({ from: '/zh-hans/prompts/ink-portrait/', have: ['en', 'zh-Hans'] });
    expect(parseMissingFragment(hash, locales)).toEqual({
      from: '/zh-hans/prompts/ink-portrait/',
      have: ['en', 'zh-Hans'],
    });
  });

  it('drops unknown languages and duplicates', () => {
    expect(parseMissingFragment('#from=/en/about/&have=en,xx,en,ja', locales)?.have).toEqual(['en', 'ja']);
  });

  it('accepts only internal paths under a known locale', () => {
    for (const from of [
      '//evil.example/x/',
      'https://evil.example/',
      '/xx/prompts/a/',
      '/en/../../etc',
      'javascript:alert(1)',
      '',
    ])
      expect(parseMissingFragment(`#from=${encodeURIComponent(from)}&have=en`, locales), from).toBeNull();
  });

  it('maps a path to another locale', () => {
    expect(pathInLocale('/zh-hans/prompts/ink-portrait/', 'en')).toBe('/en/prompts/ink-portrait/');
    expect(pathInLocale('/ja/', 'en')).toBe('/en/');
  });
});
