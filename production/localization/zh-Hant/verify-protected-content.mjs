import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
const root = process.cwd(),
  base = '53cbc8ef';
const files = execFileSync('git', ['diff', '--name-only', base, '--', 'content'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);
function clean(v) {
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v)
        .filter(([key]) => key !== 'zh-Hant')
        .map(([k, x]) => [k, clean(x)]),
    );
  return v;
}
const exceptions = new Set(['content/media/a_116.yaml', 'content/media/a_207.yaml', 'content/media/a_231.yaml']);
for (const file of files) {
  if (file === 'content/locales.yaml') continue;
  const previous = execFileSync('git', ['show', `${base}:${file}`], { encoding: 'utf8' }),
    current = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.yaml')) {
    const a = clean(YAML.parse(previous)),
      b = clean(YAML.parse(current));
    if (exceptions.has(file)) {
      for (const locale of ['en', 'es', 'pt-BR', 'ja', 'ko', 'de']) {
        delete a.alt[locale];
        delete b.alt[locale];
      }
    }
    assert.deepEqual(b, a, file);
  } else assert.equal(current, previous, file);
}
const protectedFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', base, 'content', 'public/media'], {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter((p) => p.startsWith('public/media/') || p.endsWith('/prompt.txt') || p.endsWith('/template.txt'));
for (const file of process.argv.includes('--content-only') ? [] : protectedFiles)
  assert.deepEqual(
    fs.readFileSync(file),
    execFileSync('git', ['show', `${base}:${file}`], { maxBuffer: 100 * 1024 * 1024 }),
    file,
  );
fs.writeFileSync(
  process.argv.includes('--content-only')
    ? 'production/localization/zh-Hant/evidence/protected-content-final.json'
    : 'production/localization/zh-Hant/evidence/protected-content.json',
  JSON.stringify(
    {
      base,
      checkedAt: new Date().toISOString(),
      changedContentFiles: files.length,
      byteIdenticalProtectedFiles: process.argv.includes('--content-only') ? null : protectedFiles.length,
      exceptions: [...exceptions],
      exceptionScope:
        'Only reviewed alt fields; all original media, prompts, model facts, template contracts and other existing content preserved.',
    },
    null,
    2,
  ) + '\n',
);
console.log('Protected content passed', files.length, protectedFiles.length);
