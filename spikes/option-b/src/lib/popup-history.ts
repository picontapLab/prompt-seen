'use client';
// URL is the single source of truth for the popup (design doc §11.6.1).
// Next.js patches history.pushState/replaceState so usePathname follows them;
// this store additionally lets a click handler re-render synchronously.
import type { PromptDetail } from './content';
import { popupJsonPath, stripBasePath, withBasePath } from './site.mjs';

export const POPUP_STATE_KEY = '__promptSeenPopup';

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeLocation(listener: Listener) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

export function getLocationPath() {
  return stripBasePath(window.location.pathname);
}

export function notifyLocation() {
  for (const l of listeners) l();
}

export function isOurPopupEntry(state: unknown = window.history.state) {
  return !!state && typeof state === 'object' && POPUP_STATE_KEY in state;
}

const tag = (slug: string) => ({ [POPUP_STATE_KEY]: { slug } });

/**
 * Card click. If the current entry is already ours (a second click landed before
 * the first settled), replace it: the latest valid navigation wins and one Back
 * still returns to the gallery.
 */
export function openPopupEntry(url: string, slug: string) {
  if (isOurPopupEntry()) window.history.replaceState(tag(slug), '', url);
  else window.history.pushState(tag(slug), '', url);
}

/** Prev/next inside the popup: never adds history entries. */
export function replacePopupEntry(url: string, slug: string) {
  window.history.replaceState(isOurPopupEntry() ? tag(slug) : null, '', url);
}

const cache = new Map<string, Promise<PromptDetail>>();

export function loadPopupDetail(prefix: string, slug: string): Promise<PromptDetail> {
  const key = `${prefix}/${slug}`;
  let p = cache.get(key);
  if (!p) {
    p = fetch(withBasePath(popupJsonPath(prefix, slug))).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<PromptDetail>;
    });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}
