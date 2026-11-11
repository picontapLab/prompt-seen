import { describe, expect, it } from 'vitest';
import type { ImageRef } from '@/modules/content/types';
import { buildPageMetadata, ogLocale, type SeoContext } from './build';

const ctx: SeoContext = {
  siteName: 'Prompt Seen',
  defaultLocale: 'en',
  locales: [
    { code: 'en', htmlLang: 'en' },
    { code: 'zh-Hans', htmlLang: 'zh-Hans' },
    { code: 'ar', htmlLang: 'ar' },
  ],
  absoluteUrl: (path) => `https://example.com/prompt-seen${path}`,
  absoluteImageUrl: (v) => `https://example.com/prompt-seen/${v.key}`,
};

const image = {
  alt: 'Ink plum branch',
  variants: { og: { key: 'media/a_012/og.jpg', width: 1200, height: 630, mimeType: 'image/jpeg' } },
} as unknown as ImageRef;

const page = {
  path: '/zh-hans/prompts/plum/',
  locale: { code: 'zh-Hans', htmlLang: 'zh-Hans' },
  documentTitle: '水墨梅枝 · 提示词 · Prompt Seen',
  title: '水墨梅枝',
  description: '一句话用途。',
  alternates: [
    { locale: 'en', path: '/en/prompts/plum/' },
    { locale: 'zh-Hans', path: '/zh-hans/prompts/plum/' },
    { locale: 'ja', path: '/ja/prompts/plum/' },
  ],
  image,
  type: 'article' as const,
  modifiedTime: '2026-10-12',
};

describe('buildPageMetadata', () => {
  it('keeps noindex pages crawlable with a self canonical and no hreflang associations', () => {
    const metadata = buildPageMetadata({ ...page, noindex: true }, ctx);
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe('https://example.com/prompt-seen/zh-hans/prompts/plum/');
    expect(metadata.alternates?.languages).toBeUndefined();
  });
  it('uses a self-referencing absolute canonical and the full document title', () => {
    const m = buildPageMetadata(page, ctx);
    expect(m.alternates?.canonical).toBe('https://example.com/prompt-seen/zh-hans/prompts/plum/');
    expect(m.title).toEqual({ absolute: '水墨梅枝 · 提示词 · Prompt Seen' });
  });

  it('lists hreflang for built versions only, itself included, with the default locale as x-default', () => {
    const m = buildPageMetadata(page, ctx);
    expect(m.alternates?.languages).toEqual({
      en: 'https://example.com/prompt-seen/en/prompts/plum/',
      'zh-Hans': 'https://example.com/prompt-seen/zh-hans/prompts/plum/',
      'x-default': 'https://example.com/prompt-seen/en/prompts/plum/',
    });
  });

  it('adds the page itself when the alternates leave it out, and skips x-default for a single version', () => {
    const m = buildPageMetadata({ ...page, alternates: [] }, ctx);
    expect(m.alternates?.languages).toEqual({ 'zh-Hans': 'https://example.com/prompt-seen/zh-hans/prompts/plum/' });
  });

  it('omits x-default when the default locale has no version', () => {
    const m = buildPageMetadata(
      {
        ...page,
        alternates: [
          { locale: 'zh-Hans', path: page.path },
          { locale: 'ar', path: '/ar/prompts/plum/' },
        ],
      },
      ctx,
    );
    expect(m.alternates?.languages).not.toHaveProperty('x-default');
  });

  it('shares the og variant with its size, the Open Graph locales and a large Twitter card', () => {
    const m = buildPageMetadata(page, ctx);
    expect(m.openGraph).toMatchObject({
      url: 'https://example.com/prompt-seen/zh-hans/prompts/plum/',
      locale: 'zh_CN',
      alternateLocale: ['en_US'],
      images: [
        { url: 'https://example.com/prompt-seen/media/a_012/og.jpg', width: 1200, height: 630, alt: 'Ink plum branch' },
      ],
      modifiedTime: '2026-10-12',
    });
    expect(m.twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('falls back to a summary card without an image', () => {
    expect(buildPageMetadata({ ...page, image: null }, ctx).twitter).toMatchObject({ card: 'summary' });
  });

  it('declares the Markdown version as an alternate only when the page has one (§9.10.4)', () => {
    const m = buildPageMetadata({ ...page, markdownPath: '/zh-hans/prompts/plum/index.md' }, ctx);
    expect(m.alternates?.types).toEqual({
      'text/markdown': 'https://example.com/prompt-seen/zh-hans/prompts/plum/index.md',
    });
    expect(buildPageMetadata({ ...page, markdownPath: null }, ctx).alternates).not.toHaveProperty('types');
  });
});

describe('ogLocale', () => {
  it('maps registry tags to language_TERRITORY', () => {
    expect(ogLocale('en')).toBe('en_US');
    expect(ogLocale('zh-Hant')).toBe('zh_TW');
    expect(ogLocale('pt-BR')).toBe('pt_BR');
    expect(ogLocale('nl')).toBe('nl');
  });
});
