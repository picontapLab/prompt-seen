import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { robotsTxt } from '../src/modules/geo/robots';
import { loadConfig } from '../src/config/load';
import { ROOT } from './lib/paths';

const execute = promisify(execFile);

// Exercise the deployed HTTP contract through the CLI, independently of local content.
async function check(
  options: {
    basePath?: string;
    listed?: boolean;
    noindex?: boolean;
    complete?: boolean;
    platformHeader?: boolean;
    platform?: boolean;
    releaseRecord?: string;
    expectedBuild?: string;
  } = {},
) {
  const base = options.basePath ?? '';
  let origin = '';
  const address = (internal: string) => `${origin}${base}${internal}`;
  const server = createServer((req, res) => {
    const route = new URL(req.url!, origin).pathname.slice(base.length);
    res.setHeader('content-type', 'text/html');
    if (options.platformHeader) res.setHeader('x-robots-tag', 'noindex');
    if (route === '/generated/build.json') {
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          buildId: 'live-fixture',
          buildMode: 'production',
          origin,
          basePath: base,
          urlPattern: '{basePath}/{locale}/{path}',
          defaultLocale: 'zz',
          locales: [
            { code: 'zz', pathPrefix: 'zz', enabled: true, localization: { coverage: 'incremental' } },
            {
              code: 'yy',
              pathPrefix: 'yy',
              enabled: true,
              localization: { coverage: options.complete ? 'complete' : 'incremental' },
            },
          ],
        }),
      );
    } else if (route === '/sitemap.xml') {
      res.end(
        `<sitemapindex>${['zz', 'yy'].map((code) => `<sitemap><loc>${address(`/${code}/sitemap-pages.xml`)}</loc></sitemap>`).join('')}</sitemapindex>`,
      );
    } else if (route.endsWith('/sitemap-pages.xml')) {
      const entries = route.startsWith('/zz/') ? ['/'] : options.listed ? ['/yy/'] : [];
      res.end(`<urlset>${entries.map((entry) => `<url><loc>${address(entry)}</loc></url>`).join('')}</urlset>`);
    } else if (new URL(req.url!, origin).pathname === '/robots.txt') {
      res.setHeader('content-type', 'text/plain');
      res.end(
        robotsTxt({
          mode: 'standalone',
          scope: `${base}/`,
          aiTraining: loadConfig(ROOT).robots.aiTraining,
          sitemapUrl: address('/sitemap.xml'),
          hostRobotsUrl: `${origin}/robots.txt`,
        }),
      );
    } else if (route === '/llms.txt') {
      res.setHeader('content-type', 'text/plain');
      res.end('Fixture');
    } else if (route.includes('check-live-no-such-page') || route.endsWith('/404/')) {
      res.statusCode = 404;
      res.end('<main data-error="404">Missing</main>');
    } else {
      const noindex = route === '/yy/' && options.noindex !== false;
      res.end(
        `<html><head><link rel="canonical" href="${address(route)}">${noindex ? '<meta name="robots" content="noindex, follow">' : ''}</head><body>Fixture</body></html>`,
      );
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const result = await execute(
      process.execPath,
      [
        '--import',
        'tsx',
        path.resolve('scripts/check-live.ts'),
        '--site',
        origin,
        '--expect-build',
        options.expectedBuild ?? 'live-fixture',
        ...(options.platform ? ['--platform'] : []),
        ...(options.releaseRecord ? ['--release-record', options.releaseRecord] : []),
      ],
      {
        env: { ...process.env, BASE_PATH: base },
      },
    ).then(
      (result) => ({ ...result, code: 0 }),
      (error: { stdout: string; stderr: string; code: number }) => error,
    );
    return result;
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

it.each(['', '/prompt-seen'])('accepts an incremental noindex home absent from its sitemap at %s', async (basePath) => {
  const result = await check({ basePath });
  expect(result.stdout).toContain('yy home: 200, canonical, noindex');
  expect(result.code).toBe(0);
});

it('rejects a complete locale home missing from the sitemap even when its metadata says noindex', async () => {
  const result = await check({ complete: true });
  expect(result.code).toBe(1);
  expect(result.stdout).toContain('complete locale home is absent from its sitemap');
});

it('accepts a complete locale home that is indexable and listed', async () => {
  expect((await check({ complete: true, listed: true, noindex: false })).code).toBe(0);
});

it('rejects noindex metadata on a sitemap-listed home', async () => {
  const result = await check({ listed: true });
  expect(result.code).toBe(1);
  expect(result.stdout).toContain('noindex metadata on a sitemap-listed page');
});

it('rejects an unlisted home without noindex metadata', async () => {
  const result = await check({ noindex: false });
  expect(result.code).toBe(1);
  expect(result.stdout).toContain('missing noindex metadata on a home outside its sitemap');
});

it('still rejects a platform noindex header forwarded to the canonical host', async () => {
  const result = await check({ platformHeader: true });
  expect(result.code).toBe(1);
  expect(result.stdout).toContain('X-Robots-Tag: noindex on the canonical host');
});

it('checks sitemap metadata even when platform headers prevent all indexing', async () => {
  expect((await check({ platform: true, platformHeader: true })).code).toBe(0);
  const result = await check({ platform: true, platformHeader: true, listed: true });
  expect(result.code).toBe(1);
  expect(result.stdout).toContain('noindex metadata on a sitemap-listed page');
});

it('records the canonical cutover only after observing the expected production build', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-seen-release-'));
  const releaseRecord = path.join(dir, 'canonical.json');
  try {
    expect((await check({ releaseRecord, expectedBuild: 'next-release' })).code).toBe(1);
    expect(fs.existsSync(releaseRecord)).toBe(false);
    expect((await check({ releaseRecord })).code).toBe(0);
    expect(JSON.parse(fs.readFileSync(releaseRecord, 'utf8'))).toMatchObject({
      buildId: 'live-fixture',
      origin: expect.stringMatching(/^http:\/\/127\.0\.0\.1:/),
      canonicalFirstObservedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
