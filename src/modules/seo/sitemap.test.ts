import { describe, expect, it } from 'vitest';
import { latest, sitemapIndexXml, urlsetXml } from './sitemap';

describe('urlsetXml', () => {
  it('writes locations, content dates and main images', () => {
    const xml = urlsetXml([
      { loc: 'https://example.com/prompt-seen/en/', lastmod: null },
      {
        loc: 'https://example.com/prompt-seen/en/prompts/plum/',
        lastmod: '2026-10-12',
        images: ['https://example.com/prompt-seen/media/a_012/d.webp'],
      },
    ]);
    expect(xml).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        '  <url>',
        '    <loc>https://example.com/prompt-seen/en/</loc>',
        '  </url>',
        '  <url>',
        '    <loc>https://example.com/prompt-seen/en/prompts/plum/</loc>',
        '    <lastmod>2026-10-12</lastmod>',
        '    <image:image>',
        '      <image:loc>https://example.com/prompt-seen/media/a_012/d.webp</image:loc>',
        '    </image:image>',
        '  </url>',
        '</urlset>',
        '',
      ].join('\n'),
    );
  });

  it('declares the image namespace only when it is used, and escapes XML', () => {
    const xml = urlsetXml([{ loc: 'https://example.com/a?b=1&c=<2>' }]);
    expect(xml).not.toContain('xmlns:image');
    expect(xml).toContain('<loc>https://example.com/a?b=1&amp;c=&lt;2&gt;</loc>');
  });
});

describe('sitemapIndexXml', () => {
  it('lists the locale sitemaps with their newest date', () => {
    expect(sitemapIndexXml([{ loc: 'https://example.com/en/sitemap-pages.xml', lastmod: '2026-10-14' }])).toContain(
      '  <sitemap>\n    <loc>https://example.com/en/sitemap-pages.xml</loc>\n    <lastmod>2026-10-14</lastmod>\n  </sitemap>',
    );
  });
});

describe('latest', () => {
  it('returns the newest date, ignoring missing ones', () => {
    expect(latest(['2026-07-01', null, '2026-10-12', undefined, '2026-09-30'])).toBe('2026-10-12');
    expect(latest([])).toBeNull();
  });
});
