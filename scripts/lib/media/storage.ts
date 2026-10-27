import fs from 'node:fs';
import path from 'node:path';
import { s3Storage } from './s3';

// Media storage drivers (design doc §10.1). The local driver keeps files under public/, so a
// fresh clone runs the full site without cloud credentials (§15.5.3); the S3-compatible driver
// (s3.ts, Cloudflare R2 in production) is chosen with MEDIA_STORAGE=s3. Objects are never
// overwritten with different bytes: keys contain a content hash, and replacing an image creates
// new keys (§10.4).

export interface MediaStorage {
  readonly name: string;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  has(key: string): Promise<boolean>;
}

export function localStorage(root: string): MediaStorage {
  const fileOf = (key: string) => {
    const file = path.resolve(root, key);
    if (!file.startsWith(path.resolve(root) + path.sep)) throw new Error(`media key escapes the storage root: ${key}`);
    return file;
  };
  return {
    name: `local (${path.relative(process.cwd(), root) || '.'}/)`,
    async put(key, bytes) {
      const file = fileOf(key);
      if (fs.existsSync(file)) {
        if (Buffer.compare(fs.readFileSync(file), Buffer.from(bytes)) === 0) return;
        throw new Error(`${key} already exists with different content; keys are never reused (§10.4)`);
      }
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, bytes);
    },
    async get(key) {
      return fs.readFileSync(fileOf(key));
    },
    async has(key) {
      return fs.existsSync(fileOf(key));
    },
  };
}

/** Environment variables of the S3-compatible driver; MEDIA_STORAGE=s3 selects it. */
export const S3_ENV = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const;

/**
 * Object storage from the environment, for scripts that upload: MEDIA_STORAGE=s3 with S3_ENDPOINT,
 * S3_BUCKET, S3_REGION ("auto" by default, as R2 wants), S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.
 * Returns null when MEDIA_STORAGE is unset or "local". Credentials stay in CI secrets and the
 * maintainer's shell, never in the build (§15.2).
 */
export function s3StorageFromEnv(env: Readonly<Record<string, string | undefined>>): MediaStorage | null {
  const kind = env.MEDIA_STORAGE || 'local';
  if (kind === 'local') return null;
  if (kind !== 's3') throw new Error(`MEDIA_STORAGE must be "local" or "s3", not "${kind}"`);
  const missing = S3_ENV.filter((k) => !env[k]);
  if (missing.length) throw new Error(`MEDIA_STORAGE=s3 needs ${missing.join(', ')}`);
  return s3Storage({
    endpoint: env.S3_ENDPOINT!,
    bucket: env.S3_BUCKET!,
    region: env.S3_REGION || 'auto',
    accessKeyId: env.S3_ACCESS_KEY_ID!,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
  });
}
