import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// End-to-end tests always run against the packaged artifact in dist/, served by the reference
// nginx. They learn the build's configuration from its build.json instead of the environment,
// so they test what was actually built.

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export type BuildInfo = {
  buildId: string;
  siteName: string;
  buildMode: 'production' | 'preview';
  origin: string;
  basePath: string;
  urlPattern: string;
  /** null: images are files of the build; else the CDN they are served from (§10.1). */
  mediaBaseUrl: string | null;
  defaultLocale: string;
  locales: {
    code: string;
    pathPrefix: string;
    nativeName: string;
    htmlLang: string;
    direction: 'ltr' | 'rtl';
    /** Public; built locales that are not are preview-only drafts. */
    enabled: boolean;
  }[];
};

function findBuildInfo(dir: string, depth = 0): string | null {
  const candidate = path.join(dir, 'generated/build.json');
  if (fs.existsSync(candidate)) return candidate;
  if (depth >= 3 || !fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name === 'generated') continue;
    const found = findBuildInfo(path.join(dir, entry.name), depth + 1);
    if (found) return found;
  }
  return null;
}

export function readBuildInfo(directory = path.join(ROOT, 'dist')): BuildInfo {
  const file = findBuildInfo(directory);
  if (!file) throw new Error('Artifact has no generated/build.json: run `npm run build` before the browser tests');
  return JSON.parse(fs.readFileSync(file, 'utf8')) as BuildInfo;
}

export const BUILD = readBuildInfo();
export const BASE = BUILD.basePath;
export const PORT = Number(process.env.PORT ?? 8090);
export const NGINX_CONTAINER = `prompt-seen-nginx-${PORT}`;

/** Public URL on the canonical host for an internal path (default urlPattern). */
export const publicUrl = (internal: string) => `${BUILD.origin}${BASE}${internal}`;

/**
 * A UI message from the repository catalogs, with simple {name} arguments filled in. Lets tests
 * check that each locale's page shows that locale's text, not the default language.
 */
export function message(code: string, key: string, values: Record<string, string> = {}): string {
  const [namespace, ...rest] = key.split('.');
  const file = path.join(ROOT, 'src/i18n/messages', code, `${namespace}.json`);
  let node: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const part of rest) node = (node as Record<string, unknown>)[part];
  if (typeof node !== 'string') throw new Error(`no message ${key} in ${code}`);
  return node.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? `{${name}}`);
}

/** Canonical home: the default language lives at the site root. */
export const homePath = (locale: Pick<BuildInfo['locales'][number], 'code' | 'pathPrefix'>) =>
  locale.code === BUILD.defaultLocale ? '/' : `/${locale.pathPrefix}/`;
