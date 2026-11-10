// Reuse reviewed GPT Image pixels; this is local composition, not a new provider call.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { composeGif } from './compose-gif.mjs';
import { planJob, claimJob } from '../../scripts/lib/content-production/production.ts';
const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, '../..');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n');
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
assert(read(path.join(base, 'generation-policy.json')).allowComposedGifs);
const originalCatalog = path.join(base, 'audit/nine-frame-source-catalog.json');
if (!fs.existsSync(originalCatalog)) fs.copyFileSync(path.join(base, 'adaptations/catalog.json'), originalCatalog);
const catalog = read(originalCatalog);
const next = [];
for (const item of catalog) {
  if (item.sourceCase === 'W01') {
    next.push(item);
    continue;
  }
  const source = path.join(base, item.folder);
  const folderRel = item.folder + '-9f-v3';
  const folder = path.join(base, folderRel);
  next.push({ ...item, folder: folderRel });
  if (fs.existsSync(path.join(folder, 'output-encoding.json'))) continue;
  fs.mkdirSync(folder, { recursive: true });
  const old = read(path.join(source, 'output-encoding.json'));
  const sourceSheet = fs.readFileSync(path.join(source, 'sheet.png'));
  assert.equal(hash(sourceSheet), old.sheetSha256);
  const frames = [];
  for (const [i, rect] of old.rectangles.entries()) {
    const pixels = await sharp(sourceSheet).extract(rect).ensureAlpha().raw().toBuffer();
    assert.equal(hash(pixels), old.frameHashes[i]);
    frames.push(pixels);
  }
  const sequence = [];
  if (frames.length >= 9) {
    for (let i = 0; i < 9; i++) sequence.push({ from: Math.round((i * (frames.length - 1)) / 8) });
  } else {
    assert.equal(frames.length, 8);
    // Split the longest held pose into two encoded frames; preserve pixels and total timing.
    const hold = old.frameDelaysMs.indexOf(Math.max(...old.frameDelaysMs));
    for (let i = 0; i < 8; i++) {
      sequence.push({ from: i });
      if (i === hold) sequence.push({ from: i, holdFraction: 0.5 });
    }
  }
  const scale = Math.max(1, 320 / old.width, 200 / old.height);
  const width = Math.ceil(old.width * scale),
    height = Math.ceil(old.height * scale);
  const tiles = [];
  for (const [i, step] of sequence.entries()) {
    const pixels = Buffer.from(frames[step.from]);
    const input = await sharp(pixels, { raw: { width: old.width, height: old.height, channels: 4 } })
      .resize(width, height)
      .png()
      .toBuffer();
    tiles.push({ input, left: (i % 3) * width, top: Math.floor(i / 3) * height });
  }
  await sharp({ create: { width: width * 3, height: height * 3, channels: 4, background: '#00000000' } })
    .composite(tiles)
    .png()
    .toFile(path.join(folder, 'sheet.png'));
  // Keep original timing of retained poses by mapping timeline boundaries to source frame starts.
  const starts = old.frameDelaysMs.map((_, i) => old.frameDelaysMs.slice(0, i).reduce((a, b) => a + b, 0));
  const boundaries = sequence.map((s) => starts[s.from] + (s.holdFraction ? old.frameDelaysMs[s.from] / 2 : 0));
  boundaries.push(old.durationMs);
  const rounded = boundaries.map((t) => Math.round(t / 10) * 10);
  const delays = sequence.map((_, i) => rounded[i + 1] - rounded[i]);
  const settings = {
    columns: 3,
    rows: 3,
    frameCount: 9,
    delays,
    loop: old.loop,
    requireTransparency: old.hasTransparency,
    keepDuplicateFrames: true,
  };
  write(path.join(folder, 'animation.json'), settings);
  await composeGif(path.join(folder, 'sheet.png'), path.join(folder, 'output.gif'), settings);
  const definition = {
    ...read(path.join(source, 'definition.json')),
    candidateId: read(path.join(source, 'definition.json')).candidateId + '-9f',
    key: read(path.join(source, 'definition.json')).key.replace('-v1', '-9f-v3'),
  };
  write(path.join(folder, 'definition.json'), definition);
  fs.writeFileSync(path.join(folder, 'prompt.txt'), definition.prompt);
  const jobs = path.join(root, '.artifacts/content-production', path.basename(base), 'jobs');
  planJob(jobs, definition);
  write(path.join(folder, 'claim.json'), claimJob(jobs, definition.key));
  write(path.join(folder, 'composition.json'), {
    method: 'Nine-frame local adaptation of previously generated and reviewed source cells; no new image tool call',
    sourceFolder: item.folder,
    sourceSheetSha256: old.sheetSha256,
    sourceFrameCount: frames.length,
    sourceSize: [old.width, old.height],
    outputSize: [width, height],
    scale,
    sequence,
    sourceReview: read(path.join(source, 'review.json')),
    sourceClaim: read(path.join(source, 'claim.json')),
  });
  console.log(
    JSON.stringify({
      unit: item.unitId,
      frames: 9,
      sourceFrames: frames.length,
      heldPoseSplit: sequence.some((s) => s.holdFraction),
      scale,
    }),
  );
}
write(path.join(base, 'adaptations/catalog.json'), next);
