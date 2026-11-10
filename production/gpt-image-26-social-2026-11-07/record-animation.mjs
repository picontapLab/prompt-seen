import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordJob, reviewJob } from '../../scripts/lib/content-production/production.ts';

const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, '../..');
const policy = JSON.parse(fs.readFileSync(path.join(base, 'generation-policy.json'), 'utf8'));
if (!policy.allowComposedGifs)
  throw new Error('User requested native GIFs only; composed animation recording is disabled');
const [relative, notes] = process.argv.slice(2);
if (!notes) throw Error('Explicit review of frames and sequence required');
const folder = path.resolve(base, relative);
if (!folder.startsWith(base + path.sep)) throw Error('Expected this campaign');
const read = (name) => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
const definition = read('definition.json');
const encoding = read('output-encoding.json');
const jobs = path.join(root, '.artifacts/content-production', path.basename(base), 'jobs');
const receipt = {
  outputPath: path.join(folder, 'output.gif'),
  provider: 'OpenAI + local GIF encoding',
  model: 'GPT Image',
};
recordJob(jobs, definition.key, receipt);
const state = reviewJob(jobs, definition.key, { accepted: true, reviewer: 'Codex', notes });
for (const [name, value] of Object.entries({
  'receipt.json': receipt,
  'state.json': state,
  'review.json': state.review,
  'audit.json': {
    tool: 'image_gen.imagegen',
    provenance: 'independent-adaptation',
    actualToolOutput: fs.existsSync(path.join(folder, 'composition.json'))
      ? read('composition.json').sourceFolder + '/sheet.png'
      : 'sheet.png',
    localComposition: fs.existsSync(path.join(folder, 'composition.json')) ? read('composition.json') : null,
    newImageToolCall: !fs.existsSync(path.join(folder, 'composition.json')),
    modelFamily: 'GPT Image',
    providerModelId: null,
    transparentBackground: !!read('animation.json').requireTransparency,
    encoding,
    references: state.references,
    review: state.review,
  },
}))
  fs.writeFileSync(path.join(folder, name), JSON.stringify(value, null, 2) + '\n');
console.log(JSON.stringify({ key: definition.key, status: state.status }));
