import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Output directories of content:build (design doc §4.1). All are generated and git-ignored. */
export const OUTPUT_DIRS = {
  /** Public, served under the base path at /generated/… */
  public: path.join(ROOT, 'public/generated'),
  /** Build-only data: full index, MDX maps, reverse relations. Never published. */
  internal: path.join(ROOT, '.generated'),
  /** Host configuration: nginx include, Cloudflare _headers/_redirects, robots snippet. */
  deploy: path.join(ROOT, 'deploy/generated'),
} as const;

export type OutputDir = keyof typeof OUTPUT_DIRS;
