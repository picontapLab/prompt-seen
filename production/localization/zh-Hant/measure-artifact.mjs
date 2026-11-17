import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const label = process.argv[2];
if (!label || !/^[a-z0-9-]+$/.test(label)) throw new Error('Provide evidence label');
const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else files.push(f);
  }
}
walk('dist');
const buildFile = files.find((f) => f.endsWith('/generated/build.json'));
const build = JSON.parse(fs.readFileSync(buildFile));
const indexes = files
  .filter((f) => f.endsWith('/search/index.json'))
  .map((file) => {
    const bytes = fs.readFileSync(file);
    return { file, bytes: bytes.length, gzipBytes: zlib.gzipSync(bytes).length };
  });
const html = files.filter((f) => f.endsWith('.html'));
fs.writeFileSync(
  `production/localization/zh-Hant/evidence/artifact-${label}.json`,
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      build,
      fileCount: files.length,
      htmlFiles: html.length,
      htmlBytes: html.reduce((sum, f) => sum + fs.statSync(f).size, 0),
      indexes,
    },
    null,
    2,
  ) + '\n',
);
