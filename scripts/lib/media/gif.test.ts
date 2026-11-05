import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, expect, it } from 'vitest';
import { animatedGif } from '../../../tests/support/gif';
import { mediaSchema } from '../content/schemas';
import { describeArtifact } from '../media-generation/jobs';
import { importMedia, refreshMedia } from './import';
import { analyze, renderVariants } from './process';
import { localStorage } from './storage';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

it.each([0, 3])('retains GIF frames, timing, transparency and loop=%i in every display size', async (loop) => {
  const input = await animatedGif(640, 480, loop);
  const analysis = await analyze(input);
  expect(analysis).toMatchObject({
    format: 'gif',
    mimeType: 'image/gif',
    width: 640,
    height: 480,
    byteSize: input.length,
    animation: { frameCount: 2, durationMs: 360, loopCount: loop },
  });
  const media = mediaSchema.parse({
    id: 'a_001',
    contentHash: analysis.contentHash,
    mimeType: analysis.mimeType,
    width: 640,
    height: 480,
    original: { key: 'media/a_001/test.gif' },
    variants: Object.fromEntries(
      ['thumbnail', 'card', 'detail', 'og'].map((name) => [
        name,
        { key: 'media/a_001/test.webp', width: 640, height: 480, mimeType: 'image/webp' },
      ]),
    ),
    placeholder: { color: '#FF0000' },
  });
  const variants = await renderVariants(input, analysis, media);
  for (const variant of variants) {
    const meta = await sharp(variant.bytes).metadata();
    if (variant.name === 'og') {
      expect(meta.format).toBe('jpeg');
      expect(meta.pages ?? 1).toBe(1);
      continue;
    }
    expect(meta).toMatchObject({ format: 'webp', pages: 2, delay: [120, 240], loop, hasAlpha: true });
    expect(variant.width / variant.height).toBeCloseTo(4 / 3);
    expect(meta.height).toBe(variant.height);
    for (const frame of [0, 1]) {
      const { data, info } = await sharp(variant.bytes, { page: frame, pages: 1 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const center = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * 4;
      expect(data[center + frame]).toBeGreaterThan(240);
      expect(data[3]).toBe(0);
    }
  }
});

it('preserves original GIF bytes and animation metadata across import and refresh', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gif-import-'));
  roots.push(root);
  const dir = path.join(root, 'content');
  const storage = localStorage(path.join(root, 'public'));
  const input = await animatedGif();
  const media = await importMedia({ dir, storage, input, slug: 'moving-colors' });
  expect(media.original.key).toMatch(/\.gif$/);
  expect(await storage.get(media.original.key)).toEqual(input);
  expect(media.animation).toEqual({ frameCount: 2, durationMs: 360, loopCount: 0 });
  const refreshed = await refreshMedia({ dir, storage, id: media.id });
  expect(refreshed.variants).toEqual(media.variants);
  expect(refreshed.animation).toEqual(media.animation);
  for (const key of [media.original.key, media.variants.detail.key]) {
    const artifact = await describeArtifact(root, path.join(root, 'public', key));
    expect(artifact).toMatchObject({ width: 640, height: 480 });
  }
});

it('accepts single-frame GIFs as static images and still rejects other animated inputs', async () => {
  const input = await animatedGif();
  const still = await sharp(input).gif().toBuffer();
  expect((await analyze(still)).animation).toBeUndefined();
  const webp = await sharp(input, { animated: true }).webp().toBuffer();
  await expect(analyze(webp)).rejects.toThrow('only GIF animations');
  await expect(analyze(Buffer.from('not a GIF'))).rejects.toThrow('not a readable image');
});
