import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { WorkerRequest, WorkerResponse } from '../../src/modules/search/types';
import { searchRecord, type LocalizationSearchCase } from '../support/localization-search';
import { BASE, BUILD, ROOT } from './support/artifact';
import { localeIndex } from './support/content';
import { expectFrenchState, french } from './support/french';

const cases: LocalizationSearchCase[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'production/localization/fr/search-cases.json'), 'utf8'),
).cases;
test.beforeAll(expectFrenchState);
async function workerResults(page: Page, queries: string[], indexUrl = `${BASE}/generated/fr/search/index.json`) {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        (window as typeof window & { frenchSearchWorker?: Worker }).frenchSearchWorker = this;
      }
    };
  });
  const started = page.waitForEvent('worker');
  await page.goto(`${BASE}/fr/search/`);
  await started;
  const requests: Extract<WorkerRequest, { type: 'search' }>[] = queries.map((query, seq) => ({
    type: 'search',
    seq: -(seq + 1), // Keep test messages separate from the application client’s positive sequence numbers.
    buildId: BUILD.buildId,
    source: { locale: 'fr', url: indexUrl },
    query,
    // Compare the entire result ordering, not just the first page or top K.
    limit: Number.MAX_SAFE_INTEGER,
  }));
  return page.evaluate(async (requests) => {
    const worker = (window as typeof window & { frenchSearchWorker?: Worker }).frenchSearchWorker;
    if (!worker) throw new Error('The application did not start a real search Worker');
    try {
      return await Promise.all(
        requests.map(
          (request) =>
            new Promise<Extract<WorkerResponse, { type: 'results' }>>((resolve, reject) => {
              const timer = setTimeout(() => reject(new Error(`Worker timed out: ${request.query}`)), 15_000);
              const onError = (event: ErrorEvent) => {
                clearTimeout(timer);
                reject(new Error(event.message));
              };
              const onMessage = (event: MessageEvent<WorkerResponse>) => {
                if (event.data.seq !== request.seq) return;
                clearTimeout(timer);
                worker.removeEventListener('message', onMessage);
                worker.removeEventListener('error', onError);
                if (event.data.type !== 'results') reject(new Error(JSON.stringify(event.data)));
                else resolve(event.data);
              };
              worker.addEventListener('message', onMessage);
              worker.addEventListener('error', onError);
              worker.postMessage(request);
            }),
        ),
      );
    } finally {
      worker.terminate();
    }
  }, requests);
}

if (french) {
  test('fr: every frozen query runs in the real Worker with complete negative assertions', async ({ page }) => {
    const index = localeIndex('fr');
    for (const example of cases)
      for (const key of example.expectedKeys)
        expect(searchRecord(index, key)?.localization.localStatus, key).toBe('current');
    const responses = await workerResults(
      page,
      cases.map((c) => c.query),
    );
    for (const [i, response] of responses.entries()) {
      const example = cases[i]!;
      const results = response.results;
      const top = results.groups.flatMap((g) => g.hits.slice(0, example.topK).map((h) => h.id.replaceAll(':', '/')));
      const all = results.groups.flatMap((g) => g.hits.map((h) => h.id.replaceAll(':', '/')));
      for (const key of example.expectedKeys) expect.soft(top, example.query).toContain(key);
      for (const key of example.excludedKeys ?? []) expect.soft(all, example.query).not.toContain(key);
      if (example.expectedTotal !== undefined) expect.soft(results.total, example.query).toBe(example.expectedTotal);
    }
  });
  for (const example of cases.filter((c) => c.expectedKeys.length || c.expectedTotal === 0)) {
    test(`fr search UI: ${example.query}`, async ({ page }) => {
      await page.goto(`${BASE}/fr/search/?q=${encodeURIComponent(example.query)}`);
      for (const key of example.expectedKeys) {
        const record = searchRecord(localeIndex('fr'), key)!;
        const kind = key.split('/')[0];
        await expect
          .poll(async () =>
            (
              await page
                .locator(`[data-group="${kind}"] li a`)
                .evaluateAll((links) => links.map((a) => a.getAttribute('href')))
            ).slice(0, example.topK),
          )
          .toContain(`${BASE}${record.path}`);
      }
      if (example.expectedTotal === 0) {
        await expect(page.locator('[data-no-results]')).toBeVisible();
        await expect(page.locator('[data-group]')).toHaveCount(0);
      }
      if (example.query === 'portrait couverture') {
        const record = searchRecord(localeIndex('fr'), 'prompt/p_111')!;
        await expect(
          page
            .locator(`a[href="${BASE}${record.path}"] mark`)
            .filter({ hasText: /^Portrait$/ })
            .first(),
        ).toBeVisible();
      }
      // Cross-language help loads additional indexes after the local empty result. Use
      // the same cold-index budget as the shared search and French interaction checks.
      if (example.query === '梅枝')
        await expect(
          page.locator(
            `[data-no-results] a[href="${BASE}/${BUILD.locales.find((locale) => locale.code === 'zh-Hans')!.pathPrefix}/search/?q=${encodeURIComponent('梅枝')}"]`,
          ),
        ).toBeVisible({ timeout: 15_000 });
    });
  }
}
