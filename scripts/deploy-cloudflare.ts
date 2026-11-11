// Assembles .deploy/cloudflare/ for `wrangler pages deploy`: the packaged dist/ plus the
// generated _headers and _redirects, and 404 pages where Pages looks for them. Pages serves
// the nearest 404.html up the path, and without a top-level one it falls back to SPA mode
// (index.html with 200), which must never happen.
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../src/config/load';
import { runProductionDeployHook } from './lib/deploy-hook';
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

console.log(`deploy:cloudflare: ${path.relative(ROOT, target)}/ ready (${config.buildMode}, build ${config.buildId})`);
