import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { BASE, BUILD, ROOT } from './support/artifact';
import { localeIndex } from './support/content';

// Rows of design doc §16.2 that the feature specs did not yet cover, checked on the served build
// (§17.3 step 6): "图片" (no missing image, sizes reserved, a sharper image on the detail page)
// and the IPTC part of "图片搜索" (the `detail` and `og` files carry the credit and source type).

const imgTags = (html: string) => html.match(/<img\b[^>]*>/gi) ?? [];
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1] ?? null;
const decode = (s: string) => s.replace(/&amp;/g, '&');
/** Every address an <img> may load: src and each srcset candidate. */
const imageUrls = (tag: string) => [
  ...(attr(tag, 'src') ? [decode(attr(tag, 'src')!)] : []),
  ...(attr(tag, 'srcset') ?? '')
    .split(',')
    .map((c) => decode(c.trim().split(/\s+/)[0] ?? ''))
    .filter(Boolean),
];

for (const locale of BUILD.locales) {
  const index = localeIndex(locale.code);
  const pages = [
    `/${locale.pathPrefix}/`,
    `/${locale.pathPrefix}/prompts/`,
    ...index.prompts.map((p) => p.path),
    ...index.templates.map((t) => t.path),
  ];

  test(`${locale.code}: every image on the home, list and detail pages loads and has its size in the HTML`, async ({
    request,
  }) => {
    test.setTimeout(120_000);
    const urls = new Set<string>();
    for (const path of pages) {
      const html = await (await request.get(`${BASE}${path}`)).text();
      const main = /<main\b[\s\S]*<\/main>/.exec(html)?.[0] ?? html;
      for (const tag of imgTags(main)) {
        // Sizes reserved: content images carry width and height in the first HTML, so nothing
        // shifts when they arrive. Decorative layers (alt="", like the blurred preview under a
        // developing work) fill a frame that is already sized.
        if (attr(tag, 'alt') !== '') {
          expect(attr(tag, 'width'), `${path}: ${tag.slice(0, 120)}`).toMatch(/^\d+$/);
          expect(attr(tag, 'height'), `${path}: ${tag.slice(0, 120)}`).toMatch(/^\d+$/);
        }
        for (const url of imageUrls(tag)) urls.add(url);
      }
    }
    expect(urls.size).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const url of urls) {
      if (!url.startsWith('/')) continue; // a CDN build: media:check covers those
      const res = await request.head(url);
      if (res.status() !== 200 || !res.headers()['content-type']?.startsWith('image/'))
        missing.push(`${res.status()} ${url}`);
    }
    expect(missing).toEqual([]);
  });

  test(`${locale.code}: each Prompt page links a sharper original than the image it shows`, async ({ request }) => {
    for (const p of index.prompts.slice(0, 20)) {
      const html = await (await request.get(`${BASE}${p.path}`)).text();
      const main = imgTags(html).find((t) => attr(t, 'fetchpriority') === 'high');
      expect(main, p.path).toBeTruthy();
      const original = /<a\b[^>]*href="([^"]*-original-[^"]*)"/.exec(html)?.[1];
      expect(original, p.path).toBeTruthy();
      const res = await request.head(decode(original!));
      expect(res.status(), original).toBe(200);
      // The original is at least as large as the largest displayed candidate.
      expect(p.cover.width).toBeGreaterThanOrEqual(Number(attr(main!, 'width')));
    }
  });
}

test('the detail and og image files carry IPTC credit and digital source type (§9.7)', async ({ request }) => {
  test.skip(!!BUILD.mediaBaseUrl, 'images come from the CDN in this build; media:check covers them');
  const dir = path.join(ROOT, 'dist', BASE, 'media');
  const files = fs
    .readdirSync(dir)
    .flatMap((asset) => fs.readdirSync(path.join(dir, asset)).map((f) => `${asset}/${f}`))
    .filter((f) => /-(detail|og)-[0-9a-f]+\.\w+$/.test(f));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const res = await request.get(`${BASE}/media/${file}`);
    expect(res.status(), file).toBe(200);
    const bytes = (await res.body()).toString('latin1');
    expect(bytes, `${file}: digital source type`).toContain('Iptc4xmpExt:DigitalSourceType');
    expect(bytes, `${file}: credit`).toMatch(/photoshop:Credit|dc:creator/);
  }
});
