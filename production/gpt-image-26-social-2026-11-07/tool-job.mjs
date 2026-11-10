// Record actual built-in tool calls. No provider call, automatic retry, or invented receipt.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { planJob, claimJob, recordJob, reviewJob } from '../../scripts/lib/content-production/production.ts';

const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, '../..');
const jobRoot = path.join(root, '.artifacts/content-production', path.basename(base), 'jobs');
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const [command, relative, source, decision, notes] = process.argv.slice(2);
const folder = path.resolve(base, relative);
if (!folder.startsWith(base + path.sep)) throw new Error('Job must belong to this campaign');
const definition = JSON.parse(fs.readFileSync(path.join(folder, 'definition.json'), 'utf8'));
if (command === 'claim') {
  planJob(jobRoot, definition);
  const claim = claimJob(jobRoot, definition.key);
  write(path.join(folder, 'claim.json'), claim);
  console.log(JSON.stringify(claim));
} else if (command === 'record') {
  if (!['accepted', 'rejected'].includes(decision) || !notes) throw new Error('Explicit pixel review required');
  const output = path.join(folder, `output${path.extname(source)}`);
  fs.copyFileSync(source, output, fs.constants.COPYFILE_EXCL);
  const metadata = await sharp(output, { animated: true }).metadata();
  const receipt = { outputPath: output, provider: 'OpenAI', model: 'GPT Image' };
  recordJob(jobRoot, definition.key, receipt);
  const review = { accepted: decision === 'accepted', notes, reviewer: 'Codex' };
  const state = reviewJob(jobRoot, definition.key, review);
  write(path.join(folder, 'receipt.json'), receipt);
  write(path.join(folder, 'review.json'), review);
  write(path.join(folder, 'audit.json'), {
    tool: 'image_gen.imagegen',
    sourcePath: source,
    outputPath: path.relative(root, output),
    outputSha256: hash(fs.readFileSync(output)),
    promptSha256: hash(definition.prompt),
    references: state.references,
    provider: 'OpenAI',
    modelFamily: 'GPT Image',
    providerModelId: null,
    format: metadata.format,
    width: metadata.width,
    height: metadata.pageHeight ?? metadata.height,
    frames: metadata.pages ?? 1,
    delays: metadata.delay ?? null,
    loop: metadata.loop ?? null,
    review: state.review,
  });
  write(path.join(folder, 'state.json'), state);
  console.log(JSON.stringify({ key: definition.key, status: state.status, output, frames: metadata.pages ?? 1 }));
} else {
  throw new Error('Use claim <folder> or record <folder> <actual output> accepted|rejected <review notes>');
}
