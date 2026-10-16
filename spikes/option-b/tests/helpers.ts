import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = '/prompt-seen';
export const ORIGIN = 'https://example.com';

type Prompt = { slug: string; locales: Record<string, { title: string }> };
export const PROMPTS: Prompt[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/prompts.json'), 'utf8'));
export const SLUGS = PROMPTS.map((p) => p.slug);

export const listUrl = (prefix = 'en') => `${BASE}/${prefix}/prompts/`;
export const detailUrl = (slug: string, prefix = 'en') => `${BASE}/${prefix}/prompts/${slug}/`;
export const titleOf = (slug: string, code = 'en') =>
  `${PROMPTS.find((p) => p.slug === slug)!.locales[code].title} | Prompt Seen`;

/** Everything a popup test asserts, read in one round trip. */
export function snapshot(page: Page) {
  return page.evaluate(() => {
    const dlg = document.querySelector<HTMLDialogElement>('dialog[data-testid="prompt-popup"]');
    const active = document.activeElement;
    return {
      path: location.pathname,
      nextPathname: document.querySelector('[data-testid="next-pathname"]')?.textContent ?? null,
      galleryMounted: !!document.querySelector('[data-gallery]'),
      dialogOpen: !!dlg?.open,
      bodySlug: dlg?.querySelector('[data-testid="detail-body"]')?.getAttribute('data-slug') ?? null,
      scrollLocked: getComputedStyle(document.documentElement).overflow === 'hidden',
      focusCard: active?.getAttribute('data-card-slug') ?? null,
      focusInDialog: !!active?.closest('dialog[open]'),
      title: document.title,
      historyLength: history.length,
      ourEntry: !!(history.state && '__promptSeenPopup' in history.state),
      docId: (window as unknown as { __docId?: string }).__docId ?? null,
    };
  });
}

/** Marks each document load so tests can tell soft navigations from full loads. */
export async function tagDocuments(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __docId: string }).__docId = Math.random().toString(36).slice(2);
  });
}

export async function gotoGallery(page: Page, prefix = 'en') {
  await page.goto(listUrl(prefix));
  await expect(page.locator('[data-gallery][data-hydrated="true"]')).toBeAttached();
}

export const card = (page: Page, slug: string) => page.locator(`[data-card-slug="${slug}"]`);

export async function expectPopupOpen(page: Page, slug: string, prefix = 'en', code = 'en') {
  await expect
    .poll(() => snapshot(page))
    .toMatchObject({
      path: detailUrl(slug, prefix),
      nextPathname: `/${prefix}/prompts/${slug}/`, // usePathname in sync, basePath stripped
      galleryMounted: true,
      dialogOpen: true,
      bodySlug: slug,
      scrollLocked: true,
      focusInDialog: true,
      title: titleOf(slug, code),
    });
}

export async function expectGalleryClosed(page: Page, focusSlug: string | null, prefix = 'en') {
  await expect
    .poll(() => snapshot(page))
    .toMatchObject({
      path: listUrl(prefix),
      nextPathname: `/${prefix}/prompts/`,
      galleryMounted: true,
      dialogOpen: false,
      scrollLocked: false,
      focusCard: focusSlug,
      title: 'Prompts | Prompt Seen',
    });
}

export function delayJson(page: Page, slug: string, ms: number) {
  return page.route(`**${BASE}/generated/*/prompts/${slug}.json`, async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}
