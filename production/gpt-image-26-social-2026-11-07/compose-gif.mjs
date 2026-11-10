import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

/** Encode generated sequential cells without inventing in-between poses. */
export async function composeGif(sheet, output, settings) {
  const { columns, rows, frameCount, delays, loop } = settings;
  for (const n of [columns, rows, frameCount]) assert(Number.isInteger(n) && n > 0);
  assert(frameCount <= columns * rows);
  assert.equal(delays.length, frameCount);
  assert(delays.every((n) => Number.isInteger(n) && n >= 20 && n % 10 === 0));
  assert(Number.isInteger(loop) && loop >= 0);
  assert(!fs.existsSync(output), 'Preserve existing animations; use a new output path');
  const source = await sharp(sheet).metadata();
  assert.equal(source.pages ?? 1, 1, 'Expected a single generated sprite sheet');
  const inset = settings.cellInset ?? 0;
  assert(Number.isInteger(inset) && inset >= 0);
  const cellWidth = Math.floor(source.width / columns);
  const cellHeight = Math.floor(source.height / rows);
  let width = cellWidth - 2 * inset;
  let height = cellHeight - 2 * inset;
  if (settings.aspect) {
    const [x, y] = settings.aspect;
    assert(Number.isInteger(x) && x > 0 && Number.isInteger(y) && y > 0);
    const unit = Math.floor(Math.min(width / x, height / y));
    width = unit * x;
    height = unit * y;
  }
  const offsetX = Math.floor((cellWidth - width) / 2);
  const offsetY = Math.floor((cellHeight - height) / 2);
  assert(width > 0 && height > 0);
  const frames = [];
  const rectangles = [];
  for (let i = 0; i < frameCount; i++) {
    const rect = {
      left: Math.floor(((i % columns) * source.width) / columns) + offsetX,
      top: Math.floor((Math.floor(i / columns) * source.height) / rows) + offsetY,
      width,
      height,
    };
    rectangles.push(rect);
    frames.push(await sharp(sheet).extract(rect).ensureAlpha().raw().toBuffer());
  }
  const frameHashes = frames.map(hash);
  assert(new Set(frameHashes).size >= 2, 'Repeated static frames cannot pass as an animation');
  const hasTransparency = frames.some((bytes) => bytes.some((value, index) => index % 4 === 3 && value < 128));
  if (settings.requireTransparency) assert(hasTransparency, 'Requested transparent cells have no alpha');
  await sharp(Buffer.concat(frames), { raw: { width, height: height * frameCount, channels: 4, pageHeight: height } })
    .gif({ delay: delays, loop, effort: 7, reuse: false, keepDuplicateFrames: settings.keepDuplicateFrames ?? false })
    .toFile(output);
  const actual = await sharp(output, { animated: true }).metadata();
  assert.equal(actual.pages, frameCount);
  assert.deepEqual(actual.delay, delays);
  assert.equal(actual.loop, loop);
  await sharp(output, { page: 0, pages: 1 })
    .png()
    .toFile(output.replace(/\.gif$/, '-poster.png'));
  const audit = {
    method: 'GPT Image sequential sprite sheet, row-major cell extraction, local GIF encoding',
    sheet: path.resolve(sheet),
    sheetSha256: hash(fs.readFileSync(sheet)),
    output: path.resolve(output),
    outputSha256: hash(fs.readFileSync(output)),
    width,
    height,
    frameCount: actual.pages,
    durationMs: actual.delay.reduce((a, b) => a + b, 0),
    frameDelaysMs: actual.delay,
    loop: actual.loop,
    hasTransparency,
    rectangles,
    frameHashes,
    distinctFrameCount: new Set(frameHashes).size,
    cellInset: inset,
    trimmedRightPixels: source.width - cellWidth * columns,
    trimmedBottomPixels: source.height - cellHeight * rows,
  };
  fs.writeFileSync(output.replace(/\.gif$/, '-encoding.json'), JSON.stringify(audit, null, 2) + '\n');
  return audit;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const policy = JSON.parse(fs.readFileSync(new URL('./generation-policy.json', import.meta.url), 'utf8'));
  assert(policy.allowComposedGifs, 'User requested native GIFs only; composition is disabled for this campaign');
  const [folder, sheet] = process.argv.slice(2);
  const destination = path.join(folder, 'sheet.png');
  fs.copyFileSync(sheet, destination, fs.constants.COPYFILE_EXCL);
  const result = await composeGif(
    destination,
    path.join(folder, 'output.gif'),
    JSON.parse(fs.readFileSync(path.join(folder, 'animation.json'), 'utf8')),
  );
  console.log(
    JSON.stringify({
      output: result.output,
      frames: result.frameCount,
      durationMs: result.durationMs,
      loop: result.loop,
    }),
  );
}
