import { expect, test } from '@playwright/test';
import { BASE, BUILD, publicUrl } from './support/artifact';
import { alternates, canonical, htmlElement, robots } from './support/html';
import { expectFrenchState, french } from './support/french';

test.beforeAll(expectFrenchState);

test('fr: artifact availability and entry points match the requested release state', async ({ request }) => {
  const root = await request.get(`${BASE}/`);
  expect(root.status()).toBe(200);
  const html = await root.text();
  const sitemap = await (await request.get(`${BASE}/sitemap.xml`)).text();
  const llms = await (await request.get(`${BASE}/llms.txt`)).text();
  if (!french) {
    expect(html).not.toContain(`href="${BASE}/fr/"`);
    expect(alternates(html)).not.toHaveProperty('fr');
    expect(sitemap).not.toContain('/fr/');
    expect(llms).not.toContain('/fr/');
    for (const url of [
      '/fr/',
      '/fr/sitemap-pages.xml',
      '/generated/fr/search/index.json',
      '/generated/fr/feed/latest/1.json',
    ])
      expect((await request.get(`${BASE}${url}`)).status(), url).toBe(404);
    return;
  }
  expect(html).toContain(`href="${BASE}/fr/"`);
  const home = await request.get(`${BASE}/fr/`, { headers: { 'accept-language': 'fr-CA,fr;q=0.9' }, maxRedirects: 0 });
  expect(home.status()).toBe(200);
  expect(htmlElement(await home.text())).toEqual({ lang: 'fr', dir: 'ltr' });
  const index = await request.get(`${BASE}/generated/fr/search/index.json`);
  expect(index.status()).toBe(200);
  expect(await index.json()).toMatchObject({ locale: 'fr', buildId: BUILD.buildId });
  if (BUILD.buildMode === 'preview') {
    expect(robots(await home.text()).join(' ')).toContain('noindex');
    expect(sitemap).not.toContain('/fr/');
    expect(llms).not.toContain('/fr/');
    expect(alternates(await home.text())).not.toHaveProperty('fr');
  } else {
    expect(robots(await home.text()).join(' ')).not.toContain('noindex');
    expect(sitemap).toContain(publicUrl('/fr/sitemap-pages.xml'));
    expect(llms).toContain(publicUrl('/fr/'));
    expect(alternates(await home.text())).toHaveProperty('fr', publicUrl('/fr/'));
  }
  for (const unsupported of ['/fr-fr/', '/fr-ca/', '/fr-FR/'])
    expect((await request.get(`${BASE}${unsupported}`, { maxRedirects: 0 })).status()).toBe(404);
});

if (french) {
  for (const [slug, title] of [
    ['about', 'À propos de Prompt Seen'],
    ['license', 'Licence'],
  ]) {
    test(`fr: ${slug} has local text and mode-appropriate metadata`, async ({ request }) => {
      const response = await request.get(`${BASE}/fr/${slug}/`);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(htmlElement(html)).toEqual({ lang: 'fr', dir: 'ltr' });
      expect(html).toContain(title);
      expect(canonical(html)).toBe(publicUrl(`/fr/${slug}/`));
      expect(html).toContain('content="fr_FR"');
      expect(robots(html).join(' ').includes('noindex')).toBe(BUILD.buildMode === 'preview');
    });
  }
}
