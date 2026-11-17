import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { traditionalChineseFixtureCases, traditionalChineseSearchFixture } from '../support/traditional-chinese-search';
import type { WorkerResponse } from '../../src/modules/search/types';
import { renderTemplate } from '../../src/modules/template';
import { BASE, BUILD, ROOT } from './support/artifact';
import { composingText } from './support/composition';
import { templateDetail } from './support/content';
import { layoutProblems } from './support/layout';
import { seriousViolations } from './support/a11y';

const locale = BUILD.locales.find((entry) => entry.code === 'zh-Hant');

async function bundledSearch(page: Page, cases: readonly { query: string }[], url: string) {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        (window as typeof window & { acceptanceWorker?: Worker }).acceptanceWorker = this;
      }
    };
  });
  const started = page.waitForEvent('worker');
  await page.goto(`${BASE}/${locale?.pathPrefix ?? 'en'}/search/`);
  await started;
  return page.evaluate(
    async ({ cases, url, buildId }) => {
      const worker = (window as typeof window & { acceptanceWorker?: Worker }).acceptanceWorker;
      if (!worker) throw new Error('No bundled search Worker');
      return Promise.all(
        cases.map(
          ({ query }, index) =>
            new Promise<Extract<WorkerResponse, { type: 'results' }>>((resolve, reject) => {
              const seq = -index - 1;
              const timer = setTimeout(() => {
                worker.removeEventListener('message', receive);
                reject(new Error(`Worker timed out: ${query}`));
              }, 15_000);
              function receive(event: MessageEvent<WorkerResponse>) {
                if (event.data.seq !== seq) return;
                clearTimeout(timer);
                worker!.removeEventListener('message', receive);
                if (event.data.type === 'results') resolve(event.data);
                else reject(new Error(JSON.stringify(event.data)));
              }
              worker.addEventListener('message', receive);
              worker.postMessage({
                type: 'search',
                seq,
                buildId,
                source: { locale: 'zh-Hant', url },
                query,
                limit: Number.MAX_SAFE_INTEGER,
              });
            }),
        ),
      );
    },
    { cases: [...cases], url, buildId: BUILD.buildId },
  );
}

test('Traditional Chinese serialized vocabulary runs in the bundled Worker', async ({ page, context }) => {
  const url = `${BASE}/generated/zh-Hant/search/index.json?fixture=traditional-chinese`;
  await context.route(`**${url}`, (route) => route.fulfill({ json: traditionalChineseSearchFixture(BUILD.buildId) }));
  const responses = await bundledSearch(page, traditionalChineseFixtureCases, url);
  for (const [index, example] of traditionalChineseFixtureCases.entries()) {
    const result = responses[index]!.results;
    expect(
      result.groups.flatMap((group) => group.hits.map((hit) => hit.id)),
      example.query,
    ).toEqual(example.ids);
    expect(result.total).toBe(example.ids.length);
  }
});

test.describe('Traditional Chinese interface', () => {
  test.skip(!locale, 'Traditional Chinese is not built; this is not acceptance evidence');

  test('frozen corpus cases run against the packaged index in the bundled Worker', async ({ page }) => {
    const cases: {
      query: string;
      expectedKeys: string[];
      excludedKeys?: string[];
      topK: number;
      expectedTotal?: number;
    }[] = JSON.parse(fs.readFileSync(`${ROOT}/production/localization/zh-Hant/search-cases.json`, 'utf8')).cases;
    const responses = await bundledSearch(page, cases, `${BASE}/generated/zh-Hant/search/index.json`);
    for (const [index, example] of cases.entries()) {
      const result = responses[index]!.results;
      expect(result.locale).toBe('zh-Hant');
      const keys = result.groups.flatMap((group) =>
        group.hits.slice(0, example.topK).map((hit) => hit.id.replaceAll(':', '/')),
      );
      const allKeys = result.groups.flatMap((group) => group.hits.map((hit) => hit.id.replaceAll(':', '/')));
      for (const key of example.expectedKeys) expect(keys, example.query).toContain(key);
      for (const key of example.excludedKeys ?? []) expect(allKeys, example.query).not.toContain(key);
      if (example.expectedTotal !== undefined) expect(result.total, example.query).toBe(example.expectedTotal);
    }
  });

  for (const width of [390, 1280]) {
    test(`Traditional Chinese display font and layout at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const fontRequests: string[] = [];
      page.on('request', (request) => {
        if (request.resourceType() === 'font') fontRequests.push(new URL(request.url()).pathname);
      });
      for (const route of [
        `/${locale!.pathPrefix}/`,
        `/${locale!.pathPrefix}/search/`,
        templateDetail('zh-Hant', 't_001').path,
      ]) {
        await page.goto(`${BASE}${route}`);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
        expect(
          await page
            .locator('h1')
            .first()
            .evaluate((element) => getComputedStyle(element).fontFamily),
        ).toContain('Noto Sans TC');
        expect(await layoutProblems(page), route).toEqual([]);
      }
      expect(fontRequests.some((path) => path.includes('/generated/fonts/zh-Hant/') && path.endsWith('.woff2'))).toBe(
        true,
      );
      expect(fontRequests.filter((path) => /\/generated\/fonts\/(?:zh-Hans|ja|ko)\//.test(path))).toEqual([]);
    });
  }

  test('composition preserves candidate input without submitting or closing quick search', async ({ page }) => {
    await page.goto(`${BASE}/zh-hant/search/?q=ink`);
    const input = page.locator('#search-field');
    await expect(input).toHaveValue('ink');
    await expect(page.locator('[data-search-status]')).toContainText('ink');
    await input.focus();
    await input.dispatchEvent('compositionstart');
    await composingText(input, '繁');
    await input.press('Enter');
    await page.waitForTimeout(450);
    expect(new URL(page.url()).searchParams.get('q')).toBe('ink');
    await composingText(input, '繁體中文');
    await input.dispatchEvent('compositionend', { data: '繁體中文' });
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('繁體中文');
    // On the full search page the launcher focuses its existing field. Open the panel from home.
    await page.goto(`${BASE}/zh-hant/`);
    await page.locator('[data-search-launcher]').click();
    const dialog = page.locator('[data-quick-search]');
    const field = dialog.getByRole('textbox');
    await field.dispatchEvent('compositionstart');
    await composingText(field, '水');
    await field.dispatchEvent('keydown', { key: 'Enter', keyCode: 229 });
    await field.press('Escape');
    await expect(dialog).toBeVisible();
    await composingText(field, '水墨');
    await field.dispatchEvent('compositionend', { data: '水墨' });
    await field.press('Enter');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('水墨');
  });

  for (const [id, name, value] of [
    ['t_001', 'product', '帶斑點的陶瓷馬克杯'],
    ['t_002', 'subject', '冬崖上的一株孤松'],
  ]) {
    test(`input survives rendering, copy and download: ${id}`, async ({ page, context, browserName }) => {
      const detail = templateDetail('zh-Hant', id!);
      await page.goto(`${BASE}${detail.path}`);
      const input = page.locator(`[data-field-shell="${name}"] input`);
      await expect(input).toBeVisible();
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[data-field-shell] input')].every((element) =>
          Object.keys(element).some((key) => key.startsWith('__reactProps')),
        ),
      );
      await input.fill(value!);
      const expected = renderTemplate(
        { body: detail.version.body, fields: detail.version.fields },
        { ...detail.version.samples[0]!.values, [name!]: value! },
      ).text!;
      await expect(page.locator('[id$="-prompt"]').first()).toHaveText(expected);
      const download = page.waitForEvent('download');
      await page.locator('[data-action="download"]').click();
      expect(fs.readFileSync((await (await download).path())!, 'utf8')).toBe(expected);
      if (browserName === 'chromium') {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await page.locator('[data-copy-state]').first().click();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
      }
      expect(await layoutProblems(page)).toEqual([]);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
});
