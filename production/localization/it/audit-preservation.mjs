import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import YAML from 'yaml';

const baseline = '53cbc8efce854f8f067acef8372daf49be82f9c3';
const rows = execFileSync('git', ['ls-tree', '-r', baseline, '--', 'content', 'public/media'], { encoding: 'utf8', maxBuffer: 10_000_000 }).trim().split('\n');
const withoutItalian = (value) => Array.isArray(value) ? value.map(withoutItalian) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'it').map(([key, v]) => [key, withoutItalian(v)])) : value;
const changes = [];
let unchanged = 0;
let mediaBytes = 0;
for (const row of rows) {
  const [, , , hash, file] = row.match(/^(\d+) (\w+) ([a-f0-9]+)\t(.+)$/);
  const bytes = fs.readFileSync(file);
  const current = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (file.startsWith('public/media/')) mediaBytes += bytes.length;
  if (hash === current) { unchanged++; continue; }
  if (!file.endsWith('.yaml')) throw Error(`Changed immutable source: ${file}`);
  const old = YAML.parse(execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' }));
  const next = YAML.parse(bytes.toString());
  if (file === 'content/locales.yaml') {
    // Registry policy/enablement is intentional; other locale rows must stay exact.
    const omit = (v) => Array.isArray(v) ? v.filter((x) => x.code !== 'it') : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Array.isArray(x) ? x.filter((i) => i.code !== 'it') : x]));
    if (!isDeepStrictEqual(omit(old), omit(next))) throw Error('Unrelated registry change');
  } else if (!isDeepStrictEqual(withoutItalian(old), withoutItalian(next))) throw Error(`Changed non-Italian data: ${file}`);
  changes.push(file);
}
const result = { schemaVersion: 1, baseline, checkedAt: new Date().toISOString(), passed: true, trackedFilesChecked: rows.length, unchangedFiles: unchanged, mediaBytes, changes, method: 'Git blob identity for every tracked content/media file; structural comparison permitting only Italian mapping additions and the Italian locale registry row. Original Prompt/template bodies, values, constraints, source prose and assets stay byte-identical.' };
fs.writeFileSync('production/localization/it/preservation-audit.json', JSON.stringify(result, null, 2) + '\n');
console.log({ passed: result.passed, files: rows.length, italianYamlFiles: changes.length, mediaBytes });
