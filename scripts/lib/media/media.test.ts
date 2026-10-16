import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { analyze, ImportError, ogCrop, originalKey, renderVariants, variantKey } from './process';
import { localStorage } from './storage';
import { buildXmp } from './xmp';

// media:import building blocks (design doc §5.4, §9.7, §10.1, §10.2).

const credit = {
  creator: 'Jane <Doe>',
  creditText: 'Prompt Seen',
  copyrightNotice: '© 2026 Jane Doe',
  sourceUrl: null,
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  acquireLicenseUrl: 'https://example.com/license/',
};
const provenance = { digitalSourceType: 'trainedAlgorithmicMedia' as const, contentCredentials: 'unknown' as const };

/** A 1600 × 2000 test image with a red disc near the top right. */
const image = () =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2000"><rect width="1600" height="2000" fill="#3a4a5a"/><circle cx="1200" cy="400" r="160" fill="#e03020"/></svg>`,
    ),
  )
    .png()
    .toBuffer();

describe('analyze', () => {
  it('reads size, hash, placeholder colour and a focal point near the subject', async () => {
    const a = await analyze(await image());
    expect(a).toMatchObject({ format: 'png', mimeType: 'image/png', extension: 'png', width: 1600, height: 2000 });
    // The dominant colour comes from a binned histogram, so it is close to the background, not exact.
    const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    channels(a.placeholder).forEach((c, i) => expect(Math.abs(c - channels('#3A4A5A')[i]!)).toBeLessThan(12));
    expect(a.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(a.focalPoint.x).toBeGreaterThan(0.6);
    expect(a.focalPoint.y).toBeLessThan(0.35);
  });

  it('rejects other formats and tiny images', async () => {
    const gif = await sharp({ create: { width: 400, height: 400, channels: 3, background: '#fff' } })
      .gif()
      .toBuffer();
    await expect(analyze(gif)).rejects.toBeInstanceOf(ImportError);
    const tiny = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
    await expect(analyze(tiny)).rejects.toThrow(/too small/);
  });
});

describe('renderVariants', () => {
  it('keeps the ratio, never enlarges, crops only og and embeds IPTC in detail and og', async () => {
    const input = await image();
    const variants = await renderVariants(
      input,
      { width: 1600, height: 2000 },
      { focalPoint: { x: 0.75, y: 0.2 }, credit, provenance },
    );
    const size = Object.fromEntries(variants.map((v) => [v.name, [v.width, v.height]]));
    expect(size).toEqual({ thumbnail: [384, 480], card: [768, 960], detail: [1280, 1600], og: [1200, 630] });
    const meta = await sharp(variants.find((v) => v.name === 'detail')!.bytes).metadata();
    expect(meta.xmp?.toString()).toContain('trainedAlgorithmicMedia');
    expect((await sharp(variants.find((v) => v.name === 'thumbnail')!.bytes).metadata()).xmp).toBeUndefined();
  });

  it('crops og around the focal point, inside the image', () => {
    expect(ogCrop(1600, 2000, { x: 0.75, y: 0.2 })).toEqual({ left: 0, top: 0, width: 1600, height: 840 });
    expect(ogCrop(1600, 2000, { x: 0.5, y: 0.9 })).toEqual({ left: 0, top: 1160, width: 1600, height: 840 });
    expect(ogCrop(3000, 1000, { x: 0.9, y: 0.5 })).toEqual({ left: 1095, top: 0, width: 1905, height: 1000 });
  });

  it('names keys after the ID, the slug, the variant and the stored bytes', async () => {
    const [thumb] = await renderVariants(
      await image(),
      { width: 1600, height: 2000 },
      { focalPoint: { x: 0.5, y: 0.5 }, credit, provenance },
    );
    expect(variantKey('a_012', 'ink-portrait', thumb!)).toMatch(
      /^media\/a_012\/ink-portrait-thumbnail-[0-9a-f]{12}\.webp$/,
    );
    expect(originalKey('a_012', 'ink-portrait', `sha256:${'ab'.repeat(32)}`, 'png')).toBe(
      'media/a_012/ink-portrait-original-abababababab.png',
    );
  });
});

describe('buildXmp', () => {
  it('writes the IPTC fields that are known and escapes text', () => {
    const xmp = buildXmp(credit, provenance);
    expect(xmp).toContain('<dc:creator><rdf:Seq><rdf:li>Jane &lt;Doe&gt;</rdf:li></rdf:Seq></dc:creator>');
    expect(xmp).toContain('<photoshop:Credit>Prompt Seen</photoshop:Credit>');
    expect(xmp).toContain(
      '<xmpRights:WebStatement>https://creativecommons.org/licenses/by/4.0/</xmpRights:WebStatement>',
    );
    expect(xmp).toContain('<plus:LicensorURL>https://example.com/license/</plus:LicensorURL>');
    expect(xmp).toContain('digitalsourcetype/trainedAlgorithmicMedia');
    const bare = buildXmp(
      { ...credit, creator: null, copyrightNotice: null, licenseUrl: null, acquireLicenseUrl: null, creditText: null },
      provenance,
    );
    expect(bare).not.toContain('dc:creator');
    expect(bare).not.toContain('plus:Licensor>');
  });
});

describe('local storage driver', () => {
  it('never overwrites a key with different bytes', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-seen-media-'));
    const storage = localStorage(root);
    await storage.put('media/a_001/x.webp', Buffer.from('one'), 'image/webp');
    await storage.put('media/a_001/x.webp', Buffer.from('one'), 'image/webp');
    await expect(storage.put('media/a_001/x.webp', Buffer.from('two'), 'image/webp')).rejects.toThrow(/never reused/);
    await expect(storage.put('../escape.webp', Buffer.from('x'), 'image/webp')).rejects.toThrow(/escapes/);
    expect(await storage.has('media/a_001/x.webp')).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
