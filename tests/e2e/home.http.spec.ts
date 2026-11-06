import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { parse } from 'yaml';
import { featuredOrder } from '../../src/modules/home/featured';
import { BASE, BUILD, homePath, message, publicUrl, ROOT } from './support/artifact';
import { feedIndex, localeIndex, promptDetail } from './support/content';
import { alternates, canonical, dataAttr, elementText, title } from './support/html';

// The home page as crawlers receive it (design doc §11.8.1, §9.3, §16.2 首屏展示, §17.3 step 4b):
// the work on show, its label, annotated quote and actions are in the first HTML; the page has
// its own title, canonical and hreflang with the default home as x-default; every work and
// section below links to a page of this build.

const site = parse(fs.readFileSync(path.join(ROOT, 'content/site.yaml'), 'utf8')) as {
  home: { featured: { prompt: string; from?: string }[] };
};
// The build date decides which works on show have started (the build and the tests run the same day).
const today = new Date().toISOString().slice(0, 10);

/** Works on show in a locale, in order: started, visible there and annotated; else the stand-in. */
function worksOnShow(code: string): string[] {
  const prompts = new Map(localeIndex(code).prompts.map((p) => [p.id, p]));
  const configured = featuredOrder(site.home.featured, today).filter((id) => prompts.get(id)?.annotated);
  if (configured.length) return configured;
  const stand = feedIndex(code).featured.find((id) => prompts.get(id)?.annotated) ?? localeIndex(code).prompts[0]?.id;
  return stand ? [stand] : [];
}

const expectedAlternates = {
  ...Object.fromEntries(BUILD.locales.map((l) => [l.htmlLang, publicUrl(homePath(l))])),
  'x-default': publicUrl('/'),
};
const meta = (html: string, property: string) =>
  new RegExp(`<meta property="${property}" content="([^"]*)"`).exec(html)?.[1] ?? null;
const hrefs = (html: string) =>
  [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => m[1]!.replace(/&amp;/g, '&'));

for (const locale of BUILD.locales) {
  const code = locale.code;
  const url = `${BASE}${homePath(locale)}`;

  test(`${code}: the first screen is in the HTML: the work on show, its quote and actions`, async ({ request }) => {
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(dataAttr(html, 'page')).toBe('home');

    const onShow = worksOnShow(code);
    expect(onShow.length).toBeGreaterThan(0);
    expect(dataAttr(html, 'on-show')).toBe(onShow[0]);
    const work = promptDetail(code, onShow[0]!);

    // Title, positioning line and label, in this locale's words (§8.3).
    expect(elementText(html, 'h1')).toBe(message(code, 'home.hero.title'));
    expect(title(html)).toBe(message(code, 'home.documentTitle', { siteName: BUILD.siteName }));
    expect(html).toContain(`>${work.title.replace(/&/g, '&amp;')}</h2>`);

    // The main image: the detail size, loaded first and never lazily (§10.3, LCP).
    const detailKey = work.cover.variants.detail!.key;
    const hero = new RegExp(`<img[^>]*src="[^"]*${detailKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`).exec(
      html,
    )?.[0];
    expect(hero, 'the hero image is in the HTML').toBeTruthy();
    expect(hero).toContain('fetchPriority="high"');
    expect(hero).not.toContain('loading="lazy"');

    // Each annotated phrase is a lettered button in the quote (§11.1.9), A, B, C… in order.
    for (const a of work.annotations) {
      expect(html).toContain(`data-letter="${a.letter}"`);
      expect(html).toContain(a.phrase.replace(/&/g, '&amp;').replace(/'/g, '&#x27;'));
    }

    // Actions: copy and the way to the work's page; a plain search form that works without JS.
    expect(html).toContain(message(code, 'detail.copy.label'));
    expect(hrefs(html)).toContain(`${BASE}${work.path}`);
    expect(html).toMatch(new RegExp(`<form[^>]*action="${BASE}/${locale.pathPrefix}/search/"`));
    const another = message(code, 'home.hero.another');
    if (onShow.length > 1) expect(html).toContain(another);
    else expect(html).not.toContain(another);
  });

  test(`${code}: metadata: canonical, hreflang with the default home as x-default, the work as share image`, async ({
    request,
  }) => {
    const html = await (await request.get(url)).text();
    expect(canonical(html)).toBe(publicUrl(homePath(locale)));
    expect(alternates(html)).toEqual(expectedAlternates);
    const work = promptDetail(code, worksOnShow(code)[0]!);
    expect(meta(html, 'og:image')).toContain(work.cover.variants.og!.key);
    expect(meta(html, 'og:description')).toBe(message(code, 'home.description'));
  });

  test(`${code}: below the first screen every link reaches a page of this build`, async ({ request }) => {
    const html = await (await request.get(url)).text();
    const index = localeIndex(code);
    // The newest works, in the list's order (§11.8.1 最新收录).
    const newest = index.prompts.slice(0, 3).map((p) => `${BASE}${p.path}`);
    const links = hrefs(html);
    for (const href of newest) expect(links).toContain(href);
    // Templates and collections link to their pages.
    for (const t of index.templates.slice(0, 3)) expect(links).toContain(`${BASE}${t.path}`);
    for (const c of index.collections.slice(0, 2)) expect(links).toContain(`${BASE}${c.path}`);
    // Every same-site page link answers 200 (fragments are the list's filters).
    const pages = [
      ...new Set(links.filter((h) => h.startsWith(`${BASE}${homePath(locale)}`)).map((h) => h.split('#')[0]!)),
    ];
    for (const href of pages) expect((await request.get(href)).status(), href).toBe(200);
  });
}
