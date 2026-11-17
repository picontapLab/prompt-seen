// Run against the reference nginx after building; captures actual bytes and requests.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from '@playwright/test';

const root = path.resolve(new URL('../../..', import.meta.url).pathname);
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const artifactFiles = files(path.join(root, 'dist'));
const buildFile = artifactFiles.find((f) => f.endsWith('/generated/build.json'));
const build = JSON.parse(fs.readFileSync(buildFile, 'utf8'));
const artifactRoot = path.dirname(path.dirname(buildFile));
const searchFile = path.join(artifactRoot, 'generated/it/search/index.json');
const searchBytes = fs.existsSync(searchFile) ? fs.readFileSync(searchFile) : null;
const report = {
  schemaVersion: 1, measuredAt: new Date().toISOString(), build,
  files: artifactFiles.length,
  totalBytes: artifactFiles.reduce((n, f) => n + fs.statSync(f).size, 0),
  htmlBytes: artifactFiles.filter((f) => f.endsWith('.html')).reduce((n, f) => n + fs.statSync(f).size, 0),
  italianSearch: searchBytes ? { rawBytes: searchBytes.length, gzipBytes: zlib.gzipSync(searchBytes, { level: 6 }).length,
    schemaVersion: JSON.parse(searchBytes).schemaVersion, analyzerVersion: JSON.parse(searchBytes).analyzerVersion } : null,
  pages: [],
};
const browser = await chromium.launch();
try {
  for (const locale of ['en', 'it'].filter((l) => build.locales.some((v) => v.code === l))) {
    const template = files(path.join(artifactRoot, locale, 'templates')).find((f) => f.endsWith('/index.html') &&
      !f.endsWith('/templates/index.html') && !f.includes('/page/'));
    const paths = [locale === 'en' ? '/' : '/it/', `/${locale}/prompts/`, `/${path.relative(artifactRoot, template).replace(/index\.html$/, '')}`];
    for (const pagePath of paths) {
      for (const noPrefetch of [true, false]) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();
        if (noPrefetch) await page.route(/\.txt(\?|$)/, (route) => route.abort());
        const requests = [];
        const bodies = new Map();
        const pending = [];
        page.on('request', (request) => requests.push(request.url()));
        page.on('response', (response) => {
          const kind = response.request().resourceType();
          if (kind !== 'script' && kind !== 'font') return;
          pending.push(response.body().then((body) => bodies.set(response.url(), {
            kind, bytes: body.length, gzipBytes: zlib.gzipSync(body, { level: 6 }).length,
          })).catch(() => {}));
        });
        const response = await page.goto(`http://127.0.0.1:${process.env.PORT ?? 8197}${build.basePath}${pagePath}`, { waitUntil: 'networkidle' });
        if (response.status() !== 200) throw Error(`HTTP ${response.status()}: ${pagePath}`);
        const html = await response.text();
        await page.waitForTimeout(6000);
        await page.waitForLoadState('networkidle');
        await Promise.all(pending);
        const referenced = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => new URL(m[1], response.url()).href);
        const unexpectedRequests = requests.filter((u) => /\/generated\/[^/]+\/search\/index\.json|\/production\/localization\//.test(u));
        if (unexpectedRequests.length) throw Error(`Unsolicited search/review request: ${unexpectedRequests}`);
        report.pages.push({ path: pagePath, noPrefetch,
          firstLoadJsGzipBytes: referenced.reduce((n, url) => n + (bodies.get(url)?.gzipBytes ?? 0), 0),
          idleJsGzipBytes: [...bodies.values()].filter((v) => v.kind === 'script').reduce((n, v) => n + v.gzipBytes, 0),
          fonts: [...bodies].filter(([, v]) => v.kind === 'font').map(([url, v]) => ({ path: new URL(url).pathname, ...v })),
          unsolicitedSearchOrReviewRequests: unexpectedRequests,
        });
        await context.close();
      }
    }
  }
} finally { await browser.close(); }
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
