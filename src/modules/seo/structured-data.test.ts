import { describe, expect, it } from 'vitest';
import type { ImageRef, PromptDetail, TemplateDetail } from '@/modules/content/types';
import {
  breadcrumbList,
  collectionPage,
  graph,
  imageObject,
  licenseUrl,
  licenseValue,
  organization,
  promptWork,
  serializeJsonLd,
  templateWork,
  website,
  type LdContext,
} from './structured-data';

const ctx: LdContext = {
  siteName: 'Prompt Seen',
  absoluteUrl: (path) => `https://example.com/prompt-seen${path}`,
  absoluteImageUrl: (v) => `https://example.com/prompt-seen/${v.key}`,
  entryPath: '/',
  logoPath: '/icon.svg',
};

const zh = { code: 'zh-Hans', htmlLang: 'zh-Hans' };

const credit = {
  creator: null,
  creditText: null,
  copyrightNotice: null,
  sourceUrl: null,
  license: null,
  licenseUrl: null,
  acquireLicenseUrl: null,
};

const image = (over: Partial<ImageRef> = {}): ImageRef =>
  ({
    assetId: 'a_012',
    width: 1536,
    height: 1920,
    alt: '墨梅',
    caption: null,
    credit,
    digitalSourceType: 'trainedAlgorithmicMedia',
    variants: {
      thumbnail: { key: 'media/a_012/t.webp', width: 384, height: 480, mimeType: 'image/webp' },
      detail: { key: 'media/a_012/d.webp', width: 1536, height: 1920, mimeType: 'image/webp' },
    },
    ...over,
  }) as unknown as ImageRef;

const prompt = (over: Partial<PromptDetail> = {}): PromptDetail =>
  ({
    id: 'p_012',
    path: '/zh-hans/prompts/plum/',
    title: '水墨梅枝',
    description: '一句话用途。',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-12',
    prompt: { text: 'Ink plum branch </script><b>', language: 'en', characters: 30, lines: 1 },
    source: { author: null, url: null, license: null },
    template: null,
    relatedTemplates: [],
    cover: image(),
    ...over,
  }) as unknown as PromptDetail;

describe('promptWork', () => {
  it('describes the prompt in its actual language even on a translated page', () => {
    const work = promptWork(prompt(), zh, ctx);
    expect(work).toMatchObject({
      '@type': 'CreativeWork',
      url: 'https://example.com/prompt-seen/zh-hans/prompts/plum/',
      name: '水墨梅枝',
      description: '一句话用途。',
      text: 'Ink plum branch </script><b>',
      inLanguage: 'en',
      datePublished: '2026-10-01',
      dateModified: '2026-10-12',
    });
  });

  it('leaves out unknown author, licence and template instead of inventing them (§9.6)', () => {
    const work = promptWork(prompt(), zh, ctx);
    expect(work).not.toHaveProperty('author');
    expect(work).not.toHaveProperty('license');
    expect(work).not.toHaveProperty('isBasedOn');
  });

  it('names the site as an Organization and other authors as people', () => {
    expect(promptWork(prompt({ source: { author: 'Prompt Seen', url: null, license: null } }), zh, ctx).author).toEqual(
      {
        '@type': 'Organization',
        '@id': 'https://example.com/prompt-seen/#organization',
        name: 'Prompt Seen',
      },
    );
    expect(
      promptWork(prompt({ source: { author: 'Mei', url: 'https://mei.example', license: null } }), zh, ctx).author,
    ).toEqual({ '@type': 'Person', name: 'Mei', url: 'https://mei.example' });
  });

  it('points at the template it was made from', () => {
    const work = promptWork(
      prompt({
        template: { id: 't_001', version: 'v1', values: {} },
        relatedTemplates: [{ id: 't_001', path: '/zh-hans/templates/ink-scroll/' }] as PromptDetail['relatedTemplates'],
      }),
      zh,
      ctx,
    );
    expect(work.isBasedOn).toBe('https://example.com/prompt-seen/zh-hans/templates/ink-scroll/');
  });
});

describe('licences', () => {
  it('maps well-known names, in any spelling, to their deeds', () => {
    expect(licenseUrl('CC BY 4.0')).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(licenseUrl('CC-BY-4.0')).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(licenseUrl('cc0')).toBe('https://creativecommons.org/publicdomain/zero/1.0/');
  });

  it('keeps other licences by name and leaves unknown ones out', () => {
    expect(licenseValue('Studio licence 2')).toEqual({ '@type': 'CreativeWork', name: 'Studio licence 2' });
    expect(licenseValue(null)).toBeUndefined();
  });
});

describe('imageObject', () => {
  it('uses the detail variant and only the credit fields that are known', () => {
    expect(imageObject(image(), ctx)).toEqual({
      '@type': 'ImageObject',
      contentUrl: 'https://example.com/prompt-seen/media/a_012/d.webp',
      width: 1536,
      height: 1920,
    });
  });

  it('carries creator, credit, licence and where to license it (§9.6, §9.7)', () => {
    const img = image({
      caption: 'Plum in winter',
      credit: {
        ...credit,
        creator: 'Mei',
        creditText: 'Mei / Prompt Seen',
        copyrightNotice: '© 2026 Mei',
        license: 'CC BY 4.0',
        acquireLicenseUrl: 'https://example.com/licensing',
      },
    });
    expect(imageObject(img, ctx)).toMatchObject({
      caption: 'Plum in winter',
      creator: { '@type': 'Person', name: 'Mei' },
      creditText: 'Mei / Prompt Seen',
      copyrightNotice: '© 2026 Mei',
      license: 'https://creativecommons.org/licenses/by/4.0/',
      acquireLicensePage: 'https://example.com/licensing',
    });
  });

  it('never states a licence URL it does not know', () => {
    const img = image({ credit: { ...credit, license: 'Studio licence 2' } });
    expect(imageObject(img, ctx)).not.toHaveProperty('license');
  });
});

describe('templateWork', () => {
  it('uses the default prompt as text and the current version', () => {
    const detail = {
      path: '/en/templates/poster/',
      title: 'Product poster',
      promptLanguage: 'en',
      description: 'Fill in a product.',
      createdAt: '2026-07-10',
      updatedAt: '2026-09-02',
      cover: null,
      version: { id: 'v2', defaultPrompt: 'Create a poster for a mug.' },
    } as unknown as TemplateDetail;
    expect(templateWork(detail, { code: 'en', htmlLang: 'en' }, ctx)).toEqual({
      '@type': 'CreativeWork',
      '@id': 'https://example.com/prompt-seen/en/templates/poster/#work',
      url: 'https://example.com/prompt-seen/en/templates/poster/',
      name: 'Product poster',
      description: 'Fill in a product.',
      text: 'Create a poster for a mug.',
      version: 'v2',
      inLanguage: 'en',
      datePublished: '2026-07-10',
      dateModified: '2026-09-02',
    });
  });
});

describe('breadcrumbList', () => {
  it('lists the visible crumbs; the last may be text only', () => {
    const list = breadcrumbList(
      [
        { label: '首页', href: '/zh-hans/' },
        { label: '提示词', href: '/zh-hans/prompts/' },
        { label: '插画', href: null },
      ],
      ctx,
    );
    expect(list).toEqual({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: 'https://example.com/prompt-seen/zh-hans/' },
        { '@type': 'ListItem', position: 2, name: '提示词', item: 'https://example.com/prompt-seen/zh-hans/prompts/' },
        { '@type': 'ListItem', position: 3, name: '插画' },
      ],
    });
  });

  it('has no structured version when a middle crumb has no address, or there is one crumb', () => {
    expect(
      breadcrumbList(
        [
          { label: 'Home', href: '/en/' },
          { label: 'Templates', href: null },
          { label: 'Posters', href: null },
        ],
        ctx,
      ),
    ).toBeNull();
    expect(breadcrumbList([{ label: 'Home', href: '/en/' }], ctx)).toBeNull();
  });
});

describe('collectionPage', () => {
  it('numbers items across pages in visible order (§9.6: current page only)', () => {
    const page = collectionPage(
      {
        path: '/en/prompts/page/2/',
        locale: { code: 'en', htmlLang: 'en' },
        name: 'Prompts',
        description: 'Newest first.',
        items: [
          { path: '/en/prompts/a/', name: 'A' },
          { path: '/en/prompts/b/', name: 'B' },
        ],
        offset: 24,
      },
      ctx,
    );
    expect(page.mainEntity).toEqual({
      '@type': 'ItemList',
      numberOfItems: 2,
      itemListElement: [
        { '@type': 'ListItem', position: 25, url: 'https://example.com/prompt-seen/en/prompts/a/', name: 'A' },
        { '@type': 'ListItem', position: 26, url: 'https://example.com/prompt-seen/en/prompts/b/', name: 'B' },
      ],
    });
  });
});

describe('site nodes', () => {
  it('publishes each language WebSite under one Organization', () => {
    expect(website({ path: '/ja/', locale: { code: 'ja', htmlLang: 'ja' } }, ctx)).toEqual({
      '@type': 'WebSite',
      '@id': 'https://example.com/prompt-seen/ja/#website',
      url: 'https://example.com/prompt-seen/ja/',
      name: 'Prompt Seen',
      inLanguage: 'ja',
      publisher: { '@id': 'https://example.com/prompt-seen/#organization' },
    });
    expect(organization(ctx)).toEqual({
      '@type': 'Organization',
      '@id': 'https://example.com/prompt-seen/#organization',
      name: 'Prompt Seen',
      url: 'https://example.com/prompt-seen/',
      logo: 'https://example.com/prompt-seen/icon.svg',
    });
    expect(organization({ ...ctx, sameAs: ['https://github.com/example/prompt-seen'] }).sameAs).toEqual([
      'https://github.com/example/prompt-seen',
    ]);
  });
});

describe('serializeJsonLd', () => {
  it('cannot close the script element, and parses back to the same data', () => {
    const data = graph(promptWork(prompt(), zh, ctx), null);
    const text = serializeJsonLd(data);
    expect(text).not.toContain('</script');
    expect(text).not.toContain('<');
    expect(JSON.parse(text)).toEqual(data);
  });
});
