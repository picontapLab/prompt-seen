// media:check (design doc §10.4 "上传成功并验证资源后再提交引用"): before a build with a CDN goes
// live, request every image address the built site references and fail on any that the CDN does
// not serve as an image. It reads the packaged dist/, so it checks exactly what pages, list and
// popup JSON, Markdown versions and sitemaps point at. Needs no credentials.
//
//   npm run build && npm run media:check
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../src/config/load';
import { ROOT } from './lib/paths';

const config = loadConfig(ROOT);

function fail(message: string): never {
  console.error(`media:check: ${message}`);
  process.exit(1);
}

function* files(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (/\.(html|json|md|xml|txt)$/.test(entry.name)) yield full;
  }
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function main() {
  const base = config.media.baseUrl;
  if (!base) {
    console.log('media:check: no media.baseUrl (or MEDIA_BASE_URL) in this build; images are files of the build');
    return;
  }
  const site = path.join(ROOT, 'dist', config.basePath);
  if (!fs.existsSync(path.join(site, 'generated/build.json'))) fail('dist/ is missing: run `npm run build` first');

  // Keys are "media/<asset>/<file>"; JSON may escape slashes as "\/".
  const pattern = new RegExp(
    `${escapeRegExp(base)}(?:/|\\\\/)(media(?:/|\\\\/)[A-Za-z0-9_./\\\\-]+?\\.(?:webp|avif|jpe?g|png))`,
    'g',
  );
  const urls = new Set<string>();
  for (const file of files(site))
    for (const m of fs.readFileSync(file, 'utf8').matchAll(pattern)) urls.add(`${base}/${m[1]!.replace(/\\\//g, '/')}`);
  if (!urls.size) fail(`no addresses on ${base} in dist/; was the build made with this media.baseUrl?`);

  const list = [...urls].sort();
  const problems: string[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 16 }, async () => {
      while (next < list.length) {
        const address = list[next++]!;
        try {
          const res = await fetch(address, { method: 'HEAD', signal: AbortSignal.timeout(20_000) });
          const type = res.headers.get('content-type') ?? '';
          if (res.status !== 200) problems.push(`${res.status} ${address}`);
          else if (!type.startsWith('image/')) problems.push(`${type || 'no content type'} ${address}`);
        } catch (error) {
          problems.push(`${(error as Error).message} ${address}`);
        }
      }
    }),
  );
  if (problems.length)
    fail(
      `${problems.length} of ${list.length} image address(es) are not served\n  ${problems.slice(0, 50).join('\n  ')}\n` +
        'Upload them with `npm run media:sync` (MEDIA_STORAGE=s3) and check again.',
    );
  console.log(`media:check: all ${list.length} image addresses on ${base} answer 200 with an image type`);
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
