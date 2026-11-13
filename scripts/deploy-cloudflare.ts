// Assembles .deploy/cloudflare/ for `wrangler pages deploy`: the packaged dist/ plus the
// generated _headers and _redirects, and 404 pages where Pages looks for them. Pages serves
// the nearest 404.html up the path, and without a top-level one it falls back to SPA mode
// (index.html with 200), which must never happen.
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../src/config/load';
import { createUrlModule, urlConfigOf } from '../src/modules/url/create';
import { runProductionDeployHook } from './lib/deploy-hook';
import {
  CLOUDFLARE_SHARED_LAYOUT_PAYLOAD,
  CLOUDFLARE_SHARED_RSC_KINDS,
  cloudflarePayloadProxies,
  cloudflareSharedPayloadProxies,
} from './lib/hosts';
import { OUTPUT_DIRS, ROOT } from './lib/paths';

const config = loadConfig(ROOT);
const dist = path.join(ROOT, 'dist');
const site = path.join(dist, config.basePath);
const target = path.join(ROOT, '.deploy/cloudflare');

if (!fs.existsSync(path.join(site, '404.html'))) {
  console.error('dist/ is missing or incomplete: run `npm run build` first.');
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(dist, target, { recursive: true });
for (const file of ['_headers', '_redirects']) {
  fs.copyFileSync(path.join(OUTPUT_DIRS.deploy, 'cloudflare', file), path.join(target, file));
}

const targetSite = path.join(target, config.basePath);
if (config.basePath) fs.copyFileSync(path.join(site, '404.html'), path.join(target, '404.html'));
for (const l of config.builtLocales) {
  // /{locale}/404/index.html -> /{locale}/404.html, the place Pages checks for /{locale}/…
  fs.copyFileSync(
    path.join(targetSite, l.pathPrefix, '404/index.html'),
    path.join(targetSite, l.pathPrefix, '404.html'),
  );
}

if (runProductionDeployHook({ root: ROOT, artifactDir: target, buildMode: config.buildMode })) {
  console.log('deploy:cloudflare: private production customization applied');
}

// The export includes a byte-identical full RSC copy beside each index.txt. Verify the
// customized artifact and its proxy rules before removing copies to fit Pages' file limit.
const url = createUrlModule(urlConfigOf(config));
const proxyRules = [...cloudflarePayloadProxies(url), ...cloudflareSharedPayloadProxies(url)];
const preparedRules = fs
  .readFileSync(path.join(target, '_redirects'), 'utf8')
  .split('\n')
  .map((line) => line.trim().replace(/\s+/g, ' '));
if (!proxyRules.every((rule) => preparedRules.includes(rule))) {
  throw new Error('cloudflare: required full RSC proxy rules are missing; rebuild and check the private hook');
}
const files = fs.readdirSync(targetSite, { recursive: true, encoding: 'utf8' });
const fullPayloads = files
  .filter((file) => path.basename(file) === '__next._full.txt')
  .map((file) => path.join(targetSite, file));
for (const file of fullPayloads) {
  const canonical = path.join(path.dirname(file), 'index.txt');
  if (
    !fs.lstatSync(file).isFile() ||
    !fs.existsSync(canonical) ||
    !fs.lstatSync(canonical).isFile() ||
    !fs.readFileSync(file).equals(fs.readFileSync(canonical))
  ) {
    throw new Error(`cloudflare: full RSC payload differs from index.txt: ${path.relative(target, file)}`);
  }
}
const sharedPayloadGroups = CLOUDFLARE_SHARED_RSC_KINDS.flatMap((kind) => {
  const kindFiles = files.filter((file) => {
    const parts = file.split(path.sep);
    return parts.length === 4 && parts[1] === kind;
  });
  return [
    {
      canonical: path.join(targetSite, 'generated/rsc', `${kind}-index.txt`),
      copies: kindFiles.filter((file) => path.basename(file) === '__next._index.txt'),
    },
    ...config.builtLocales.map((locale) => ({
      canonical: path.join(targetSite, 'generated/rsc', locale.pathPrefix, `${kind}-layout.txt`),
      copies: kindFiles.filter(
        (file) =>
          file.split(path.sep)[0] === locale.pathPrefix && path.basename(file) === CLOUDFLARE_SHARED_LAYOUT_PAYLOAD,
      ),
    })),
  ];
});
const sharedPayloads = sharedPayloadGroups.map((group) => {
  const copies = group.copies.map((file) => path.join(targetSite, file));
  const contents = copies.length ? fs.readFileSync(copies[0]!) : null;
  for (const file of copies) {
    if (!fs.lstatSync(file).isFile() || !fs.readFileSync(file).equals(contents!)) {
      throw new Error(`cloudflare: shared RSC payload differs: ${path.relative(target, file)}`);
    }
  }
  return { canonical: group.canonical, copies, contents };
});
for (const file of fullPayloads) fs.unlinkSync(file);
for (const { canonical, copies, contents } of sharedPayloads) {
  if (!contents) continue;
  fs.mkdirSync(path.dirname(canonical), { recursive: true });
  fs.writeFileSync(canonical, contents);
  for (const file of copies) fs.unlinkSync(file);
}
console.log(`deploy:cloudflare: reused ${fullPayloads.length} identical full RSC payloads through proxy rules`);
console.log(
  `deploy:cloudflare: shared ${sharedPayloads.reduce((count, group) => count + group.copies.length, 0)} detail segment payloads`,
);

const uploadFiles = fs.readdirSync(target, { recursive: true, withFileTypes: true }).filter((file) => file.isFile());
if (uploadFiles.length > 20_000) {
  throw new Error(`cloudflare: ${uploadFiles.length} files exceed the Pages limit of 20000`);
}

console.log(`deploy:cloudflare: ${path.relative(ROOT, target)}/ ready (${config.buildMode}, build ${config.buildId})`);
