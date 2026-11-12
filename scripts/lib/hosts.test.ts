import { describe, expect, it } from 'vitest';
import { createUrlModule } from '../../src/modules/url/create';
import {
  cloudflarePayloadProxies,
  cloudflareRedirects,
  cloudflareSharedPayloadProxies,
  hostRules,
  metaRefreshPage,
  netlifyRedirects,
  nginxRules,
  vercelConfig,
} from './hosts';

const locales = [
  { code: 'en', pathPrefix: 'en' },
  { code: 'zh-Hans', pathPrefix: 'zh-hans' },
];
const urlFor = (basePath: string) =>
  createUrlModule({
    origin: 'https://example.com',
    basePath,
    urlPattern: '{basePath}/{locale}/{path}',
    localePrefixes: ['en', 'zh-hans', 'zh'],
  });
const manifest = {
  redirects: [
    { from: '/en/prompts/old/', to: '/en/prompts/new/' },
    { from: '/zh/', to: '/zh-hans/' },
  ],
  gone: [
    { path: '/zh-hans/prompts/gone/', locale: 'zh-Hans', reason: 'license' as const },
    { path: '/xx/prompts/gone/', locale: 'xx', reason: 'removed' as const },
  ],
};

describe('host rules (§9.5)', () => {
  const url = urlFor('/prompt-seen');
  const rules = hostRules(manifest, url, locales);

  it.each(['', '/prompt-seen'])('preserves full RSC addresses under %s', (basePath) => {
    expect(cloudflarePayloadProxies(urlFor(basePath))).toEqual([
      `${basePath}/__next._full.txt ${basePath}/index.txt 200`,
      `${basePath}/*/__next._full.txt ${basePath}/:splat/index.txt 200`,
    ]);
    expect(cloudflareSharedPayloadProxies(urlFor(basePath))).toEqual([
      `${basePath}/:locale/prompts/:slug/__next._index.txt ${basePath}/generated/rsc/prompts-index.txt 200`,
      `${basePath}/:locale/templates/:slug/__next._index.txt ${basePath}/generated/rsc/templates-index.txt 200`,
    ]);
  });

  it('prefixes every address with the base path and finds each locale’s 410 page', () => {
    expect(rules.redirects).toEqual([
      { from: '/prompt-seen/en/prompts/old/', to: '/prompt-seen/en/prompts/new/' },
      { from: '/prompt-seen/zh/', to: '/prompt-seen/zh-hans/' },
    ]);
    // Locales outside this build have no 410 page and no rule.
    expect(rules.gone).toEqual([
      { path: '/prompt-seen/zh-hans/prompts/gone/', reason: 'license', page: '/prompt-seen/zh-hans/410/' },
    ]);
  });

  it('nginx: exact locations for both slash forms, 301 to a relative address, 410 with the locale page', () => {
    const conf = nginxRules(rules).join('\n');
    expect(conf).toContain('location = /prompt-seen/en/prompts/old/ { return 301 /prompt-seen/en/prompts/new/; }');
    expect(conf).toContain('location = /prompt-seen/en/prompts/old { return 301 /prompt-seen/en/prompts/new/; }');
    expect(conf).toContain(
      'location = /prompt-seen/zh-hans/prompts/gone { error_page 410 /prompt-seen/zh-hans/410/index.html; return 410; }',
    );
  });

  it('cloudflare: 301s only (Pages has no 410)', () => {
    expect(cloudflareRedirects(rules)).toEqual([
      '/prompt-seen/en/prompts/old/ /prompt-seen/en/prompts/new/ 301',
      '/prompt-seen/en/prompts/old /prompt-seen/en/prompts/new/ 301',
      '/prompt-seen/zh/ /prompt-seen/zh-hans/ 301',
      '/prompt-seen/zh /prompt-seen/zh-hans/ 301',
    ]);
  });

  it('netlify: gone addresses show the 410 page with 404, then per-locale and root 404 pages', () => {
    const lines = netlifyRedirects(rules, url, locales);
    expect(lines).toContain('/prompt-seen/zh-hans/prompts/gone/ /prompt-seen/zh-hans/410/ 404');
    expect(lines.slice(-3)).toEqual([
      '/prompt-seen/en/* /prompt-seen/en/404/ 404',
      '/prompt-seen/zh-hans/* /prompt-seen/zh-hans/404/ 404',
      '/prompt-seen/* /prompt-seen/404.html 404',
    ]);
  });

  it('vercel: trailing slashes and 301 redirects', () => {
    const json = JSON.parse(vercelConfig(rules));
    expect(json.trailingSlash).toBe(true);
    expect(json.redirects[0]).toEqual({
      source: '/prompt-seen/en/prompts/old/',
      destination: '/prompt-seen/en/prompts/new/',
      statusCode: 301,
    });
  });

  it('a root deployment has no prefix', () => {
    const root = hostRules(manifest, urlFor(''), locales);
    expect(root.redirects[0]).toEqual({ from: '/en/prompts/old/', to: '/en/prompts/new/' });
    expect(netlifyRedirects(root, urlFor(''), locales).at(-1)).toBe('/* /404.html 404');
  });

  it('meta refresh page: instant refresh, canonical, escaped', () => {
    const html = metaRefreshPage('/a/?x="1"&y', 'https://example.com/a/');
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=/a/?x=&quot;1&quot;&amp;y">');
    expect(html).toContain('<link rel="canonical" href="https://example.com/a/">');
  });
});
