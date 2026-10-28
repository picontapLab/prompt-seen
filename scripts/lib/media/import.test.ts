import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { expect, it } from 'vitest';
import { importMedia, refreshMedia } from './import';
import { localStorage } from './storage';

it('preserves an alpha mother image and the reviewed lossless configuration through refresh', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'media-import-'));
  try {
    const storage = localStorage(path.join(root, 'public'));
    const dir = path.join(root, 'content');
    const input = await sharp({ create: { width: 1200, height: 1600, channels: 4, background: '#ff223380' } })
      .png()
      .toBuffer();
    const media = await importMedia({
      dir,
      storage,
      input,
      slug: 'transparent-poster',
      metadata: {
        processing: {
          version: 1,
          thumbnail: { quality: 76, lossless: false },
          card: { quality: 82, lossless: true },
          detail: { quality: 92, lossless: false },
          og: { quality: 90 },
        },
      },
    });
    expect(await storage.get(media.original.key)).toEqual(input);
    const before = media.variants.card.key;
    const refreshed = await refreshMedia({ dir, storage, id: media.id });
    expect(refreshed.variants.card.key).toBe(before);
    expect(refreshed.processing?.detail.quality).toBe(92);
    expect((await sharp(await storage.get(refreshed.variants.card.key)).metadata()).hasAlpha).toBe(true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
