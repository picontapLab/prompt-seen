import { describe, expect, it } from 'vitest';
import { sitemapIndexXml, urlsetXml } from '../../src/modules/seo/sitemap';
import {
  describeStatus,
  diffSnapshots,
  INDEXNOW_BATCH,
  readIndexNowKey,
  sitemapEntries,
  sitemapIndexLocs,
  submissions,
  type UrlSnapshot,
} from './indexnow';

// IndexNow after a deploy (design doc §9.9): the addresses come from the sitemaps before and after.

const snap = (urls: Record<string, string | null>, found = true): UrlSnapshot => ({ sitemap: 'x', found, urls });

describe('IndexNow helpers', () => {
  it('reads the sitemaps the site writes, ignoring image entries', () => {
    const index = sitemapIndexXml([
      { loc: 'https://example.com/ps/en/sitemap-pages.xml?a=1&b=2', lastmod: '2026-10-01' },
    ]);
    expect(sitemapIndexLocs(index)).toEqual(['https://example.com/ps/en/sitemap-pages.xml?a=1&b=2']);
    const set = urlsetXml([
      {
        loc: 'https://example.com/ps/en/prompts/a/',
        lastmod: '2026-10-02',
        images: ['https://media.example.com/media/a.webp'],
      },
      { loc: 'https://example.com/ps/en/prompts/' },
    ]);
    expect(sitemapEntries(set)).toEqual([
      { loc: 'https://example.com/ps/en/prompts/a/', lastmod: '2026-10-02' },
      { loc: 'https://example.com/ps/en/prompts/', lastmod: null },
    ]);
  });

  it('submits new, changed and removed addresses, and everything on a first deploy', () => {
    const before = snap({
      'https://e.com/a/': '2026-10-01',
      'https://e.com/b/': '2026-10-01',
      'https://e.com/c/': null,
      'https://e.com/gone/': '2026-09-01',
    });
    const after = snap({
      'https://e.com/a/': '2026-10-01',
      'https://e.com/b/': '2026-10-05',
      'https://e.com/c/': null,
      'https://e.com/new/': '2026-10-05',
    });
    expect(diffSnapshots(before, after)).toEqual({
      added: ['https://e.com/new/'],
      changed: ['https://e.com/b/'],
      removed: ['https://e.com/gone/'],
    });
    expect(diffSnapshots(snap({}, false), after).added).toHaveLength(4);
  });

  it('batches submissions and refuses addresses of other hosts', () => {
    const many = Array.from({ length: INDEXNOW_BATCH + 1 }, (_, i) => `https://e.com/p/${i}/`);
    const bodies = submissions(
      { added: many, changed: [], removed: [] },
      { host: 'e.com', key: 'k'.repeat(8), keyLocation: 'https://e.com/kkkkkkkk.txt' },
    );
    expect(bodies.map((b) => b.urlList.length)).toEqual([INDEXNOW_BATCH, 1]);
    expect(() =>
      submissions(
        { added: ['https://other.com/x/'], changed: [], removed: [] },
        { host: 'e.com', key: 'kkkkkkkk', keyLocation: '' },
      ),
    ).toThrow(/outside e\.com/);
  });

  it('accepts only keys the protocol allows', () => {
    expect(readIndexNowKey({})).toBeNull();
    expect(readIndexNowKey({ INDEXNOW_KEY: ' 0123abcd-EF ' })).toBe('0123abcd-EF');
    expect(() => readIndexNowKey({ INDEXNOW_KEY: 'short' })).toThrow();
    expect(() => readIndexNowKey({ INDEXNOW_KEY: 'has space in it' })).toThrow();
  });

  it('explains status codes', () => {
    expect(describeStatus(202).ok).toBe(true);
    expect(describeStatus(403)).toEqual({ ok: false, message: expect.stringMatching(/key/) });
  });
});
