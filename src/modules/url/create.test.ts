import { describe, expect, it } from 'vitest';
import { createUrlModule } from './create';

const base = {
  origin: 'https://example.com',
  basePath: '/prompt-seen',
  urlPattern: '{basePath}/{locale}/{path}',
  localePrefixes: ['en', 'zh-hans'],
};

describe('url module', () => {
  it('prefixes internal paths with the base path', () => {
    const { withBasePath } = createUrlModule(base);
    expect(withBasePath('/en/prompts/')).toBe('/prompt-seen/en/prompts/');
    expect(withBasePath('/generated/build.json')).toBe('/prompt-seen/generated/build.json');
    expect(() => withBasePath('en/')).toThrow();
  });

  it('strips the base path and rejects paths outside it', () => {
    const { stripBasePath } = createUrlModule(base);
    expect(stripBasePath('/prompt-seen')).toBe('/');
    expect(stripBasePath('/prompt-seen/en/')).toBe('/en/');
    expect(stripBasePath('/prompt-seenx/en/')).toBeNull();
    expect(stripBasePath('/favicon.ico')).toBeNull();
    expect(createUrlModule({ ...base, basePath: '' }).stripBasePath('/en/')).toBe('/en/');
  });

  it('builds absolute URLs on the canonical host', () => {
    const { absoluteUrl, paths } = createUrlModule(base);
    expect(absoluteUrl(paths.languageEntry())).toBe('https://example.com/prompt-seen/');
    expect(absoluteUrl(paths.home('en'))).toBe('https://example.com/prompt-seen/en/');
    expect(absoluteUrl(paths.prompt('zh-hans', 'ink-portrait'))).toBe(
      'https://example.com/prompt-seen/zh-hans/prompts/ink-portrait/',
    );
    expect(absoluteUrl(paths.promptMarkdown('en', 'ink-portrait'))).toBe(
      'https://example.com/prompt-seen/en/prompts/ink-portrait/index.md',
    );
    expect(absoluteUrl('/sitemap.xml')).toBe('https://example.com/prompt-seen/sitemap.xml');
  });

  it('works for a root deployment', () => {
    const { absoluteUrl, withBasePath } = createUrlModule({ ...base, basePath: '' });
    expect(absoluteUrl('/')).toBe('https://example.com/');
    expect(absoluteUrl('/en/prompts/')).toBe('https://example.com/en/prompts/');
    expect(withBasePath('/en/')).toBe('/en/');
  });

  it('follows a host-language urlPattern (§15.4.3)', () => {
    const { absoluteUrl } = createUrlModule({ ...base, urlPattern: '/{locale}{basePath}/{path}' });
    expect(absoluteUrl('/en/prompts/ink-portrait/')).toBe('https://example.com/en/prompt-seen/prompts/ink-portrait/');
    expect(absoluteUrl('/en/')).toBe('https://example.com/en/prompt-seen/');
    expect(absoluteUrl('/')).toBe('https://example.com/prompt-seen/');
  });

  it('does not treat unknown first segments as locales', () => {
    const { absoluteUrl } = createUrlModule(base);
    expect(absoluteUrl('/generated/build.json')).toBe('https://example.com/prompt-seen/generated/build.json');
  });

  it('builds content and media addresses (step 1b)', () => {
    const { absoluteUrl, withBasePath, paths } = createUrlModule(base);
    expect(paths.collection('en', 'quiet-landscapes')).toBe('/en/collections/quiet-landscapes/');
    expect(paths.topic('zh-hans', 'use-cases', 'portrait')).toBe('/zh-hans/use-cases/portrait/');
    expect(paths.page('en', 'about')).toBe('/en/about/');
    expect(withBasePath(paths.media('media/a_001/ink-detail-0123abcd.webp'))).toBe(
      '/prompt-seen/media/a_001/ink-detail-0123abcd.webp',
    );
    expect(absoluteUrl(paths.media('media/a_001/x.webp'))).toBe('https://example.com/prompt-seen/media/a_001/x.webp');
  });

  it('maps page 1 of the list to the list itself (§9.4)', () => {
    const { paths } = createUrlModule(base);
    expect(paths.promptsPage('en', 1)).toBe('/en/prompts/');
    expect(paths.promptsPage('en', 3)).toBe('/en/prompts/page/3/');
  });
});
