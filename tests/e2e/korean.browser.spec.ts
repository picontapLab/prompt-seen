import { composingText } from './support/composition';
import { expect, test, type Page } from '@playwright/test';
import type { WorkerRequest, WorkerResponse } from '../../src/modules/search/types';
import { koreanFixtureCases, koreanSearchFixture } from '../support/korean-search';
import fs from 'node:fs';
import path from 'node:path';
import { renderTemplate } from '../../src/modules/template';
import { localeIndex, promptDetail, templateDetail } from './support/content';
import { layoutProblems } from './support/layout';
import { seriousViolations } from './support/a11y';
import { cancelledFetch } from './support/errors';
import { BASE, BUILD, ROOT } from './support/artifact';

// The composition contract is shared by every locale. Before Korean preview exists, exercise
// the English shell too; the frozen corpus tests below will require an actual Korean artifact.
const locale =
  BUILD.locales.find((entry) => entry.code === 'ko') ?? BUILD.locales.find((entry) => entry.code === 'en')!;

test('composition commits neither a search URL nor navigation until its final value', async ({ page }) => {
  await page.goto(`${BASE}/${locale.pathPrefix}/search/?q=ink`);
  const input = page.locator('#search-field');
  await expect(input).toHaveValue('ink');
  await input.focus();
  await expect(input).toBeFocused();
  await expect(page.locator('[data-search-status]')).toContainText('ink');
  await input.dispatchEvent('compositionstart');
  await composingText(input, '한');
  // The URL debounce must elapse: observing it immediately would pass even without protection.
  await page.waitForTimeout(450);
  expect(new URL(page.url()).searchParams.get('q')).toBe('ink');
  await input.press('Enter');
  const recent = await page.evaluate(() => localStorage.getItem('prompt-library:recent-searches:v1'));
  expect(recent ?? '').not.toContain('한');
  await composingText(input, '한글');
  await input.dispatchEvent('compositionend', { data: '한글' });
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('한글');

  await page.goto(`${BASE}/${locale.pathPrefix}/prompts/`);
  const launcher = page.locator('[data-search-launcher]');
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-search-launcher]');
    return element && Object.keys(element).some((key) => key.startsWith('__reactProps'));
  });
  await launcher.click();
  const dialog = page.locator('[data-quick-search]');
  const field = dialog.getByRole('textbox');
  await expect(field).toBeFocused();
  await field.fill('ink');
  await field.dispatchEvent('compositionstart');
  await composingText(field, '한');
  await field.dispatchEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: false });
  await page.waitForTimeout(100);
  await expect(dialog).toBeVisible();
  await field.press('Escape');
  await expect(dialog).toBeVisible();
  await composingText(field, '한글');
  await field.dispatchEvent('compositionend', { data: '한글' });
  await field.press('Enter');
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('한글');
});

for (const [id, name, value, label] of [
  ['t_001', 'product', '점박이 도자기 머그잔', '제품'],
  ['t_002', 'subject', '겨울 절벽의 소나무 한 그루', '주제'],
]) {
  test(`Korean input survives template preview, copy and download: ${id}`, async ({ page, context, browserName }) => {
    const detail = templateDetail(locale.code, id!);
    await page.goto(`${BASE}${detail.path}`);
    const field = page.locator(`[data-field-shell="${name}"] input`);
    await field.evaluate(
      (element) =>
        new Promise<void>((resolve) => {
          const poll = () =>
            Object.keys(element).some((key) => key.startsWith('__reactProps')) ? resolve() : setTimeout(poll, 20);
          poll();
        }),
    );
    if (locale.code === 'ko') await expect(field).toHaveAccessibleName(label!);
    await field.fill(value!);
    const expected = renderTemplate(
      { body: detail.version.body, fields: detail.version.fields },
      { ...detail.version.samples[0]!.values, [name!]: value! },
    ).text!;
    expect(expected).toContain(value);
    await expect(page.locator('[id$="-prompt"]').first()).toHaveText(expected);
    const downloading = page.waitForEvent('download');
    await page.locator('[data-action="download"]').click();
    expect(fs.readFileSync((await (await downloading).path())!, 'utf8')).toBe(expected);
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.locator('[data-copy-state]').first().click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
    }
  });
}

const korean = BUILD.locales.find((entry) => entry.code === 'ko');
const searchCases: { query: string; expectedKeys: string[]; topK: number }[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'production/localization/ko/search-cases.json'), 'utf8'),
).cases;

test.describe('frozen Korean search scenarios in the real Worker', () => {
  test.skip(!korean, 'Korean is not part of this artifact');
  for (const example of searchCases) {
    test(example.query, async ({ page }) => {
      const index = localeIndex('ko');
      await page.goto(`${BASE}/${korean!.pathPrefix}/search/?q=${encodeURIComponent(example.query)}`);
      await expect(page.locator('[data-search-status]')).toContainText(example.query.trim(), { timeout: 15_000 });
      for (const key of example.expectedKeys) {
        const [kind, id] = key.split('/');
        const records = kind === 'prompt' ? index.prompts : index.templates;
        const record = records.find((item) => item.id === id)!;
        expect(record, key).toBeDefined();
        await expect
          .poll(async () => {
            const paths = await page
              .locator(`[data-group="${kind}"] li a`)
              .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
            return paths.slice(0, example.topK).includes(`${BASE}${record.path}`);
          })
          .toBe(true);
      }
    });
  }
});

// Talk to the bundled Worker itself, including its fetch/deserialize/message path.
// Waiting for a real Worker also prevents a main-thread fallback from passing KO-06.
async function workerResults(page: Page, queries: string[], indexUrl = `${BASE}/generated/ko/search/index.json`) {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        (window as typeof window & { koreanSearchWorker?: Worker }).koreanSearchWorker = this;
      }
    };
  });
  const started = page.waitForEvent('worker');
  await page.goto(`${BASE}/ko/search/`);
  await started;
  const requests: Extract<WorkerRequest, { type: 'search' }>[] = queries.map((query, seq) => ({
    type: 'search',
    seq: -(seq + 1), // Keep test messages separate from the application client’s positive sequence numbers.
    buildId: BUILD.buildId,
    source: { locale: 'ko', url: indexUrl },
    query,
    // Compare the entire result ordering, not just the first page or top K.
    limit: Number.MAX_SAFE_INTEGER,
  }));
  return page.evaluate(async (requests) => {
    const worker = (window as typeof window & { koreanSearchWorker?: Worker }).koreanSearchWorker;
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

test.describe('Korean Worker semantic boundaries', () => {
  test.skip(!korean, 'Korean is not part of this artifact');

  test('isolated fixture excludes false aliases and returns a genuinely empty result', async ({ page, context }) => {
    const indexUrl = `${BASE}/generated/ko/search/index.json?fixture=korean-semantics`;
    // Worker network requests belong to the browser context, not the page route handler.
    await context.route(`**${indexUrl}`, (route) => route.fulfill({ json: koreanSearchFixture(BUILD.buildId) }));
    const responses = await workerResults(
      page,
      koreanFixtureCases.map((example) => example.query),
      indexUrl,
    );
    for (const [i, example] of koreanFixtureCases.entries()) {
      const result = responses[i]!.results;
      expect(
        result.groups.flatMap((group) => group.hits.map((hit) => hit.id)),
        example.query,
      ).toEqual(example.ids);
      expect(result.total, example.query).toBe(example.ids.length);
      if (!example.ids.length) expect(result.groups).toEqual([]);
    }
  });

  for (const query of ['제품 사진 스튜디오', '수묵화 매화']) {
    test(`NFC/NFD preserve the full corpus result order: ${query}`, async ({ page }) => {
      const responses = await workerResults(page, [query, query.normalize('NFD')]);
      const [nfc, nfd] = responses.map(({ results }) => ({
        total: results.total,
        groups: results.groups.map((group) => ({ kind: group.kind, ids: group.hits.map((hit) => hit.id) })),
      }));
      expect(nfc!.total).toBeGreaterThan(0);
      expect(nfd).toEqual(nfc);
    });
  }
});

test('Korean acceptance cannot silently use an artifact without ko', () => {
  test.skip(process.env.KO_ACCEPTANCE !== '1', 'explicit candidate acceptance only');
  expect(korean).toBeDefined();
});

test.describe('Korean preview layout', () => {
  test.skip(!korean, 'Korean is not part of this artifact');
  for (const width of [360, 768, 1024, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${width}px ${theme}: Korean descriptions and controls fit`, async ({ page, browserName }) => {
        test.setTimeout(90_000);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          if (!cancelledFetch(error.message)) errors.push(error.message);
        });
        for (const route of [
          '/ko/',
          '/ko/prompts/',
          '/ko/about/',
          '/ko/license/',
          '/ko/favorites/',
          promptDetail('ko', 'p_012').path,
          promptDetail('ko', 'p_151').path,
          templateDetail('ko', 't_001').path,
          '/ko/search/?q=수묵화',
        ]) {
          await page.goto(`${BASE}${route}`);
          await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
          await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
          await expect(page.locator('h1')).toBeVisible();
          if (route.startsWith('/ko/search/')) {
            await expect(page.locator('[data-search-status]')).toContainText('수묵화');
            await expect(page.locator('[data-group="prompt"] li').first()).toBeVisible();
          }
          const preview = page.locator('[data-static-from="lg"] > button');
          if (await preview.isVisible()) await preview.click();
          expect(await layoutProblems(page), route).toEqual([]);
        }
        await page.screenshot({
          path: `.artifacts/localization/ko/screenshots/search-${browserName}-${width}-${theme}.png`,
          fullPage: true,
        });
        expect(errors).toEqual([]);
      });
    }
  }
  test('Korean template accessible names and contrast', async ({ page }) => {
    await page.goto(`${BASE}${templateDetail('ko', 't_001').path}`);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
