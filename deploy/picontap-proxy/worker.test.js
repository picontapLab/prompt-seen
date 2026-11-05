import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import worker from './worker.js';

const env = {
  DEPLOYMENT_MODE: 'production',
  CANONICAL_ORIGIN: 'https://picontap.com',
  BASE_PATH: '/prompt-seen',
  PAGES_ORIGIN: 'https://owned-library.pages.dev',
  FORCE_NOINDEX: 'false',
  PAGES_304_WITHOUT_MARKER: 'false',
};
const platform = { 'X-Robots-Tag': 'noindex', 'X-Prompt-Seen-Platform-Noindex': 'production-v1' };
const request = (path = '/prompt-seen/en/', init) => new Request(`https://picontap.com${path}`, init);
beforeEach(() => mock.method(console, 'error', () => {}));
afterEach(() => mock.restoreAll());

test('forwards path, query and protocol headers without credentials; strips only declared response headers', async () => {
  const upstream = mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url.href, `${env.PAGES_ORIGIN}/prompt-seen/en/?q=a%20b&utm_source=test`);
    assert.equal(init.redirect, 'manual');
    assert.equal(init.headers.get('Range'), 'bytes=0-9');
    assert.equal(init.headers.get('If-None-Match'), '"build"');
    for (const h of ['cookie', 'authorization', 'proxy-authorization', 'forwarded', 'x-prompt-seen-platform-noindex']) {
      assert.equal(init.headers.get(h), null);
    }
    return new Response('0123456789', {
      status: 206,
      headers: {
        ...platform,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Range': 'bytes 0-9/100',
        'Accept-Ranges': 'bytes',
        ETag: '"build"',
        Link: '<https://picontap.com/prompt-seen/en/>; rel="canonical"',
        'Clear-Site-Data': '"*"',
        NEL: '{}',
        'Report-To': '{}',
        'Strict-Transport-Security': 'max-age=123',
      },
    });
  });
  const res = await worker.fetch(
    request('/prompt-seen/en/?q=a%20b&utm_source=test', {
      headers: {
        Cookie: 'session=private',
        Authorization: 'Bearer private',
        'Proxy-Authorization': 'private',
        Forwarded: 'secret',
        'X-Prompt-Seen-Platform-Noindex': 'spoofed',
        Range: 'bytes=0-9',
        'If-None-Match': '"build"',
      },
    }),
    env,
  );
  assert.equal(upstream.mock.callCount(), 1);
  assert.equal(res.status, 206);
  assert.equal(await res.text(), '0123456789');
  assert.equal(res.headers.get('Content-Range'), 'bytes 0-9/100');
  assert.equal(res.headers.get('Accept-Ranges'), 'bytes');
  assert.equal(res.headers.get('ETag'), '"build"');
  assert.match(res.headers.get('Link'), /canonical/);
  assert.match(res.headers.get('Cache-Control'), /immutable/);
  for (const h of [
    'X-Robots-Tag',
    'X-Prompt-Seen-Platform-Noindex',
    'Clear-Site-Data',
    'NEL',
    'Report-To',
    'Strict-Transport-Security',
    'X-Prompt-Seen-Proxy-Robots-Result',
  ])
    assert.equal(res.headers.get(h), null);
  assert.equal(res.headers.get('X-Frame-Options'), 'SAMEORIGIN');
  assert.match(res.headers.get('Content-Security-Policy'), /connect-src https:\/\/picontap.com\/prompt-seen\//);
  assert.ok(res.headers.get('Content-Security-Policy').split(' ').includes('https://picontap.com/cdn-cgi/rum'));
  assert.ok(!res.headers.get('Content-Security-Policy').split(' ').includes('https://picontap.com'));
});

for (const path of [
  '/prompt-seen',
  '/prompt-seen-other/',
  '/prompt-seen2/',
  '/zh/prompt-seen/',
  '/prompt-seen/%2fapi/',
]) {
  test(`rejects path outside the project boundary: ${path}`, async () => {
    const upstream = mock.method(globalThis, 'fetch', () => {
      throw new Error('must not fetch');
    });
    assert.equal((await worker.fetch(request(path), env)).status, 404);
    assert.equal(upstream.mock.callCount(), 0);
  });
}
test('rejects foreign host and write methods without contacting upstream', async () => {
  const upstream = mock.method(globalThis, 'fetch', () => {
    throw new Error('must not fetch');
  });
  assert.equal((await worker.fetch(new Request('https://other.test/prompt-seen/en/'), env)).status, 404);
  const res = await worker.fetch(request(undefined, { method: 'POST' }), env);
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'GET, HEAD');
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.equal(upstream.mock.callCount(), 0);
});
for (const location of [
  'https://owned-library.pages.dev/prompt-seen/en/?a=1',
  '//owned-library.pages.dev/prompt-seen/en/?a=1',
  '/prompt-seen/en/?a=1',
  '../en/?a=1',
]) {
  test(`rewrites owned redirects: ${location}`, async () => {
    mock.method(globalThis, 'fetch', async () => new Response(null, { status: 308, headers: { Location: location } }));
    const res = await worker.fetch(request(), env);
    assert.equal(res.status, 308);
    assert.equal(res.headers.get('Location'), 'https://picontap.com/prompt-seen/en/?a=1');
  });
}
for (const location of [
  'https://evil.test/prompt-seen/en/',
  '/api/health',
  '//owned-library.pages.dev/other/',
  'https://user:pass@owned-library.pages.dev/prompt-seen/',
]) {
  test(`blocks unexpected redirect: ${location}`, async () => {
    mock.method(globalThis, 'fetch', async () => new Response(null, { status: 302, headers: { Location: location } }));
    const res = await worker.fetch(request(), env);
    assert.equal(res.status, 502);
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
  });
}
for (const headers of [
  { 'X-Robots-Tag': 'noindex' },
  { ...platform, 'X-Robots-Tag': 'noindex, nofollow' },
  { ...platform, 'X-Prompt-Seen-Platform-Noindex': 'preview' },
]) {
  test(`preserves unknown or combined robots: ${JSON.stringify(headers)}`, async () => {
    mock.method(globalThis, 'fetch', async () => new Response('<meta name="robots" content="noindex">', { headers }));
    const res = await worker.fetch(request(), env);
    assert.equal(res.headers.get('X-Robots-Tag'), headers['X-Robots-Tag']);
    assert.match(await res.text(), /noindex/);
  });
}
test('strips platform robots while leaving page-level meta robots unchanged', async () => {
  mock.method(
    globalThis,
    'fetch',
    async () => new Response('<meta name="robots" content="noindex">', { headers: platform }),
  );
  const res = await worker.fetch(request(), env);
  assert.equal(res.headers.get('X-Robots-Tag'), null);
  assert.match(await res.text(), /noindex/);
});
test('preview exposes the processing result and forces noindex on successes and failures', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('html', { headers: platform }));
  const preview = { ...env, DEPLOYMENT_MODE: 'preview', PREVIEW_HOSTNAME: 'preview.account.workers.dev' };
  const res = await worker.fetch(new Request('https://preview.account.workers.dev/prompt-seen/en/'), preview);
  assert.equal(res.headers.get('X-Prompt-Seen-Proxy-Robots-Result'), 'removed');
  assert.equal(res.headers.get('X-Robots-Tag'), 'noindex');
  assert.equal((await worker.fetch(request('/wrong'), preview)).headers.get('X-Robots-Tag'), 'noindex');
});
test('FORCE_NOINDEX applies after platform removal', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('html', { headers: platform }));
  assert.equal(
    (await worker.fetch(request(), { ...env, FORCE_NOINDEX: 'true' })).headers.get('X-Robots-Tag'),
    'noindex',
  );
});
for (const status of [404, 410, 416, 500, 503]) {
  test(`preserves upstream error ${status} and forbids indexing/caching`, async () => {
    mock.method(globalThis, 'fetch', async () => new Response('error', { status, headers: platform }));
    const res = await worker.fetch(request(), env);
    assert.equal(res.status, status);
    assert.match(res.headers.get('X-Robots-Tag'), /noindex/);
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
  });
}
test('strips unexpected Set-Cookie and disables caching', async () => {
  mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response('html', { headers: { ...platform, 'Set-Cookie': 'session=bad', 'Cache-Control': 'public' } }),
  );
  const res = await worker.fetch(request(), env);
  assert.equal(res.headers.get('Set-Cookie'), null);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});
test('network failures return retryable 503; HEAD has no body', async () => {
  mock.method(globalThis, 'fetch', async () => {
    throw new Error('network timeout');
  });
  const res = await worker.fetch(request(undefined, { method: 'HEAD' }), env);
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('Retry-After'), '60');
  assert.equal(await res.text(), '');
});
test('HEAD forwards the method and preserves metadata without a body', async () => {
  mock.method(globalThis, 'fetch', async (_, init) => {
    assert.equal(init.method, 'HEAD');
    return new Response(null, { headers: { ...platform, ETag: '"build"' } });
  });
  const res = await worker.fetch(request(undefined, { method: 'HEAD' }), env);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), '');
  assert.equal(res.headers.get('ETag'), '"build"');
});
test('304 only drops unmarked noindex after real Pages behavior is explicitly configured', async () => {
  mock.method(
    globalThis,
    'fetch',
    async () => new Response(null, { status: 304, headers: { 'X-Robots-Tag': 'noindex', ETag: '"build"' } }),
  );
  const closed = await worker.fetch(request(), env);
  assert.equal(closed.headers.get('X-Robots-Tag'), 'noindex');
  const configured = await worker.fetch(request(), { ...env, PAGES_304_WITHOUT_MARKER: 'true' });
  assert.equal(configured.status, 304);
  assert.equal(configured.headers.get('X-Robots-Tag'), null);
  assert.equal(configured.headers.get('ETag'), '"build"');
});
for (const origin of [
  'http://owned-library.pages.dev',
  'https://prompt-seen.pages.dev',
  'https://REPLACE_WITH_ACTUAL_SUBDOMAIN.pages.dev',
  'https://evil.test',
]) {
  test(`rejects unsafe or placeholder upstream ${origin}`, async () => {
    assert.equal((await worker.fetch(request(), { ...env, PAGES_ORIGIN: origin })).status, 503);
  });
}
