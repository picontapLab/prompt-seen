import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { ConfigError, loadConfig } from './load';
import { siteSchema } from './schema';

const SITE = `siteName: Test
origin: https://example.com
basePath: /prompt-seen
`;
const LOCALES = `defaultLocale: en
locales:
  - { code: en, pathPrefix: en, nativeName: English, htmlLang: en, direction: ltr, enabled: true, phase: 1 }
  - { code: zh-Hans, pathPrefix: zh-hans, nativeName: 简体中文, htmlLang: zh-Hans, direction: ltr, enabled: false, phase: 1 }
  - { code: ar, pathPrefix: ar, nativeName: العربية, htmlLang: ar, direction: rtl, enabled: false, preview: true, phase: 2 }
`;

const dirs: string[] = [];
function fixture(site = SITE, locales = LOCALES) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-seen-config-'));
  dirs.push(root);
  fs.mkdirSync(path.join(root, 'content'));
  fs.writeFileSync(path.join(root, 'content/site.yaml'), site);
  fs.writeFileSync(path.join(root, 'content/locales.yaml'), locales);
  return root;
}
afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

describe('repository', () => {
  const parse = (repository?: unknown) =>
    siteSchema.safeParse({ siteName: 'Test', origin: 'https://example.com', basePath: '', repository });

  it('is off unless the site names one', () => {
    expect(parse().data?.repository).toBeNull();
  });

  it('takes a GitHub repository address', () => {
    expect(parse('https://github.com/example/prompt-seen').data?.repository).toBe(
      'https://github.com/example/prompt-seen',
    );
  });

  it('rejects addresses that are not a GitHub repository, since the link shows its logo', () => {
    expect(parse('https://gitlab.com/example/prompt-seen').success).toBe(false);
    expect(parse('http://github.com/example/prompt-seen').success).toBe(false);
    expect(parse('https://github.com/example').success).toBe(false);
  });
});

const issues = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof ConfigError) return error.issues.map((i) => `${i.path}: ${i.message}`).join('\n');
    throw error;
  }
  throw new Error('expected a ConfigError');
};

describe('loadConfig', () => {
  it('applies defaults and defaults to a preview build', () => {
    const config = loadConfig(fixture(), { BUILD_ID: 'test' });
    expect(config.buildMode).toBe('preview');
    expect(config.urlPattern).toBe('{basePath}/{locale}/{path}');
    expect(config.robots).toEqual({ mode: 'standalone', aiTraining: 'disallow' });
    expect(config.home.featured).toEqual([]);
    expect(config.buildId).toBe('test');
  });

  it('builds enabled locales in production and adds preview locales in preview mode', () => {
    const root = fixture();
    expect(loadConfig(root, { BUILD_MODE: 'production' }).builtLocales.map((l) => l.code)).toEqual(['en']);
    expect(loadConfig(root, { BUILD_MODE: 'preview' }).builtLocales.map((l) => l.code)).toEqual(['en', 'ar']);
  });

  it('lets the environment override site.yaml (§15.4.2)', () => {
    const config = loadConfig(fixture(), { BASE_PATH: '', SITE_ORIGIN: 'https://prompts.example.org' });
    expect(config.basePath).toBe('');
    expect(config.origin).toBe('https://prompts.example.org');
  });

  it('rejects malformed base paths, origins and patterns', () => {
    const root = fixture();
    expect(issues(() => loadConfig(root, { BASE_PATH: '/prompt-seen/' }))).toMatch(/^basePath:/);
    expect(issues(() => loadConfig(root, { BASE_PATH: 'prompt-seen' }))).toMatch(/^basePath:/);
    expect(issues(() => loadConfig(root, { SITE_ORIGIN: 'https://example.com/sub' }))).toMatch(/^origin:/);
    expect(issues(() => loadConfig(root, { URL_PATTERN: '/{locale}/{path}' }))).toMatch(/^urlPattern:/);
    expect(issues(() => loadConfig(root, { BUILD_MODE: 'staging' }))).toMatch(/production|preview/);
  });

  it('reads the CDN, analytics and verification settings, with MEDIA_BASE_URL winning (step 5)', () => {
    const plain = loadConfig(fixture());
    expect(plain.media).toEqual({ baseUrl: null });
    expect(plain.analytics).toEqual({ provider: 'none' });
    expect(plain.searchEngines.verification).toEqual({ google: null, bing: null, yandex: null, naver: null });

    const site = `${SITE}media:\n  baseUrl: https://media.example.com\nanalytics:\n  provider: plausible\n  domain: example.com\nsearchEngines:\n  verification:\n    google: abc_DEF-123\n`;
    const config = loadConfig(fixture(site));
    expect(config.media.baseUrl).toBe('https://media.example.com');
    expect(config.analytics).toEqual({
      provider: 'plausible',
      domain: 'example.com',
      src: 'https://plausible.io/js/script.js',
    });
    expect(config.searchEngines.verification.google).toBe('abc_DEF-123');

    expect(loadConfig(fixture(site), { MEDIA_BASE_URL: 'https://cdn.example.org/ps' }).media.baseUrl).toBe(
      'https://cdn.example.org/ps',
    );
    expect(loadConfig(fixture(site), { MEDIA_BASE_URL: '' }).media.baseUrl).toBeNull();
    expect(issues(() => loadConfig(fixture(), { MEDIA_BASE_URL: 'https://media.example.com/' }))).toMatch(/^baseUrl:/);
    expect(issues(() => loadConfig(fixture(), { MEDIA_BASE_URL: 'http://media.example.com' }))).toMatch(/^baseUrl:/);
    expect(issues(() => loadConfig(fixture(`${SITE}analytics:\n  provider: cloudflare\n  token: nope\n`)))).toMatch(
      /^analytics\.token:/,
    );
    expect(
      issues(() => loadConfig(fixture(`${SITE}searchEngines:\n  verification:\n    bing: '<meta content="x">'\n`))),
    ).toMatch(/^searchEngines\.verification\.bing:/);
  });

  it('rejects unknown keys so typos do not pass silently', () => {
    expect(issues(() => loadConfig(fixture(`${SITE}baseUrl: /x\n`)))).toMatch(/baseUrl/);
  });

  it('reads the home showcase list (§11.8.1) and checks its entries', () => {
    const site = `${SITE}home:\n  featured:\n    - { prompt: p_045, from: '2026-10-19' }\n    - prompt: p_012\n`;
    expect(loadConfig(fixture(site)).home.featured).toEqual([
      { prompt: 'p_045', from: '2026-10-19' },
      { prompt: 'p_012' },
    ]);
    expect(issues(() => loadConfig(fixture(`${SITE}home:\n  featured: [p_045]\n`)))).toMatch(/^home\.featured\.0/);
    expect(issues(() => loadConfig(fixture(`${SITE}home:\n  featured:\n    - { prompt: t_001 }\n`)))).toMatch(/p_001/);
    expect(
      issues(() => loadConfig(fixture(`${SITE}home:\n  featured:\n    - { prompt: p_045, from: 19 Oct }\n`))),
    ).toMatch(/YYYY-MM-DD/);
  });

  it('checks the locale registry', () => {
    const disabledDefault = LOCALES.replace('enabled: true', 'enabled: false');
    expect(issues(() => loadConfig(fixture(SITE, disabledDefault)))).toMatch(/defaultLocale must be enabled/);
    const badPrefix = LOCALES.replace('pathPrefix: zh-hans', 'pathPrefix: zh');
    expect(issues(() => loadConfig(fixture(SITE, badPrefix)))).toMatch(/lowercase form of code/);
    const duplicate = `${LOCALES}  - { code: en, pathPrefix: en, nativeName: E, htmlLang: en, direction: ltr, enabled: true, phase: 1 }\n`;
    expect(issues(() => loadConfig(fixture(SITE, duplicate)))).toMatch(/duplicate locale code "en"/);
  });

  it('accepts the repository configuration', () => {
    const config = loadConfig(path.resolve(import.meta.dirname, '../..'), { BUILD_MODE: 'production' });
    expect(config.builtLocales.length).toBeGreaterThan(0);
    expect(new Set(config.locales.map((locale) => locale.code)).size).toBe(config.locales.length);
    expect(config.locales.some((locale) => locale.code === config.defaultLocale && locale.enabled)).toBe(true);
    expect(config.builtLocales).toEqual(config.locales.filter((locale) => locale.enabled));
    const preview = loadConfig(path.resolve(import.meta.dirname, '../..'), { BUILD_MODE: 'preview' });
    expect(preview.builtLocales).toEqual(preview.locales.filter((locale) => locale.enabled || locale.preview));
  });

  it('documents every site.yaml key in site.example.yaml, and the example is valid (§15.5.3)', () => {
    const example = YAML.parse(fs.readFileSync(path.join(__dirname, '../../site.example.yaml'), 'utf8'));
    expect(siteSchema.safeParse(example).success).toBe(true);
    expect(Object.keys(example).sort()).toEqual(Object.keys(siteSchema.shape).sort());
  });
});
