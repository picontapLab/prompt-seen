import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { renderTemplate } from '../../src/modules/template';
import type { WorkerRequest, WorkerResponse } from '../../src/modules/search/types';
import { russianFixtureCases, russianSearchFixture } from '../support/russian-search';
import { BASE, BUILD } from './support/artifact';
import { layoutProblems } from './support/layout';
import { seriousViolations } from './support/a11y';
import { russianCorpusCases, russianRankingCases } from '../support/russian-corpus';
import type { LocalizationSearchCase } from '../support/localization-search';
import { templateDetail } from './support/content';

const russian = BUILD.locales.find((locale) => locale.code === 'ru');
const locale = russian ?? BUILD.locales.find((locale) => locale.code === 'en')!;

test('Russian template inputs retain Cyrillic text through preview, download and copy', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(!russian, 'Russian is not part of this artifact');
  const detail = templateDetail('ru', 't_001');
  await page.goto(`${BASE}${detail.path}`);
  await page.waitForFunction(() => {
    const input = document.querySelector('[data-field-shell="product"] input');
    return input && Object.keys(input).some((key) => key.startsWith('__reactProps'));
  });
  const field = page.locator('[data-field-shell="product"] input');
  await expect(field).toHaveAccessibleName('Товар');
  const product = 'зелёный чай «Май» — объём 250 мл';
  await field.fill(product);
  const expected = renderTemplate(
    { body: detail.version.body, fields: detail.version.fields },
    { ...detail.version.samples[0]!.values, product },
  ).text!;
  await expect(page.locator('[id$="-prompt"]').first()).toHaveText(expected);
  const downloading = page.waitForEvent('download');
  await page.locator('[data-action="download"]').click();
  expect(fs.readFileSync((await (await downloading).path())!, 'utf8')).toBe(expected);
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('[data-copy-state]').first().click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  }
  expect(await seriousViolations(page)).toEqual([]);
});

test('Russian frozen ranking and pilot regressions use the actual built corpus in the actual Worker', async ({
  page,
}) => {
  test.skip(!russian, 'Russian is not part of this artifact');
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        (window as typeof window & { russianWorker?: Worker }).russianWorker = this;
      }
    };
  });
  const started = page.waitForEvent('worker');
  await page.goto(`${BASE}/ru/search/`);
  await started;
  const cases: LocalizationSearchCase[] = [
    ...russianRankingCases,
    ...russianCorpusCases.map((sample) => ({
      query: sample.query,
      expectedKeys: sample.id ? [`${sample.id.startsWith('t_') ? 'template' : 'prompt'}/${sample.id}`] : [],
      topK: Number.MAX_SAFE_INTEGER,
    })),
  ];
  for (const [i, sample] of cases.entries()) {
    const request: WorkerRequest = {
      type: 'search',
      seq: -1000 - i,
      buildId: BUILD.buildId,
      source: { locale: 'ru', url: `${BASE}/generated/ru/search/index.json` },
      query: sample.query,
      limit: Number.MAX_SAFE_INTEGER,
    };
    const response = await page.evaluate(
      (request) =>
        new Promise<WorkerResponse>((resolve, reject) => {
          const captured = (window as typeof window & { russianWorker?: Worker }).russianWorker;
          if (!captured) return reject(new Error('No actual search Worker'));
          const worker: Worker = captured;
          const timer = setTimeout(() => {
            worker.removeEventListener('message', receive);
            reject(new Error('Worker timeout'));
          }, 15000);
          function receive(event: MessageEvent<WorkerResponse>) {
            if (event.data.seq !== request.seq) return;
            clearTimeout(timer);
            worker.removeEventListener('message', receive);
            resolve(event.data);
          }
          worker.addEventListener('message', receive);
          worker.postMessage(request);
        }),
      request,
    );
    expect(response.type, sample.query).toBe('results');
    if (response.type !== 'results') throw new Error(JSON.stringify(response));
    const keys = response.results.groups.flatMap((group) =>
      group.hits.slice(0, sample.topK).map((hit) => hit.id.replaceAll(':', '/')),
    );
    const allKeys = response.results.groups.flatMap((group) => group.hits.map((hit) => hit.id.replaceAll(':', '/')));
    for (const key of sample.expectedKeys) expect(keys, sample.query).toContain(key);
    for (const key of sample.excludedKeys ?? []) expect(allKeys, sample.query).not.toContain(key);
    if (sample.expectedTotal !== undefined) expect(response.results.total, sample.query).toBe(sample.expectedTotal);
    if (sample.expectedTotal === undefined && !sample.expectedKeys.length && !sample.excludedKeys?.length)
      expect(response.results.total, sample.query).toBe(0);
  }
});

test('Russian keyboard KeyK opens search without treating Cyrillic typing as shortcuts', async ({ page }) => {
  await page.goto(`${BASE}/${locale.pathPrefix}/prompts/`);
  const launcher = page.locator('[data-search-launcher]');
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-search-launcher]');
    return el && Object.keys(el).some((key) => key.startsWith('__reactProps'));
  });
  await launcher.dispatchEvent('keydown', { key: 'л', code: 'KeyK', ctrlKey: true });
  const dialog = page.locator('[data-quick-search]');
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole('textbox');
  await input.fill('съёмка май');
  await input.dispatchEvent('keydown', { key: 'с', code: 'KeyC' });
  await expect(input).toHaveValue('съёмка май');
  await input.press('Escape');
  await expect(dialog).not.toBeVisible();
  await launcher.dispatchEvent('keydown', { key: 'л', code: 'KeyK', ctrlKey: true, isComposing: true });
  await expect(dialog).not.toBeVisible();
});

test('real Worker retains Russian letter distinctions, inflections and negative cases', async ({ page }) => {
  await page.route('**/russian-fixture.json', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(russianSearchFixture(BUILD.buildId)),
    }),
  );
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        (window as typeof window & { russianWorker?: Worker }).russianWorker = this;
      }
    };
  });
  const started = page.waitForEvent('worker');
  await page.goto(`${BASE}/${locale.pathPrefix}/search/`);
  await started;
  const requests: Extract<WorkerRequest, { type: 'search' }>[] = russianFixtureCases.map(({ query }, i) => ({
    type: 'search',
    seq: -i - 1,
    buildId: BUILD.buildId,
    source: { locale: 'ru', url: `${BASE}/generated/ru/search/russian-fixture.json` },
    query,
    limit: Number.MAX_SAFE_INTEGER,
  }));
  const results = await page.evaluate(async (requests) => {
    const capturedWorker = (window as typeof window & { russianWorker?: Worker }).russianWorker;
    if (!capturedWorker) throw new Error('No actual search Worker');
    const worker: Worker = capturedWorker;
    const results = [];
    for (const request of requests) {
      results.push(
        await new Promise<Extract<WorkerResponse, { type: 'results' }>>((resolve, reject) => {
          const timer = setTimeout(() => {
            worker.removeEventListener('message', receive);
            reject(new Error('Worker timeout'));
          }, 15000);
          function receive(event: MessageEvent<WorkerResponse>) {
            if (event.data.seq !== request.seq) return;
            clearTimeout(timer);
            worker.removeEventListener('message', receive);
            if (event.data.type === 'results') resolve(event.data);
            else reject(new Error(JSON.stringify(event.data)));
          }
          worker.addEventListener('message', receive);
          worker.postMessage(request);
        }),
      );
    }
    return results;
  }, requests);
  for (const [i, result] of results.entries()) {
    const ids = russianFixtureCases[i]!.ids;
    expect(result.results.total).toBe(ids.length);
    expect(result.results.groups.flatMap((group) => group.hits.map((hit) => hit.id)).sort()).toEqual([...ids].sort());
  }
});

test.describe('Russian layout and accessible foundation pages', () => {
  test.skip(!russian, 'Russian is not part of this artifact');
  for (const width of [360, 768, 1024, 1440])
    for (const theme of ['light', 'dark']) {
      test(`${width} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${BASE}/ru/about/`);
        await page.evaluate((theme) => document.documentElement.setAttribute('data-theme', theme), theme);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
        await expect(page.locator('h1')).toHaveText('О Prompt Seen');
        expect(await layoutProblems(page)).toEqual([]);
        expect(await seriousViolations(page)).toEqual([]);
        if (russian) {
          for (const id of ['t_001', 't_002', 't_017']) {
            const detail = templateDetail('ru', id);
            await page.goto(`${BASE}${detail.path}`);
            await page.evaluate((theme) => document.documentElement.setAttribute('data-theme', theme), theme);
            await expect(page.locator('h1')).toHaveText(detail.title);
            await page.evaluate(() => document.fonts.ready);
            if (width < 1024) {
              // The collapsed sheet deliberately clips content below the viewport.
              // Exercise its expanded, scrollable state before checking those controls.
              const handle = page.locator('[data-static-from="lg"] > button[aria-expanded]');
              await handle.click();
              await expect(handle).toHaveAttribute('aria-expanded', 'true');
              await page.locator('[data-action="sample"]').scrollIntoViewIfNeeded();
            }
            expect(await layoutProblems(page), id).toEqual([]);
            expect(await seriousViolations(page), id).toEqual([]);
          }
        }
      });
    }
});
