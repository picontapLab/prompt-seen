import { expect, test } from '@playwright/test';
import { BASE, BUILD, message } from './support/artifact';
import { localeIndex, promptDetail } from './support/content';

const portuguese = BUILD.locales.find((locale) => locale.code === 'pt-BR');
const favoritesKey = 'prompt-library:favorites:v1';
const preferencesKey = 'prompt-library:preferences:v1';
const searchIndex = /\/generated\/[^/]+\/search\/index\.json$/;

// Run in every configured browser against the actual Portuguese catalog and content.
// Skips on a normal disabled artifact do not count as Portuguese release acceptance.
test.describe('Portuguese locale policies in the packaged artifact', () => {
  test.skip(!portuguese, 'Portuguese is not part of this artifact; this is not release acceptance');

  for (const [count, label] of [
    [0, 'Favoritos'],
    [1, 'Favoritos, 1 obra'],
    [2, 'Favoritos, 2 obras'],
  ] as const) {
    test(`actual ICU favorites label and loaded content for ${count} works`, async ({ page }) => {
      const prompts = localeIndex('pt-BR').prompts.slice(0, count);
      expect(prompts).toHaveLength(count);
      const items = prompts.map((prompt, index) => ({
        id: prompt.id,
        kind: 'prompt',
        at: new Date(Date.UTC(2026, 10, 11, 12, index)).toISOString(),
      }));
      await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
        key: favoritesKey,
        value: { items },
      });
      await page.goto(`${BASE}/${portuguese!.pathPrefix}/favorites/`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
      // Waiting for the real list or empty state prevents an SSR-only zero-count pass.
      if (count === 0) {
        await expect(page.locator('[data-favorites-empty] h2')).toHaveText('Nenhum favorito ainda');
        await expect(page.locator('[data-favorites-count]')).toHaveCount(0);
      } else {
        await expect(page.locator('[data-saved-entry]')).toHaveCount(count);
        for (const prompt of prompts) {
          await expect(page.locator(`[data-saved-entry="${prompt.id}"]`)).toContainText(prompt.title);
        }
        await expect(page.locator('[data-favorites-count]')).toHaveText(String(count));
      }
      await expect(page.locator('[data-favorites-link]')).toHaveAccessibleName(label);
    });
  }

  test('clipboard refusal keeps the original Prompt selectable with Portuguese recovery and restored focus', async ({
    page,
  }) => {
    // Refuse both real browser API paths; this works without Chromium-only permissions.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            document.documentElement.dataset.refusedClipboardText = text;
            throw new DOMException('Clipboard access denied', 'NotAllowedError');
          },
        },
      });
      document.execCommand = (command: string) => {
        if (command === 'copy') {
          document.documentElement.dataset.refusedLegacyCopies = String(
            Number(document.documentElement.dataset.refusedLegacyCopies ?? 0) + 1,
          );
        }
        return false;
      };
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE}/${portuguese!.pathPrefix}/prompts/`);
    await page.waitForFunction(() => {
      const feed = document.querySelector('[role="feed"]');
      return feed && Object.keys(feed).some((key) => key.startsWith('__reactProps'));
    });
    const card = page.locator('[role="feed"] > article[data-entry]:not([data-interlude])').first();
    const detail = promptDetail('pt-BR', (await card.getAttribute('data-entry'))!);
    const original = detail.prompt.text.replace(/\r\n?/g, '\n').trim();
    const opener = card.locator('a').first();
    const popup = page.locator('dialog[data-popup][open]');
    let attempts = 0;
    for (const closeWith of ['Escape', 'button'] as const) {
      await opener.click();
      await expect(popup.locator('h2').first()).toHaveText(detail.title);
      const copy = popup.locator('[data-shortcut="copy"]');
      await expect(copy).toHaveAccessibleName(message('pt-BR', 'detail.copy.label'));
      await copy.click();
      await expect(copy).toHaveAttribute('data-copy-state', 'failed');
      await expect(copy).toHaveAccessibleName('Não foi possível copiar');
      await expect(
        popup.getByRole('status').filter({ hasText: message('pt-BR', 'detail.copy.failedHint') }),
      ).toHaveText('Selecione o texto do prompt e copie pelo teclado ou pelo menu.');
      await expect(page.locator('html')).toHaveAttribute('data-refused-clipboard-text', original);
      await expect(page.locator('html')).toHaveAttribute('data-refused-legacy-copies', String(++attempts));
      // Range selection is the application's manual-copy recovery, including annotated text.
      await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe(original);
      const close = popup.locator('[data-popup-close]');
      await expect(close).toHaveAccessibleName(message('pt-BR', 'popup.close'));
      await close.focus();
      await expect(close).toBeFocused();
      if (closeWith === 'Escape') await page.keyboard.press('Escape');
      else await close.click();
      await expect(popup).toHaveCount(0);
      await expect(opener).toBeFocused();
    }
  });

  test.describe('European Portuguese browser preference', () => {
    test.use({ locale: 'pt-PT' });

    test('explicit URLs win over preferences and the language menu identifies Brazil', async ({ page }) => {
      await page.addInitScript(
        (key) => localStorage.setItem(key, JSON.stringify({ version: 1, language: 'pt-BR' })),
        preferencesKey,
      );
      await page.goto(`${BASE}/`);
      expect(await page.evaluate(() => navigator.language)).toBe('pt-PT');
      await expect(page.locator('[data-page="home"]')).toHaveAttribute('data-locale', BUILD.defaultLocale);
      await expect(page.locator('h1')).toHaveText(message(BUILD.defaultLocale, 'home.hero.title'));
      expect(new URL(page.url()).pathname).toBe(`${BASE}/`);
      await page.waitForFunction(() => {
        const trigger = document.querySelector('header button[aria-haspopup="listbox"]');
        return trigger && Object.keys(trigger).some((key) => key.startsWith('__reactProps'));
      });
      await page.locator('header button[aria-haspopup="listbox"]').click();
      const brazilian = page.getByRole('option', { name: /Português \(Brasil\)/ });
      await expect(brazilian).toBeVisible();
      await brazilian.click();
      await page.waitForURL((url) => url.pathname === `${BASE}/${portuguese!.pathPrefix}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
      await page.reload();
      await expect(page.locator('[data-page="home"]')).toHaveAttribute('data-locale', 'pt-BR');
      expect(new URL(page.url()).pathname).toBe(`${BASE}/${portuguese!.pathPrefix}/`);

      const source = promptDetail(BUILD.defaultLocale, 'p_012');
      await page.goto(`${BASE}${source.path}`);
      await expect(page.locator('h1')).toHaveText(source.title);
      await expect(page.locator('html')).toHaveAttribute(
        'lang',
        BUILD.locales.find((locale) => locale.code === BUILD.defaultLocale)!.htmlLang,
      );
      expect(new URL(page.url()).pathname).toBe(`${BASE}${source.path}`);
      const translated = promptDetail('pt-BR', 'p_012');
      await page.goto(`${BASE}${translated.path}`);
      await expect(page.locator('h1')).toHaveText(translated.title);
      await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
      expect(new URL(page.url()).pathname).toBe(`${BASE}${translated.path}`);
    });
  });

  for (const mismatch of ['buildId', 'analyzerVersion'] as const) {
    test(`real Worker rejects stale ${mismatch}; clicking reload restores the query and results`, async ({ page }) => {
      let serveStale = true;
      let staleRequests = 0;
      let freshRequests = 0;
      await page.route(searchIndex, async (route) => {
        const response = await route.fetch();
        const index = await response.json();
        if (serveStale) {
          staleRequests++;
          await route.fulfill({
            response,
            json: { ...index, [mismatch]: mismatch === 'buildId' ? 'another-build' : -1 },
          });
        } else {
          freshRequests++;
          await route.fulfill({ response, json: index });
        }
      });
      const workerStarted = page.waitForEvent('worker');
      await page.goto(`${BASE}/${portuguese!.pathPrefix}/search/?q=p_012`);
      await workerStarted;
      await expect(page.getByRole('main').getByRole('alert')).toContainText(message('pt-BR', 'search.error.stale'));
      expect(staleRequests).toBeGreaterThan(0);
      serveStale = false;
      const replacementWorker = page.waitForEvent('worker');
      await page.getByRole('button', { name: message('pt-BR', 'search.error.reload'), exact: true }).click();
      await replacementWorker;
      const detail = promptDetail('pt-BR', 'p_012');
      const result = page.locator(`[data-group="prompt"] li a[href="${BASE}${detail.path}"]`);
      await expect(result).toContainText(detail.title);
      await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
      await expect(page.locator('#search-field')).toHaveValue('p_012');
      await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
      expect(new URL(page.url()).searchParams.get('q')).toBe('p_012');
      expect(freshRequests).toBeGreaterThan(0);
    });
  }
});
