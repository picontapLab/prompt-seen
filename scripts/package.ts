// After `next build`: copy out/ into dist/{basePath}/ so file paths match public addresses
// (design doc §4.1; out/ has no base-path layer, memo §7.3) and check the artifact's shape.
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../src/config/load';
import type { ContentManifest } from '../src/modules/content/types';
import { feedIndexFile } from '../src/modules/feed/files';
import { NO_MARKDOWN } from '../src/modules/geo/documents';
import { createUrlModule, urlConfigOf, EMPTY_PARAM } from '../src/modules/url/create';
import { keyFilePath, readIndexNowKey } from './lib/indexnow';
import { ROOT } from './lib/paths';

const config = loadConfig(ROOT);
const url = createUrlModule(urlConfigOf(config));
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

// A build without published prompts or templates exports a placeholder index.md for that kind
// (static export rejects routes without params); it must not be served (§9.10.4).
for (const l of config.builtLocales)
  for (const kind of ['prompts', 'templates'])
    fs.rmSync(path.join(target, l.pathPrefix, kind, NO_MARKDOWN), { recursive: true, force: true });

// Placeholder pages of locales with no topics, collections or content pages (EMPTY_PARAM): static
// export needs one param per route; the address must answer 404.
for (const l of config.builtLocales)
  for (const segment of ['categories', 'styles', 'use-cases', 'collections', ''])
    fs.rmSync(path.join(target, l.pathPrefix, segment, EMPTY_PARAM), { recursive: true, force: true });

// With a CDN (media.baseUrl), pages load images from there (§10.1); the local driver's copies in
// public/media/ would only be a second, unused address for every image.
if (config.media.baseUrl) fs.rmSync(path.join(target, 'media'), { recursive: true, force: true });

// IndexNow key file at the base path (§9.9): it vouches for this site's addresses only.
let indexNowKey: string | null = null;
try {
  indexNowKey = readIndexNowKey(process.env);
} catch (error) {
  errors.push((error as Error).message);
}
if (indexNowKey) fs.writeFileSync(path.join(target, keyFilePath(indexNowKey)), indexNowKey);

// Every built locale has its pages, error pages and the shared files exist.
const fileFor = (internal: string) => path.join(target, internal.endsWith('/') ? `${internal}index.html` : internal);
const required = [
  url.paths.siteRoot(),
  '/404.html',
  '/icon.svg',
  url.paths.generated('build.json'),
  ...config.builtLocales.flatMap((l) => [
    url.paths.home(l.pathPrefix),
    `/${l.pathPrefix}/`, // backward-compatible prefixed home, including the default locale
    url.paths.notFound(l.pathPrefix),
    url.paths.gone(l.pathPrefix),
  ]),
];
for (const internal of required) {
  if (!fs.existsSync(fileFor(internal))) errors.push(`missing ${path.relative(ROOT, fileFor(internal))}`);
}
// Address changes (§9.5): every redirect lands on a page of this build, and no old or removed
// address is still a file, which a host serving files before its rules would answer with 200.
const manifestFile = path.join(ROOT, '.generated/content/manifest.json');
if (fs.existsSync(manifestFile)) {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as ContentManifest;
  for (const r of manifest.redirects) {
    if (!fs.existsSync(fileFor(r.to))) errors.push(`redirect ${r.from} -> ${r.to}: the target is not in the build`);
    if (fs.existsSync(fileFor(r.from))) errors.push(`redirect ${r.from}: a page still exists at the old address`);
  }
  for (const g of manifest.gone)
    if (fs.existsSync(fileFor(g.path))) errors.push(`gone ${g.path}: a page still exists at the removed address`);
} else errors.push('missing .generated/content/manifest.json: run `npm run content:build`');

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
