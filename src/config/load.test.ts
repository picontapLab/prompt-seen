import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from './load';

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

  it('rejects unknown keys so typos do not pass silently', () => {
    expect(issues(() => loadConfig(fixture(`${SITE}baseUrl: /x\n`)))).toMatch(/baseUrl/);
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
    expect(config.locales).toHaveLength(13);
  });
});
