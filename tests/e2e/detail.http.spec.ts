import { expect, test } from '@playwright/test';
import { BASE, BUILD, message, publicUrl } from './support/artifact';
import { samplePrompt, sampleTemplate } from './support/content';
import {
  alternates,
  canonical,
  dataAttr,
  elementText,
  htmlElement,
  localReferences,
  robots,
  title,
} from './support/html';

// Prompt and template details as crawlers receive them (design doc §9.2, §9.3, §16.2 "初始 HTML",
// §17.3 step 2): the full content and every address are in the HTML before any JavaScript, and
// addresses are absolute on the canonical host with the base path.

const isPreview = BUILD.buildMode === 'preview';
const built = new Map(BUILD.locales.map((l) => [l.code, l]));

const decode = (text: string) =>
  text
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** Text of the prompt sheet's text block (its id ends in "-prompt"; it holds no nested div). */
function promptText(html: string): string | null {
  const inner = /<div id="[^"]*-prompt"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1];
  return inner === undefined ? null : decode(inner);
}

const meta = (html: string, property: string) =>
  new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`).exec(html)?.[1] ?? null;

function expectPrefixedReferences(html: string) {
  const outside = localReferences(html).filter((ref) => !(BASE ? ref.startsWith(`${BASE}/`) : true));
  expect(outside, 'same-host references outside the base path').toEqual([]);
}

/** hreflang for the versions this build has, itself included, plus x-default when there are several. */
function expectedAlternates(versions: { locale: string; path: string }[]) {
  const shown = versions.filter((v) => built.has(v.locale));
  const out: Record<string, string> = Object.fromEntries(
    shown.map((v) => [built.get(v.locale)!.htmlLang, publicUrl(v.path)]),
  );
  const fallback = shown.find((v) => v.locale === BUILD.defaultLocale);
  if (shown.length > 1 && fallback) out['x-default'] = publicUrl(fallback.path);
  return out;
}

for (const locale of BUILD.locales) {
  test(`${locale.code}: a prompt detail carries its content and absolute addresses`, async ({ request }) => {
    const d = samplePrompt(locale.code);
    const res = await request.get(`${BASE}${d.path}`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    expect(htmlElement(html)).toEqual({ lang: locale.htmlLang, dir: locale.direction });
    expect(dataAttr(html, 'page')).toBe('prompt-detail');
    const kind = message(locale.code, 'detail.kinds.prompt');
    expect(title(html)).toBe(
      message(locale.code, 'detail.documentTitle', { title: d.seo.title, kind, siteName: BUILD.siteName }),
    );
    expect(meta(html, 'description')).not.toBeNull();
    expect(elementText(html, 'h1')).toBe(d.title);
    // The whole prompt, not just its folded opening (§11.8.3), in its own language and direction.
    expect(promptText(html)).toBe(d.prompt.text);
    expect(html).toMatch(new RegExp(`<div id="[^"]*-prompt"[^>]*lang="${d.prompt.language}"`));
    // The main image: sized, prioritized, under the base path (§10.3).
    const img = /<img [^>]*fetchPriority="high"[^>]*>/.exec(html)?.[0] ?? '';
    expect(img).toContain(`src="${BASE}/media/`);
    expect(img).toContain(`width="${d.cover.width}"`);
    expect(img).toContain(`height="${d.cover.height}"`);
    // Test record and annotation notes are visible text (§9.2, §9.10.3, §11.1.9).
    for (const a of d.annotations) expect(decode(html)).toContain(a.note);

    expect(canonical(html)).toBe(publicUrl(d.path));
    expect(alternates(html)).toEqual(expectedAlternates(d.alternates));
    expect(meta(html, 'og:url')).toBe(publicUrl(d.path));
    expect(meta(html, 'og:image')).toMatch(new RegExp(`^${publicUrl('/media/').replace(/[.?]/g, '\\$&')}`));
    expect(meta(html, 'twitter:card')).toBe('summary_large_image');
    if (isPreview) expect(robots(html)).toContain('noindex, nofollow');
    else expect(robots(html).filter((r) => r.includes('noindex'))).toEqual([]);
    expectPrefixedReferences(html);
  });

  test(`${locale.code}: a template detail has the default sample's prompt in its HTML`, async ({ request }) => {
    const t = sampleTemplate(locale.code);
    test.skip(!t, `no template is visible in ${locale.code}`);
    const res = await request.get(`${BASE}${t!.path}`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(dataAttr(html, 'page')).toBe('template-detail');
    expect(elementText(html, 'h1')).toBe(t!.title);
    expect(promptText(html)).toBe(t!.version.defaultPrompt);
    expect(canonical(html)).toBe(publicUrl(t!.path));
    expect(alternates(html)).toEqual(expectedAlternates(t!.alternates));
    expectPrefixedReferences(html);
  });

  test(`${locale.code}: every link on a prompt detail resolves`, async ({ request }) => {
    const d = samplePrompt(locale.code);
    const html = await (await request.get(`${BASE}${d.path}`)).text();
    const links = [
      ...new Set(
        [...html.matchAll(/<a [^>]*href="([^"#]+)"/g)].map((m) => m[1]!).filter((href) => href.startsWith('/')),
      ),
    ];
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) {
      const res = await request.get(href);
      expect(res.status(), href).toBe(200);
    }
  });
}

const cjk = BUILD.locales.find((l) => ['zh-Hans', 'zh-Hant', 'ja', 'ko'].includes(l.code));
test('CJK pages link their display font subsets, served as WOFF2 under the base path', async ({ request }) => {
  test.skip(!cjk, 'no CJK locale in this build');
  const html = await (await request.get(`${BASE}${samplePrompt(cjk!.code).path}`)).text();
  const href = `${BASE}/generated/fonts/${cjk!.code}.css`;
  expect(html).toContain(`href="${href}"`);
  const css = await request.get(href);
  expect(css.status()).toBe(200);
  expect(css.headers()['content-type']).toContain('text/css');
  const files = [...(await css.text()).matchAll(/url\(\.\/([^)]+\.woff2)\)/g)].map((m) => m[1]!);
  expect(files.length).toBeGreaterThan(0);
  const font = await request.get(`${BASE}/generated/fonts/${files[0]}`);
  expect(font.status()).toBe(200);
  expect((await font.body()).subarray(0, 4).toString('latin1')).toBe('wOF2');
});

const rtl = BUILD.locales.find((l) => l.direction === 'rtl');
test('right-to-left pages keep the prompt left-to-right', async ({ request }) => {
  test.skip(!rtl, 'no right-to-left locale in this build');
  const d = samplePrompt(rtl!.code);
  const html = await (await request.get(`${BASE}${d.path}`)).text();
  expect(htmlElement(html).dir).toBe('rtl');
  expect(html).toMatch(new RegExp(`<div id="[^"]*-prompt"[^>]*lang="${d.prompt.language}" dir="ltr"`));
});
