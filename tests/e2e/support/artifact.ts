import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// End-to-end tests always run against the packaged artifact in dist/, served by the reference
// nginx. They learn the build's configuration from its build.json instead of the environment,
// so they test what was actually built.

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export type BuildInfo = {
  buildId: string;
  buildMode: 'production' | 'preview';
  origin: string;
  basePath: string;
  urlPattern: string;
  defaultLocale: string;
  locales: { code: string; pathPrefix: string; htmlLang: string; direction: 'ltr' | 'rtl' }[];
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

export function readBuildInfo(): BuildInfo {
  const file = findBuildInfo(path.join(ROOT, 'dist'));
  if (!file) throw new Error('dist/ has no generated/build.json: run `npm run build` before the end-to-end tests');
  return JSON.parse(fs.readFileSync(file, 'utf8')) as BuildInfo;
}

export const BUILD = readBuildInfo();
export const BASE = BUILD.basePath;
export const PORT = Number(process.env.PORT ?? 8090);
export const NGINX_CONTAINER = `prompt-seen-nginx-${PORT}`;

/** Public URL on the canonical host for an internal path (default urlPattern). */
export const publicUrl = (internal: string) => `${BUILD.origin}${BASE}${internal}`;
