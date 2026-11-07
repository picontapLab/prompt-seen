# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore.browser.spec.ts >> desktop >> options combine across dimensions, counts follow, and zero-result options are disabled
- Location: tests/e2e/explore.browser.spec.ts:35:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:8090/en/explore/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import { facetCounts, EMPTY_QUERY, queryResults, type FeedQuery } from '../../src/modules/feed/query';
  3   | import { seriousViolations } from './support/a11y';
  4   | import { BASE, BUILD, message } from './support/artifact';
  5   | import { feedIndex } from './support/content';
  6   | 
  7   | // Explore in real browsers (design doc §9.4, §11.7, §17.3 step 4c): every filter beside the
  8   | // results with counts from the list's slim index, options that would leave nothing disabled,
  9   | // conditions in the fragment of the one explore address, and the list's own feed and popup.
  10  | 
  11  | const locale = BUILD.locales[0]!;
  12  | const code = locale.code;
  13  | const index = feedIndex(code);
  14  | const exploreUrl = `${BASE}/${locale.pathPrefix}/explore/`;
  15  | const listUrl = `${BASE}/${locale.pathPrefix}/prompts/`;
  16  | const filters = (page: Page) => page.locator('[data-explore-filters]');
  17  | const shownIds = (page: Page) =>
  18  |   page
  19  |     .locator('[role="feed"] > article')
  20  |     .evaluateAll((els) =>
  21  |       els
  22  |         .filter((e) => !e.hasAttribute('data-interlude') || e.getAttribute('data-reason') === 'extreme')
  23  |         .map((e) => e.getAttribute('data-entry')),
  24  |     );
  25  | 
  26  | const hydrated = (page: Page) =>
  27  |   page.waitForFunction(() => {
  28  |     const el = document.querySelector('[data-explore-filters] button');
  29  |     return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  30  |   });
  31  | 
  32  | test.describe('desktop', () => {
  33  |   test.use({ viewport: { width: 1440, height: 900 } });
  34  | 
  35  |   test('options combine across dimensions, counts follow, and zero-result options are disabled', async ({ page }) => {
  36  |     const errors: string[] = [];
  37  |     page.on('pageerror', (e) => errors.push(e.message));
> 38  |     await page.goto(exploreUrl);
      |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  39  |     await hydrated(page);
  40  |     await expect(filters(page)).toBeVisible();
  41  |     await expect(page.locator('[data-page="explore"] [data-band]')).toHaveCount(0);
  42  | 
  43  |     // Pick the use with the most works, then a shape that still leaves some.
  44  |     const use = [...index.useCases].sort(
  45  |       (a, b) =>
  46  |         index.items.filter((f) => f.u.includes(b.id)).length - index.items.filter((f) => f.u.includes(a.id)).length,
  47  |     )[0]!;
  48  |     await filters(page)
  49  |       .getByRole('button', { name: new RegExp(`^${use.label}`) })
  50  |       .click();
  51  |     await expect(page).toHaveURL(new RegExp(`/explore/#use=${use.id}$`));
  52  |     let query: FeedQuery = { ...EMPTY_QUERY, use: [use.id] };
  53  |     await expect(filters(page).locator('[data-results]')).toHaveText(
  54  |       message(code, 'feed.filters.results').includes('{count')
  55  |         ? new RegExp(`${queryResults(index, query).length}`)
  56  |         : /./,
  57  |     );
  58  |     await expect
  59  |       .poll(async () => (await shownIds(page)).slice(0, 24))
  60  |       .toEqual(
  61  |         queryResults(index, query)
  62  |           .slice(0, 24)
  63  |           .map((f) => f.id),
  64  |       );
  65  | 
  66  |     // Every option with no results under the other conditions is disabled; the others are not.
  67  |     const counts = facetCounts(index, query);
  68  |     for (const s of index.styles) {
  69  |       const chip = filters(page).getByRole('button', { name: new RegExp(`^${s.label}`) });
  70  |       if ((counts.style[s.id] ?? 0) === 0) await expect(chip).toBeDisabled();
  71  |       else await expect(chip).toBeEnabled();
  72  |     }
  73  | 
  74  |     const shape = (['portrait', 'square', 'landscape', 'panorama'] as const).find((s) => counts.shape[s] > 0)!;
  75  |     await filters(page)
  76  |       .getByRole('button', { name: new RegExp(`^${message(code, `feed.filters.shapes.${shape}`)}`) })
  77  |       .click();
  78  |     query = { ...query, shape: [shape] };
  79  |     await expect(page).toHaveURL(new RegExp(`/explore/#use=${use.id}&shape=${shape}$`));
  80  |     await expect
  81  |       .poll(async () => (await shownIds(page)).slice(0, 24))
  82  |       .toEqual(
  83  |         queryResults(index, query)
  84  |           .slice(0, 24)
  85  |           .map((f) => f.id),
  86  |       );
  87  | 
  88  |     // Shared or reloaded, the same conditions come back; the path stays the explore page.
  89  |     await page.reload();
  90  |     await hydrated(page);
  91  |     await expect(filters(page).getByRole('button', { name: new RegExp(`^${use.label}`) })).toHaveAttribute(
  92  |       'aria-pressed',
  93  |       'true',
  94  |     );
  95  |     await page.mouse.wheel(0, 3000);
  96  |     await page.waitForTimeout(400);
  97  |     expect(new URL(page.url()).pathname).toBe(exploreUrl);
  98  |     expect(await seriousViolations(page)).toEqual([]);
  99  | 
  100 |     // Clear.
  101 |     await filters(page)
  102 |       .getByRole('button', { name: new RegExp(message(code, 'feed.filters.clear')) })
  103 |       .click();
  104 |     await expect(page).toHaveURL(exploreUrl);
  105 |     expect(errors).toEqual([]);
  106 |   });
  107 | 
  108 |   test('the list links to explore with its conditions, and works open in the popup there', async ({ page }) => {
  109 |     const style = index.styles.find((s) => index.items.some((f) => f.s.includes(s.id)))!;
  110 |     await page.goto(`${listUrl}#style=${style.id}`);
  111 |     await page.waitForFunction(() =>
  112 |       Object.keys(document.querySelector('[data-explore-link]') ?? {}).some((k) => k.startsWith('__react')),
  113 |     );
  114 |     await expect(page.locator('[data-explore-link]')).toHaveAttribute('href', `${exploreUrl}#style=${style.id}`);
  115 |     await page.locator('[data-explore-link]').click();
  116 |     await expect(page).toHaveURL(`${exploreUrl}#style=${style.id}`);
  117 |     await hydrated(page);
  118 |     await expect(filters(page).getByRole('button', { name: new RegExp(`^${style.label}`) })).toHaveAttribute(
  119 |       'aria-pressed',
  120 |       'true',
  121 |     );
  122 |     const card = page.locator('[role="feed"] > article[data-entry]:not([data-interlude])').first();
  123 |     await card.locator('a').first().click();
  124 |     await expect(page.locator('dialog[open]')).toBeVisible();
  125 |     await page.keyboard.press('Escape');
  126 |     await expect(page.locator('dialog[open]')).toHaveCount(0);
  127 |     expect(new URL(page.url()).pathname).toBe(exploreUrl);
  128 |   });
  129 | });
  130 | 
  131 | test('narrow screens use the list’s filter bar instead of the side panel', async ({ page }) => {
  132 |   await page.setViewportSize({ width: 390, height: 844 });
  133 |   await page.goto(exploreUrl);
  134 |   await expect(filters(page)).toBeHidden();
  135 |   await expect(page.getByRole('button', { name: message(code, 'feed.filters.open'), exact: true })).toBeVisible();
  136 | });
  137 | 
```