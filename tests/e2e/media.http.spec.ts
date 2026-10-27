import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { BASE, BUILD, ROOT } from './support/artifact';

// Images from the local media driver (design doc §10.1, §15.5.3): imported variants are part of
// the artifact and served under the base path with an image content type, so a fresh clone
// shows every sample image without cloud storage.

const mediaDir = path.join(ROOT, 'dist', BASE, 'media');
const files = fs.existsSync(mediaDir)
  ? fs.readdirSync(mediaDir).flatMap((asset) => fs.readdirSync(path.join(mediaDir, asset)).map((f) => `${asset}/${f}`))
  : [];
const TYPES: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' };

// A build with a CDN (media.baseUrl) serves no images itself; `npm run media:check` covers the CDN.
test.skip(!!BUILD.mediaBaseUrl, 'images come from the CDN in this build');

test('the artifact contains the imported images', () => {
  expect(files.length, `no images under ${path.relative(ROOT, mediaDir)}`).toBeGreaterThan(0);
});

for (const ext of Object.keys(TYPES)) {
  const sample = files.find((f) => f.endsWith(`.${ext}`));
  test(`serves .${ext} images under the base path`, async ({ request }) => {
    test.skip(!sample, `no .${ext} image in this content set`);
    const res = await request.get(`${BASE}/media/${sample}`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe(TYPES[ext]);
    expect((await res.body()).length).toBe(fs.statSync(path.join(mediaDir, sample!)).size);
  });
}

test('a missing image answers 404', async ({ request }) => {
  const res = await request.get(`${BASE}/media/a_999/missing-detail-000000000000.webp`);
  expect(res.status()).toBe(404);
});
