import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { mediaSchema, SLUG_PATTERN, type MediaSource } from '../content/schemas';
import { analyze, originalKey, renderVariants, variantKey } from './process';
import type { MediaStorage } from './storage';

// Shared import boundary (§10): explicit content/storage destinations, immutable object keys.
export type MediaMetadata = Partial<
  Pick<MediaSource, 'alt' | 'caption' | 'credit' | 'provenance' | 'focalPoint' | 'processing'>
>;
const records = (dir: string) =>
  fs.existsSync(path.join(dir, 'media'))
    ? fs.readdirSync(path.join(dir, 'media')).filter((f) => /^a_\d+\.yaml$/.test(f))
    : [];
async function storeVariants(storage: MediaStorage, slug: string, input: Buffer, media: MediaSource) {
  const variants = { ...media.variants };
  for (const v of await renderVariants(input, media, media)) {
    const key = variantKey(media.id, slug, v);
    await storage.put(key, v.bytes, v.mimeType);
    variants[v.name] = { key, width: v.width, height: v.height, mimeType: v.mimeType };
  }
  for (const v of Object.values(variants))
    if (!(await storage.has(v.key))) throw new Error(`Could not verify ${v.key} in storage`);
  return variants;
}
function save(file: string, text: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, text);
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}
export async function importMedia({
  dir,
  storage,
  input,
  slug,
  id,
  force = false,
  metadata = {},
}: {
  dir: string;
  storage: MediaStorage;
  input: Buffer;
  slug: string;
  id?: string;
  force?: boolean;
  metadata?: MediaMetadata;
}): Promise<MediaSource> {
  if (!SLUG_PATTERN.test(slug)) throw new Error('Invalid media slug');
  const analysis = await analyze(input);
  const existing = records(dir);
  if (!force)
    for (const file of existing) {
      const record = mediaSchema.parse(YAML.parse(fs.readFileSync(path.join(dir, 'media', file), 'utf8')));
      if (record.contentHash === analysis.contentHash) return record;
    }
  id ??= `a_${String(Math.max(0, ...existing.map((f) => Number(f.slice(2, -5)))) + 1).padStart(3, '0')}`;
  if (!/^a_\d{3,}$/.test(id)) throw new Error('Invalid asset ID');
  const file = path.join(dir, 'media', `${id}.yaml`);
  if (fs.existsSync(file)) throw new Error(`${file} already exists`);
  const placeholder = { key: `media/${id}/x.webp`, width: 1, height: 1, mimeType: 'image/webp' };
  const media = mediaSchema.parse({
    ...metadata,
    id,
    contentHash: analysis.contentHash,
    mimeType: analysis.mimeType,
    width: analysis.width,
    height: analysis.height,
    original: { key: originalKey(id, slug, analysis.contentHash, analysis.extension) },
    variants: {
      thumbnail: placeholder,
      card: placeholder,
      detail: placeholder,
      og: { ...placeholder, key: `media/${id}/x.jpg`, mimeType: 'image/jpeg' },
    },
    focalPoint: metadata.focalPoint ?? analysis.focalPoint,
    placeholder: { color: analysis.placeholder },
  });
  await storage.put(media.original.key, input, media.mimeType);
  if (!(await storage.has(media.original.key))) throw new Error('Mother image was not stored');
  media.variants = await storeVariants(storage, slug, input, media);
  save(
    file,
    '# Written by media:import. Objects are immutable; use --refresh after metadata changes.\n' +
      YAML.stringify(media, { lineWidth: 0 }),
  );
  return media;
}
export async function refreshMedia({
  dir,
  storage,
  id,
}: {
  dir: string;
  storage: MediaStorage;
  id: string;
}): Promise<MediaSource> {
  if (!/^a_\d{3,}$/.test(id)) throw new Error('Invalid asset ID');
  const file = path.join(dir, 'media', `${id}.yaml`);
  const doc = YAML.parseDocument(fs.readFileSync(file, 'utf8'));
  const media = mediaSchema.parse(doc.toJS());
  const input = await storage.get(media.original.key);
  const analysis = await analyze(input);
  if (analysis.contentHash !== media.contentHash) throw new Error('Mother image content hash mismatch');
  const slug = /^media\/a_\d+\/(.+)-original-[a-f0-9]+\.\w+$/.exec(media.original.key)?.[1] ?? id;
  media.variants = await storeVariants(storage, slug, input, media);
  doc.set('variants', media.variants);
  save(file, doc.toString({ lineWidth: 0 }));
  return media;
}
