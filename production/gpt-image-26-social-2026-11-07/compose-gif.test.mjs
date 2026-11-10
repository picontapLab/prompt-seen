import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import sharp from 'sharp';
import { composeGif } from './compose-gif.mjs';

const roots = [];
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));
const workspace = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'social-gif-'));
  roots.push(root);
  return root;
};
async function sheet(root, columns, rows) {
  const width = columns * 40;
  const height = rows * 40;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const cell = Math.floor(y / 40) * columns + Math.floor(x / 40);
      data[index] = cell * 13;
      data[index + 1] = 255 - cell * 13;
      data[index + 2] = cell * 7;
      data[index + 3] = x % 40 < 6 || y % 40 < 6 ? 0 : 255;
    }
  const file = path.join(root, 'sheet.png');
  await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(file);
  return file;
}
test('encodes a ten-frame grid in order, retaining variable delays, alpha and play-once semantics', async () => {
  const root = workspace();
  const input = await sheet(root, 5, 2);
  const output = path.join(root, 'output.gif');
  const delays = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
  const audit = await composeGif(input, output, {
    columns: 5,
    rows: 2,
    frameCount: 10,
    delays,
    loop: 1,
    requireTransparency: true,
  });
  assert.equal(audit.durationMs, 5500);
  assert.equal(audit.distinctFrameCount, 10);
  assert.deepEqual((await sharp(output, { animated: true }).metadata()).delay, delays);
  assert.equal((await sharp(output).metadata()).loop, 1);
  for (let i = 0; i < 10; i++) {
    const pixels = await sharp(output, { page: i, pages: 1 }).ensureAlpha().raw().toBuffer();
    assert.equal(pixels[3], 0);
    assert.equal(pixels[(20 * 40 + 20) * 4], i * 13);
  }
  assert.deepEqual(
    await sharp(path.join(root, 'output-poster.png')).raw().toBuffer(),
    await sharp(output).raw().toBuffer(),
  );
  await assert.rejects(
    composeGif(input, output, { columns: 5, rows: 2, frameCount: 10, delays, loop: 1 }),
    /Preserve existing/,
  );
});
test('extracts only selected cells and centers exact aspect crops inside the inset', async () => {
  const root = workspace();
  const input = await sheet(root, 4, 3);
  const audit = await composeGif(input, path.join(root, 'crop.gif'), {
    columns: 4,
    rows: 3,
    frameCount: 8,
    delays: Array(8).fill(250),
    loop: 0,
    cellInset: 2,
    aspect: [3, 4],
  });
  assert.equal(audit.frameCount, 8);
  assert.equal(audit.width, 27);
  assert.equal(audit.height, 36);
  assert.deepEqual(audit.rectangles[4], { left: 6, top: 42, width: 27, height: 36 });
  const pixel = await sharp(path.join(root, 'crop.gif'), { page: 4, pages: 1 }).ensureAlpha().raw().toBuffer();
  assert.equal(pixel[(18 * 27 + 13) * 4], 52);
});
test('rejects unrepresentable timing, invalid grids, absent transparency and repeated static cells', async () => {
  const root = workspace();
  const input = await sheet(root, 2, 1);
  const settings = { columns: 2, rows: 1, frameCount: 2, delays: [100, 100], loop: 0 };
  for (const invalid of [
    { frameCount: 3 },
    { delays: [15, 100] },
    { delays: [100] },
    { rows: 0 },
    { aspect: [0, 4] },
  ]) {
    await assert.rejects(composeGif(input, path.join(root, 'bad.gif'), { ...settings, ...invalid }));
  }
  const opaque = path.join(root, 'opaque.png');
  await sharp(input).flatten({ background: 'white' }).png().toFile(opaque);
  await assert.rejects(
    composeGif(opaque, path.join(root, 'alpha.gif'), { ...settings, requireTransparency: true }),
    /no alpha/,
  );
  const still = path.join(root, 'still.png');
  await sharp({ create: { width: 80, height: 40, channels: 4, background: 'red' } })
    .png()
    .toFile(still);
  await assert.rejects(composeGif(still, path.join(root, 'static.gif'), settings), /Repeated static frames/);
});

test('retains a split held pose as nine encoded frames without changing pixels or timing', async () => {
  const root = workspace();
  const source = await sheet(root, 4, 2);
  const cells = [];
  for (const index of [0, 0, 1, 2, 3, 4, 5, 6, 7]) {
    cells.push(
      await sharp(source)
        .extract({ left: (index % 4) * 40, top: Math.floor(index / 4) * 40, width: 40, height: 40 })
        .png()
        .toBuffer(),
    );
  }
  const input = path.join(root, 'nine.png');
  await sharp({ create: { width: 120, height: 120, channels: 4, background: '#00000000' } })
    .composite(cells.map((input, i) => ({ input, left: (i % 3) * 40, top: Math.floor(i / 3) * 40 })))
    .png()
    .toFile(input);
  const output = path.join(root, 'nine.gif');
  const result = await composeGif(input, output, {
    columns: 3,
    rows: 3,
    frameCount: 9,
    delays: [120, 130, ...Array(7).fill(250)],
    loop: 1,
    keepDuplicateFrames: true,
    requireTransparency: true,
  });
  assert.equal(result.frameCount, 9);
  assert.equal(result.distinctFrameCount, 8);
  assert.equal(result.durationMs, 2000);
  assert.deepEqual(
    await sharp(output, { page: 0, pages: 1 }).raw().toBuffer(),
    await sharp(output, { page: 1, pages: 1 }).raw().toBuffer(),
  );
});
