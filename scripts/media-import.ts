// media:import (design doc §10.1, §14.1): process a local image, store the original and its
// display variants, and write content/media/<id>.yaml.
//
//   npm run media:import -- <image> --slug ink-portrait [--alt en="An ink portrait…"] [--alt zh-Hans="…"]
//        [--caption en="…"] [--creator "…"] [--credit "…"] [--copyright "…"] [--license "CC BY 4.0"]
//        [--license-url https://…] [--acquire-url https://…] [--source-url https://…]
//        [--source-type trainedAlgorithmicMedia] [--content-credentials unknown] [--id a_123] [--force]
//   npm run media:import -- --refresh a_001
//        regenerate the variants after editing focalPoint or credit in the YAML; new keys are
//        written and the old files are kept for rollback (§10.4).
// With MEDIA_STORAGE=s3 (and the S3_* variables, scripts/lib/media/storage.ts) files go to object
// storage instead of public/media/.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import YAML from 'yaml';
import { contentDir } from '../src/config/load';
import { DIGITAL_SOURCE_TYPES, mediaSchema, SLUG_PATTERN, type MediaSource } from './lib/content/schemas';
import { analyze, ImportError, originalKey, renderVariants, variantKey } from './lib/media/process';
import { localStorage, s3StorageFromEnv, type MediaStorage } from './lib/media/storage';
import { ROOT } from './lib/paths';

const usage = `Usage:
  npm run media:import -- <image> --slug <words-for-the-file-name> [--alt <locale>="text"]… [options]
  npm run media:import -- --refresh <asset-id>
Options: --caption <locale>="text"  --creator  --credit  --copyright  --license  --license-url
         --acquire-url  --source-url  --source-type <IPTC code>  --content-credentials present|absent|unknown
         --id a_123  --force (import even if the same file was imported before)`;

function fail(message: string): never {
  console.error(`media:import: ${message}`);
  process.exit(1);
}

function localeMap(values: string[] | undefined, flag: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const v of values ?? []) {
    const m = /^([A-Za-z]{2,3}(?:-[A-Za-z0-9]+)*)=(.+)$/s.exec(v);
    if (!m) fail(`--${flag} takes <locale>="text", e.g. --${flag} en="A quiet bamboo grove"`);
    map[m[1]!] = m[2]!.trim();
  }
  return map;
}

function mediaFiles(dir: string) {
  const mediaDir = path.join(dir, 'media');
  return fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir).filter((f) => /^a_\d+\.yaml$/.test(f)) : [];
}

function nextId(dir: string): string {
  const max = Math.max(0, ...mediaFiles(dir).map((f) => Number(f.slice(2, -5))));
  return `a_${String(max + 1).padStart(3, '0')}`;
}

async function storeVariants(storage: MediaStorage, id: string, slug: string, input: Buffer, media: MediaSource) {
  const rendered = await renderVariants(input, media, media);
  const variants = {} as MediaSource['variants'];
  for (const v of rendered) {
    const key = variantKey(id, slug, v);
    await storage.put(key, v.bytes, v.mimeType);
    variants[v.name] = { key, width: v.width, height: v.height, mimeType: v.mimeType };
  }
  // §10.4: verify every object before the YAML that references it is written.
  for (const v of Object.values(variants))
    if (!(await storage.has(v.key))) fail(`could not verify ${v.key} in storage`);
  return variants;
}

const HEADER = `# Written by \`npm run media:import\` (design doc §5.4). Edit alt, caption, credit, focalPoint
# and provenance freely; after changing focalPoint or credit, run
# \`npm run media:import -- --refresh <id>\` to regenerate the variants. Keys are never edited by hand.
`;

async function refresh(dir: string, storage: MediaStorage, id: string) {
  const file = path.join(dir, 'media', `${id}.yaml`);
  if (!fs.existsSync(file)) fail(`${path.relative(ROOT, file)} does not exist`);
  const doc = YAML.parseDocument(fs.readFileSync(file, 'utf8'));
  const parsed = mediaSchema.safeParse(doc.toJS());
  if (!parsed.success)
    fail(
      `${path.relative(ROOT, file)} is invalid: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  const media = parsed.data;
  if (!(await storage.has(media.original.key)))
    fail(`the original ${media.original.key} is not in storage; re-import the image instead`);
  const input = await storage.get(media.original.key);
  const slug = /^media\/a_\d+\/(.+)-original-[0-9a-f]+\.\w+$/.exec(media.original.key)?.[1] ?? id;
  const variants = await storeVariants(storage, id, slug, input, media);
  doc.set('variants', variants);
  fs.writeFileSync(file, doc.toString({ lineWidth: 0 }));
  console.log(`media:import: refreshed ${id} variants from ${media.original.key}`);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      slug: { type: 'string' },
      id: { type: 'string' },
      alt: { type: 'string', multiple: true },
      caption: { type: 'string', multiple: true },
      creator: { type: 'string' },
      credit: { type: 'string' },
      copyright: { type: 'string' },
      license: { type: 'string' },
      'license-url': { type: 'string' },
      'acquire-url': { type: 'string' },
      'source-url': { type: 'string' },
      'source-type': { type: 'string' },
      'content-credentials': { type: 'string' },
      refresh: { type: 'string' },
      force: { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log(usage);
    return;
  }

  const dir = contentDir(ROOT);
  // MEDIA_STORAGE=s3 stores straight into object storage (§10.1); the default keeps files in
  // public/media/, committed with the content, and `media:sync` uploads them later.
  const storage = s3StorageFromEnv(process.env) ?? localStorage(path.join(ROOT, 'public'));
  if (values.refresh) return refresh(dir, storage, values.refresh);

  const source = positionals[0];
  if (!source || positionals.length > 1) fail(`give one image file\n${usage}`);
  if (!fs.existsSync(source)) fail(`${source} does not exist`);
  const slug = values.slug ?? '';
  if (!SLUG_PATTERN.test(slug))
    fail('--slug is required: lowercase words for the file names, e.g. --slug ink-portrait');
  const sourceType = values['source-type'] ?? 'trainedAlgorithmicMedia';
  if (!(DIGITAL_SOURCE_TYPES as readonly string[]).includes(sourceType))
    fail(`--source-type must be an IPTC digital source type: ${DIGITAL_SOURCE_TYPES.join(', ')}`);

  const input = fs.readFileSync(source);
  const analysis = await analyze(input).catch((e: unknown) =>
    fail(e instanceof ImportError ? `${source}: ${e.message}` : String(e)),
  );

  // The same file imported twice would be two assets with identical keys' content (§10.4).
  for (const f of mediaFiles(dir)) {
    const existing = YAML.parse(fs.readFileSync(path.join(dir, 'media', f), 'utf8')) as { contentHash?: string };
    if (existing.contentHash === analysis.contentHash && !values.force) {
      console.log(
        `media:import: ${source} is already imported as ${f.slice(0, -5)} (same content hash). Use --force to import it again.`,
      );
      return;
    }
  }

  const id = values.id ?? nextId(dir);
  if (!/^a_\d{3,}$/.test(id)) fail('--id must look like a_123');
  const file = path.join(dir, 'media', `${id}.yaml`);
  if (fs.existsSync(file)) fail(`${path.relative(ROOT, file)} already exists`);

  const draft = mediaSchema.parse({
    id,
    contentHash: analysis.contentHash,
    mimeType: analysis.mimeType,
    width: analysis.width,
    height: analysis.height,
    original: { key: originalKey(id, slug, analysis.contentHash, analysis.extension) },
    variants: {
      // Replaced below; the schema needs a complete record to fill in defaults.
      thumbnail: { key: `media/${id}/x.webp`, width: 1, height: 1, mimeType: 'image/webp' },
      card: { key: `media/${id}/x.webp`, width: 1, height: 1, mimeType: 'image/webp' },
      detail: { key: `media/${id}/x.webp`, width: 1, height: 1, mimeType: 'image/webp' },
      og: { key: `media/${id}/x.jpg`, width: 1, height: 1, mimeType: 'image/jpeg' },
    },
    focalPoint: analysis.focalPoint,
    placeholder: { color: analysis.placeholder },
    alt: localeMap(values.alt, 'alt'),
    caption: localeMap(values.caption, 'caption'),
    credit: {
      creator: values.creator ?? null,
      creditText: values.credit ?? null,
      copyrightNotice: values.copyright ?? null,
      sourceUrl: values['source-url'] ?? null,
      license: values.license ?? null,
      licenseUrl: values['license-url'] ?? null,
      acquireLicenseUrl: values['acquire-url'] ?? null,
    },
    provenance: { digitalSourceType: sourceType, contentCredentials: values['content-credentials'] ?? 'unknown' },
  });

  await storage.put(draft.original.key, input, analysis.mimeType);
  const media: MediaSource = { ...draft, variants: await storeVariants(storage, id, slug, input, draft) };

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, HEADER + YAML.stringify(media, { lineWidth: 0 }));
  console.log(
    `media:import: ${id} (${analysis.width} × ${analysis.height}, ${analysis.format}) stored in ${storage.name}\n` +
      `  wrote ${path.relative(ROOT, file)}; suggested focal point ${analysis.focalPoint.x}, ${analysis.focalPoint.y}\n` +
      `  next: add alt text for every language you publish, then reference it as coverAssetId: ${id}`,
  );
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
