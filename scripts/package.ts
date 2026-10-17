// After `next build`: copy out/ into dist/{basePath}/ so file paths match public addresses
// (design doc §4.1; out/ has no base-path layer, memo §7.3) and check the artifact's shape.
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../src/config/load';
import { feedIndexFile } from '../src/modules/feed/files';
import { createUrlModule } from '../src/modules/url/create';
import { ROOT } from './lib/paths';

const config = loadConfig(ROOT);
const url = createUrlModule({
  origin: config.origin,
  basePath: config.basePath,
  urlPattern: config.urlPattern,
  localePrefixes: config.locales.map((l) => l.pathPrefix),
});
const outDir = path.join(ROOT, 'out');
const distDir = path.join(ROOT, 'dist');
const target = path.join(distDir, config.basePath);

const errors: string[] = [];
if (!fs.existsSync(outDir)) {
  console.error('out/ is missing: run `next build` first.');
  process.exit(1);
}
if (config.basePath && fs.existsSync(path.join(outDir, config.basePath))) {
  errors.push(`out/ unexpectedly contains ${config.basePath}/; packaging would double the prefix`);
}

// Empty dist/ in place: a running reference nginx bind-mounts it.
fs.mkdirSync(distDir, { recursive: true });
for (const entry of fs.readdirSync(distDir)) fs.rmSync(path.join(distDir, entry), { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
fs.cpSync(outDir, target, { recursive: true });

// List pages beyond a locale's list exist only to satisfy static export (prompts/page/[page]):
// remove them, so the host answers 404 (§9.4).
for (const l of config.builtLocales) {
  const indexFile = path.join(ROOT, 'public/generated', feedIndexFile(l.code));
  if (!fs.existsSync(indexFile)) continue;
  const { pageCount } = JSON.parse(fs.readFileSync(indexFile, 'utf8')) as { pageCount: number };
  const pagesDir = path.join(target, `${url.paths.prompts(l.pathPrefix)}page`);
  if (!fs.existsSync(pagesDir)) continue;
  for (const n of fs.readdirSync(pagesDir))
    if (Number(n) > pageCount) fs.rmSync(path.join(pagesDir, n), { recursive: true });
  if (!fs.readdirSync(pagesDir).length) fs.rmSync(pagesDir, { recursive: true });
}

// Every built locale has its pages, error pages and the shared files exist.
const fileFor = (internal: string) => path.join(target, internal.endsWith('/') ? `${internal}index.html` : internal);
const required = [
  url.paths.languageEntry(),
  '/404.html',
  '/icon.svg',
  url.paths.generated('build.json'),
  ...config.builtLocales.flatMap((l) => [
    url.paths.home(l.pathPrefix),
    url.paths.notFound(l.pathPrefix),
    url.paths.gone(l.pathPrefix),
  ]),
];
for (const internal of required) {
  if (!fs.existsSync(fileFor(internal))) errors.push(`missing ${path.relative(ROOT, fileFor(internal))}`);
}
// Locales that are not built must not leak into the artifact.
for (const l of config.locales.filter((l) => !config.builtLocales.includes(l))) {
  if (fs.existsSync(path.join(target, l.pathPrefix)))
    errors.push(`locale ${l.code} is not built in ${config.buildMode} mode but was exported`);
}

if (errors.length) {
  console.error(`package: ${errors.length} problem(s)\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(
  `package: out/ -> ${path.relative(ROOT, target) || 'dist'}/ (${config.buildMode}, ${config.builtLocales.length} locale(s))`,
);
