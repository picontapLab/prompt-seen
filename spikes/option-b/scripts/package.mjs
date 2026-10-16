// After `next build`: report the shape of out/, repackage it into dist/<basePath>/,
// and check redirect targets + machine-readable files (memo §3.3, §3.4).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { BASE_PATH } from '../src/lib/site.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'out');
const distDir = path.join(root, 'dist');
const target = path.join(distDir, BASE_PATH);

const report = {
  outTopLevel: fs.readdirSync(outDir).sort(),
  outHasBasePathDir: BASE_PATH ? fs.existsSync(path.join(outDir, BASE_PATH)) : null,
};

// Keep dist/ itself: a running nginx container bind-mounts it.
fs.mkdirSync(distDir, { recursive: true });
for (const entry of fs.readdirSync(distDir)) fs.rmSync(path.join(distDir, entry), { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(outDir, target, { recursive: true });

const kind = (p) => {
  const f = path.join(target, p);
  if (!fs.existsSync(f)) return 'missing';
  return fs.statSync(f).isDirectory() ? 'directory' : 'file';
};
report.machineReadable = Object.fromEntries(
  ['sitemap.xml', 'robots.txt', 'llms.txt', 'en/prompts/neon-alley/index.md', 'zh-hans/prompts/neon-alley/index.md'].map(
    (p) => [p, kind(p)],
  ),
);

const errors = [];
for (const r of YAML.parse(fs.readFileSync(path.join(root, 'content/redirects.yaml'), 'utf8'))) {
  if (kind(path.join(r.to, 'index.html')) !== 'file') errors.push(`redirect target missing: ${r.to}`);
}
for (const [p, k] of Object.entries(report.machineReadable)) if (k !== 'file') errors.push(`${p} is ${k}`);

console.log(JSON.stringify(report, null, 2));
console.log(`packaged out/ -> ${path.relative(root, target)}/`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
