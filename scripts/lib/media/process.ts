import crypto from 'node:crypto';
import sharp, { type Metadata } from 'sharp';
import type { MediaSource } from '../content/schemas';
import { buildXmp } from './xmp';

// Image processing for media:import (design doc §10.1, §10.2, §9.7): read the original, hash
// it, suggest a placeholder colour and focal point, and render the display variants. Originals
// are stored as they are, never re-encoded (§9.7). Variants keep the original ratio and are
// never enlarged; only `og` is a crop (§5.4).

export const ACCEPTED_FORMATS = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
} as const;
type Format = keyof typeof ACCEPTED_FORMATS;
const EXTENSION: Record<Format, string> = { jpeg: 'jpg', png: 'png', webp: 'webp', avif: 'avif' };

/** Longest side of each display variant (§10.2). */
export const VARIANT_LONGEST_SIDE = { thumbnail: 480, card: 960, detail: 1600 } as const;
/** Open Graph size: 1200 × 630, cropped around the focal point (§9.3, §9.7). */
export const OG_SIZE = { width: 1200, height: 630 } as const;

export type Analysis = {
  format: Format;
  mimeType: MediaSource['mimeType'];
  extension: string;
  width: number;
  height: number;
  /** "sha256:<64 hex>" of the original file. */
  contentHash: string;
  placeholder: string;
  focalPoint: { x: number; y: number };
};

export type RenderedVariant = {
  name: 'thumbnail' | 'card' | 'detail' | 'og';
  bytes: Buffer;
  width: number;
  height: number;
  mimeType: 'image/webp' | 'image/jpeg';
};

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
const round3 = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;

export class ImportError extends Error {}

export async function analyze(input: Buffer): Promise<Analysis> {
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new ImportError('not a readable image');
  }
  const format = meta.format as string;
  if (!(format in ACCEPTED_FORMATS))
    throw new ImportError(`${format || 'unknown'} images are not accepted; use JPEG, PNG, WebP or AVIF`);
  if ((meta.pages ?? 1) > 1) throw new ImportError('animated or multi-page images are not accepted');
  const { width, height } = meta.autoOrient;
  if (width < 320 || height < 200)
    throw new ImportError(`${width} × ${height} is too small; the shortest useful size is about 320 × 200`);

  const oriented = () => sharp(input).autoOrient();
  const stats = await oriented().stats();
  const { r, g, b } = stats.dominant;

  // Suggested focal point: where libvips' attention strategy would centre a crop (§10.1).
  // attentionX/Y are in the resized, not yet cropped image.
  const scale = Math.max(256 / width, 256 / height);
  const { info } = await oriented()
    .resize(256, 256, { fit: 'cover', position: sharp.strategy.attention })
    .toBuffer({ resolveWithObject: true });
  const focalPoint = {
    x: round3((info.attentionX ?? (width * scale) / 2) / (width * scale)),
    y: round3((info.attentionY ?? (height * scale) / 2) / (height * scale)),
  };

  return {
    format: format as Format,
    mimeType: ACCEPTED_FORMATS[format as Format],
    extension: EXTENSION[format as Format],
    width,
    height,
    contentHash: `sha256:${crypto.createHash('sha256').update(input).digest('hex')}`,
    placeholder: `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase(),
    focalPoint,
  };
}

/** The crop window for `og`: the largest 1200:630 rectangle centred as close to the focal point as fits. */
export function ogCrop(width: number, height: number, focal: { x: number; y: number }) {
  const ratio = OG_SIZE.width / OG_SIZE.height;
  const w = width / height > ratio ? Math.round(height * ratio) : width;
  const h = width / height > ratio ? height : Math.round(width / ratio);
  const left = Math.round(Math.min(Math.max(focal.x * width - w / 2, 0), width - w));
  const top = Math.round(Math.min(Math.max(focal.y * height - h / 2, 0), height - h));
  return { left, top, width: w, height: h };
}

export async function renderVariants(
  input: Buffer,
  analysis: Pick<Analysis, 'width' | 'height'>,
  media: Pick<MediaSource, 'focalPoint' | 'credit' | 'provenance' | 'processing'>,
): Promise<RenderedVariant[]> {
  const xmp = buildXmp(media.credit, media.provenance);
  const longest = Math.max(analysis.width, analysis.height);
  const out: RenderedVariant[] = [];

  for (const name of ['thumbnail', 'card', 'detail'] as const) {
    const side = Math.min(VARIANT_LONGEST_SIDE[name], longest);
    const encoding = media.processing?.[name];
    let pipeline = sharp(input)
      .autoOrient()
      .resize({ width: side, height: side, fit: 'inside', withoutEnlargement: true })
      .webp(
        encoding?.lossless
          ? { lossless: true, effort: 5 }
          : { quality: encoding?.quality ?? (name === 'thumbnail' ? 76 : 82), effort: 5 },
      );
    // Metadata only where it matters for search and sharing; small variants stay small (§9.7).
    if (name === 'detail') pipeline = pipeline.withXmp(xmp);
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    out.push({ name, bytes: data, width: info.width, height: info.height, mimeType: 'image/webp' });
  }

  const crop = ogCrop(analysis.width, analysis.height, media.focalPoint);
  const { data, info } = await sharp(input)
    .autoOrient()
    .extract(crop)
    .resize({ width: OG_SIZE.width, height: OG_SIZE.height, fit: 'fill', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: media.processing?.og.quality ?? 84, mozjpeg: true })
    .withXmp(xmp)
    .toBuffer({ resolveWithObject: true });
  out.push({ name: 'og', bytes: data, width: info.width, height: info.height, mimeType: 'image/jpeg' });
  return out;
}

const short = (bytes: Buffer | string) => crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);

/**
 * Object keys (§5.4, §10.4): the asset ID, readable words from the slug at import time, the
 * variant and a hash of the stored bytes, so different content never reuses a key.
 */
export const originalKey = (id: string, slug: string, contentHash: string, extension: string) =>
  `media/${id}/${slug}-original-${contentHash.replace('sha256:', '').slice(0, 12)}.${extension}`;
export const variantKey = (id: string, slug: string, v: RenderedVariant) =>
  `media/${id}/${slug}-${v.name}-${short(v.bytes)}.${v.mimeType === 'image/jpeg' ? 'jpg' : 'webp'}`;
