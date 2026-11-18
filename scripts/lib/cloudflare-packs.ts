import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { ROOT } from './paths';

// Smaller packs bound the work for a cold read on Pages hosts that ignore HTTP Range.
const MAX_PACK_BYTES = 256 * 1024;
const TREE_PACK_BYTES = 32 * 1024;

export function packPagesPayloads(target: string, basePath: string, files: string[]) {
  const site = path.join(target, basePath);
  const packDir = path.join(site, 'generated/payload-packs');
  for (const reserved of [packDir, path.join(target, '_worker.js'), path.join(target, '_routes.json')]) {
    if (fs.existsSync(reserved))
      throw new Error(`Pages payload packaging conflicts with ${path.relative(target, reserved)}`);
  }
  // Each range is a complete gzip stream. A request only inflates its own resource.
  const index: Record<string, [number, number, number, number]> = {};
  const packs: string[] = [];
  const include = new Set<string>();
  let chunks: Buffer[] = [];
  let size = 0;
  function flush() {
    if (!size) return;
    const pack = Buffer.concat(chunks, size);
    const filename = createHash('sha256').update(pack).digest('hex') + '.bin';
    fs.mkdirSync(packDir, { recursive: true });
    fs.writeFileSync(path.join(packDir, filename), pack);
    packs.push(`${basePath}/generated/payload-packs/${filename}`);
    chunks = [];
    size = 0;
  }

  // Stable boundaries between locales and resource types limit repacking when content changes.
  const groups = new Map<string, string[]>();
  const exported = new Set(files);
  for (const file of files.toSorted()) {
    const relative = file.split(path.sep).join('/');
    const name = path.basename(file);
    const popup = /^generated\/([^/]+)\/prompts\/[^/]+\.json$/.exec(relative);
    let kind: string;
    if (popup) {
      kind = 'popup';
      include.add(`${basePath}/generated/${popup[1]}/prompts/*`);
    } else if (name === 'index.txt' && exported.has(path.join(path.dirname(file), '__next._full.txt'))) {
      // Preparation has already verified byte equality. Both original URLs use the same range.
      kind = 'full';
      for (const suffix of ['/index.txt', '/*/index.txt', '/__next._full.txt', '/*/__next._full.txt'])
        include.add(basePath + suffix);
    } else if (name === '__next._tree.txt') {
      kind = 'tree';
      include.add(basePath + '/*__next._tree.txt');
    } else if (name.startsWith('__next.') && name.endsWith('.__PAGE__.txt')) {
      kind = 'page';
      include.add(basePath + '/*.__PAGE__.txt');
    } else continue;
    const locale = popup?.[1] ?? (relative.includes('/') ? relative.split('/')[0] : '');
    const key = `${kind}/${locale}`;
    const group = groups.get(key) ?? [];
    group.push(relative);
    groups.set(key, group);
  }
  for (const [group, paths] of groups) {
    const limit = group.startsWith('tree/') ? TREE_PACK_BYTES : MAX_PACK_BYTES;
    for (const relative of paths) {
      const bytes = fs.readFileSync(path.join(site, relative));
      if (!bytes.length || bytes.length > 1024 * 1024) continue;
      const compressed = gzipSync(bytes, { level: 1 });
      if (compressed.length > limit) continue;
      if (size + compressed.length > limit) flush();
      index[`${basePath}/${relative}`] = [packs.length, size, compressed.length, bytes.length];
      chunks.push(compressed);
      size += compressed.length;
    }
    flush();
  }
  if (!packs.length) return;
  if (include.size > 100) throw new Error('Pages payloads require more than 100 function routes');
  const worker = fs.readFileSync(path.join(ROOT, 'deploy/hosts/pages-payloads.js'), 'utf8');
  fs.writeFileSync(
    path.join(target, '_worker.js'),
    `${worker}\nexport default createPayloadWorker(${JSON.stringify(index)},${JSON.stringify(packs)});\n`,
  );
  fs.writeFileSync(
    path.join(target, '_routes.json'),
    JSON.stringify({ version: 1, include: [...include], exclude: [] }),
  );
  for (const pathname of Object.keys(index)) fs.unlinkSync(path.join(target, pathname));
  console.log(
    `deploy:cloudflare: packed ${Object.keys(index).length} navigation and popup payloads in ${packs.length} packs`,
  );
}
