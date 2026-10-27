// media:sync (design doc §10.1, §10.4): upload the local media driver's files to object storage.
// Content keeps its images in public/media/ (committed, so a fresh clone runs without cloud
// credentials); before a deploy with a CDN, every original and variant named in content/media/
// is put into the bucket. Existing objects are checked, never replaced, so the command can run on
// every deploy and old keys stay available for rollback.
//
//   MEDIA_STORAGE=s3 S3_ENDPOINT=… S3_BUCKET=… S3_ACCESS_KEY_ID=… S3_SECRET_ACCESS_KEY=… npm run media:sync
//   npm run media:sync -- --dry-run     list what would be uploaded
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import YAML from 'yaml';
import { contentDir } from '../src/config/load';
import { mediaSchema } from './lib/content/schemas';
import { localStorage, s3StorageFromEnv } from './lib/media/storage';
import { ROOT } from './lib/paths';

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function fail(message: string): never {
  console.error(`media:sync: ${message}`);
  process.exit(1);
}

/** Every stored object an image's YAML names: the original and each variant. */
function referencedKeys(dir: string): string[] {
  const mediaDir = path.join(dir, 'media');
  if (!fs.existsSync(mediaDir)) return [];
  const keys = new Set<string>();
  for (const file of fs.readdirSync(mediaDir).filter((f) => f.endsWith('.yaml'))) {
    const parsed = mediaSchema.safeParse(YAML.parse(fs.readFileSync(path.join(mediaDir, file), 'utf8')));
    if (!parsed.success) fail(`content/media/${file} is invalid; run \`npm run content:validate\``);
    keys.add(parsed.data.original.key);
    for (const v of Object.values(parsed.data.variants)) keys.add(v.key);
  }
  return [...keys].sort();
}

async function pool<T>(items: T[], size: number, run: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) await run(items[next++]!);
    }),
  );
}

async function main() {
  const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean' } } });
  let remote;
  try {
    remote = s3StorageFromEnv(process.env);
  } catch (error) {
    fail((error as Error).message);
  }
  if (!remote) fail('set MEDIA_STORAGE=s3 and the S3_* variables (docs/operations.md)');

  const local = localStorage(path.join(ROOT, 'public'));
  const keys = referencedKeys(contentDir(ROOT));
  const missingLocally = (await Promise.all(keys.map(async (k) => ((await local.has(k)) ? null : k)))).filter(Boolean);
  let uploaded = 0;
  let present = 0;
  const problems: string[] = [];

  await pool(
    keys.filter((k) => !missingLocally.includes(k)),
    8,
    async (key) => {
      try {
        if (await remote.has(key)) {
          present++;
          return;
        }
        if (values['dry-run']) {
          console.log(`  would upload ${key}`);
          uploaded++;
          return;
        }
        await remote.put(
          key,
          await local.get(key),
          MIME[path.extname(key).toLowerCase()] ?? 'application/octet-stream',
        );
        uploaded++;
      } catch (error) {
        problems.push(`${key}: ${(error as Error).message}`);
      }
    },
  );

  console.log(
    `media:sync: ${uploaded} ${values['dry-run'] ? 'to upload' : 'uploaded'}, ${present} already in ${remote.name}` +
      (missingLocally.length ? `, ${missingLocally.length} not in public/media/ (checked by media:check)` : ''),
  );
  if (problems.length) fail(`${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
