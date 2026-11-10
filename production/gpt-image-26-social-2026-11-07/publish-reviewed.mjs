import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareContent, applyPrepared } from '../../scripts/lib/content-production/publish.ts';

const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, '../..');
const jobRoot = path.join(root, '.artifacts/content-production', path.basename(base), 'jobs');
for (const unit of process.argv.slice(2)) {
  if (!/^s\d\d-original$/.test(unit)) throw new Error('Expected a reviewed static unit');
  const key = `gpt26-social-${unit}`;
  const recipe = JSON.parse(fs.readFileSync(path.join(base, 'recipes', `${unit}.json`), 'utf8'));
  // Review hashes and image acceptance are checked by the existing publisher.
  const prepared = await prepareContent(root, jobRoot, key, recipe);
  const ids = await applyPrepared(root, key, prepared.planHash);
  console.log(JSON.stringify({ unit, ...ids }));
}
