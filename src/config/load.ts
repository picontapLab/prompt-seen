// Node-only: reads content/site.yaml, content/locales.yaml and the environment, and
// returns the validated configuration. Used by scripts and next.config.ts; app code
// imports the generated constants through `@/config` instead (design doc §4.1).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import { buildModeSchema, localesFileSchema, siteSchema, type ResolvedConfig } from './schema';

/** Environment variables that override site.yaml (§15.4.2: environment wins). */
export const ENV_KEYS = [
  'CONTENT_DIR',
  'SITE_ORIGIN',
  'BASE_PATH',
  'URL_PATTERN',
  'MEDIA_BASE_URL',
  'BUILD_MODE',
  'BUILD_ID',
] as const;
type Env = Readonly<Record<string, string | undefined>>;

export class ConfigError extends Error {
  constructor(
    readonly file: string,
    readonly issues: { path: string; message: string }[],
  ) {
    super(`${file}\n${issues.map((i) => `  ${i.path || '(root)'}: ${i.message}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

export function contentDir(root: string, env: Env = process.env): string {
  return path.resolve(root, env.CONTENT_DIR || 'content');
}

function readYaml(file: string): unknown {
  if (!fs.existsSync(file)) throw new ConfigError(file, [{ path: '', message: 'file not found' }]);
  try {
    return YAML.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ConfigError(file, [{ path: '', message: `invalid YAML: ${(error as Error).message}` }]);
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown, file: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new ConfigError(
    file,
    result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  );
}

function gitBuildId(root: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

export function loadConfig(root: string = process.cwd(), env: Env = process.env): ResolvedConfig {
  const dir = contentDir(root, env);
  const siteFile = path.join(dir, 'site.yaml');
  const localesFile = path.join(dir, 'locales.yaml');

  const site = parse(siteSchema, readYaml(siteFile), siteFile);
  const registry = parse(localesFileSchema, readYaml(localesFile), localesFile);

  const overrides = parse(
    siteSchema.pick({ origin: true, basePath: true, urlPattern: true }).partial(),
    {
      ...(env.SITE_ORIGIN !== undefined && { origin: env.SITE_ORIGIN }),
      ...(env.BASE_PATH !== undefined && { basePath: env.BASE_PATH }),
      ...(env.URL_PATTERN !== undefined && { urlPattern: env.URL_PATTERN }),
    },
    'environment (SITE_ORIGIN, BASE_PATH, URL_PATTERN)',
  );
  // The CDN of a deployment (§10.1): set per environment, so a fork never serves another
  // instance's images. An empty value turns it off (images from the build).
  const media =
    env.MEDIA_BASE_URL === undefined
      ? site.media
      : parse(siteSchema.shape.media, { baseUrl: env.MEDIA_BASE_URL || null }, 'environment (MEDIA_BASE_URL)');
  // Default to preview so an unconfigured build is never indexable (§15.1).
  const buildMode = parse(buildModeSchema, env.BUILD_MODE || 'preview', 'environment (BUILD_MODE)');

  return {
    ...site,
    ...overrides,
    media,
    buildMode,
    buildId: env.BUILD_ID || gitBuildId(root) || 'local',
    defaultLocale: registry.defaultLocale,
    locales: registry.locales,
    builtLocales: registry.locales.filter((l) => l.enabled || (buildMode === 'preview' && l.preview)),
  };
}
