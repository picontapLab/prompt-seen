import { expect, test, type Page } from '@playwright/test';
import { facetCounts, EMPTY_QUERY, queryResults, type FeedQuery } from '../../src/modules/feed/query';
import { seriousViolations } from './support/a11y';
import { BASE, BUILD, message } from './support/artifact';
import { feedIndex } from './support/content';

// Explore in real browsers (design doc §9.4, §11.7, §17.3 step 4c): every filter beside the
// results with counts from the list's slim index, options that would leave nothing disabled,
// conditions in the fragment of the one explore address, and the list's own feed and popup.

const locale = BUILD.locales[0]!;
const code = locale.code;
const index = feedIndex(code);
const exploreUrl = `${BASE}/${locale.pathPrefix}/explore/`;
const listUrl = `${BASE}/${locale.pathPrefix}/prompts/`;
const filters = (page: Page) => page.locator('[data-explore-filters]');
const shownIds = (page: Page) =>
  page
    .locator('[role="feed"] > article')
    .evaluateAll((els) =>
      els
        .filter((e) => !e.hasAttribute('data-interlude') || e.getAttribute('data-reason') === 'extreme')
        .map((e) => e.getAttribute('data-entry')),
    );

const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const el = document.querySelector('[data-explore-filters] button');
    return !!el && Object.keys(el).some((k) => k.startsWith('__reactProps'));
  });

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('options combine across dimensions, counts follow, and zero-result options are disabled', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(exploreUrl);
    await hydrated(page);
    await expect(filters(page)).toBeVisible();
    await expect(page.locator('[data-page="explore"] [data-band]')).toHaveCount(0);

    // Pick the use with the most works, then a shape that still leaves some.
    const use = [...index.useCases].sort(
      (a, b) =>
        index.items.filter((f) => f.u.includes(b.id)).length - index.items.filter((f) => f.u.includes(a.id)).length,
    )[0]!;
    await filters(page)
      .getByRole('button', { name: new RegExp(`^${use.label}`) })
      .click();
    await expect(page).toHaveURL(new RegExp(`/explore/#use=${use.id}$`));
    let query: FeedQuery = { ...EMPTY_QUERY, use: [use.id] };
    await expect(filters(page).locator('[data-results]')).toHaveText(
      message(code, 'feed.filters.results').includes('{count')
        ? new RegExp(`${queryResults(index, query).length}`)
        : /./,
    );
    await expect
      .poll(async () => (await shownIds(page)).slice(0, 24))
      .toEqual(
        queryResults(index, query)
          .slice(0, 24)
          .map((f) => f.id),
      );

    // Every option with no results under the other conditions is disabled; the others are not.
    const counts = facetCounts(index, query);
    for (const s of index.styles) {
      const chip = filters(page).getByRole('button', { name: new RegExp(`^${s.label}`) });
      if ((counts.style[s.id] ?? 0) === 0) await expect(chip).toBeDisabled();
      else await expect(chip).toBeEnabled();
    }

    const shape = (['portrait', 'square', 'landscape', 'panorama'] as const).find((s) => counts.shape[s] > 0)!;
    await filters(page)
      .getByRole('button', { name: new RegExp(`^${message(code, `feed.filters.shapes.${shape}`)}`) })
      .click();
    query = { ...query, shape: [shape] };
    await expect(page).toHaveURL(new RegExp(`/explore/#use=${use.id}&shape=${shape}$`));
    await expect
      .poll(async () => (await shownIds(page)).slice(0, 24))
      .toEqual(
        queryResults(index, query)
          .slice(0, 24)
          .map((f) => f.id),
      );

    // Shared or reloaded, the same conditions come back; the path stays the explore page.
    await page.reload();
    await hydrated(page);
    await expect(filters(page).getByRole('button', { name: new RegExp(`^${use.label}`) })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(400);
    expect(new URL(page.url()).pathname).toBe(exploreUrl);
    expect(await seriousViolations(page)).toEqual([]);

    // Clear.
    await filters(page)
      .getByRole('button', { name: new RegExp(message(code, 'feed.filters.clear')) })
      .click();
    await expect(page).toHaveURL(exploreUrl);
    expect(errors).toEqual([]);
  });

  test('the list links to explore with its conditions, and works open in the popup there', async ({ page }) => {
    const style = index.styles.find((s) => index.items.some((f) => f.s.includes(s.id)))!;
    await page.goto(`${listUrl}#style=${style.id}`);
    await page.waitForFunction(() =>
      Object.keys(document.querySelector('[data-explore-link]') ?? {}).some((k) => k.startsWith('__react')),
    );
    await expect(page.locator('[data-explore-link]')).toHaveAttribute('href', `${exploreUrl}#style=${style.id}`);
    await page.locator('[data-explore-link]').click();
    await expect(page).toHaveURL(`${exploreUrl}#style=${style.id}`);
    await hydrated(page);
    await expect(filters(page).getByRole('button', { name: new RegExp(`^${style.label}`) })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const card = page.locator('[role="feed"] > article[data-entry]:not([data-interlude])').first();
    await card.locator('a').first().click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe(exploreUrl);
  });
});

test('narrow screens use the list’s filter bar instead of the side panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(exploreUrl);
  await expect(filters(page)).toBeHidden();
  await expect(page.getByRole('button', { name: message(code, 'feed.filters.open'), exact: true })).toBeVisible();
});
