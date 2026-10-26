// History entries of the detail popup (design doc §11.3.1, §11.6.1). The address is the one
// source of truth: the popup is open when the current path is a Prompt detail address of the
// gallery's locale while the gallery is mounted. Entries the site writes carry a mark in
// history.state, so Close knows whether one Back returns to the gallery.
//
// Next.js 16.4 patches history.pushState and replaceState: it copies its own fields (`__NA`,
// the router tree) into the state given and syncs usePathname, and restores the gallery from
// them on popstate. Those fields are framework internals; the popup regression tests
// (tests/e2e/popup.browser.spec.ts) guard them across Next.js upgrades.
//
// Browser-only functions; no 'use client' so pure helpers stay importable from anywhere.

export const POPUP_KEY = 'promptSeenPopup';

export type PopupMark = { slug: string };

type State = Record<string, unknown> | null;

function currentState(): State {
  const s: unknown = window.history.state;
  return s && typeof s === 'object' ? (s as Record<string, unknown>) : null;
}

export function popupMark(state: unknown = window.history.state): PopupMark | null {
  if (!state || typeof state !== 'object') return null;
  const mark = (state as Record<string, unknown>)[POPUP_KEY];
  return mark && typeof mark === 'object' && typeof (mark as PopupMark).slug === 'string' ? (mark as PopupMark) : null;
}

/** The current entry was written by the popup: Close can go back to the gallery. */
export const isPopupEntry = (state: unknown = window.history.state) => popupMark(state) !== null;

/**
 * Site state of the current entry worth keeping when it is replaced: the popup mark and the
 * list's return snapshot (`feed`, Feed.tsx). Next.js adds its own fields again itself.
 */
export function siteState(state: State = currentState()): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (state && POPUP_KEY in state) out[POPUP_KEY] = state[POPUP_KEY];
  if (state && 'feed' in state) out.feed = state.feed;
  return out;
}

/**
 * A card click (§11.3.1): a new entry at the detail address, or, when the current entry is
 * already the popup's (a second click before the first settled, a related prompt), a
 * replacement, so the latest navigation wins and one Back still returns to the gallery.
 */
export function pushPopupEntry(url: string, slug: string): void {
  const mark = { [POPUP_KEY]: { slug } satisfies PopupMark };
  if (isPopupEntry()) window.history.replaceState({ ...siteState(), ...mark }, '', url);
  else window.history.pushState(mark, '', url);
}

/** Previous / next in the popup: replaces the entry, never adds one (§11.3). */
export function replacePopupEntry(url: string, slug: string): void {
  const state = siteState();
  if (isPopupEntry()) state[POPUP_KEY] = { slug } satisfies PopupMark;
  window.history.replaceState(state, '', url);
}

/** Leaves an entry the popup did not write (opened by someone else's pushState) for the gallery. */
export function replaceWithGallery(url: string): void {
  const { feed } = siteState();
  window.history.replaceState(feed ? { feed } : null, '', url);
}

// --- The address as an external store --------------------------------------------------------
// usePathname follows pushState in a transition, a beat after the click; the popup reads
// location.pathname directly so a click can open the dialog synchronously (flushSync), and an
// Esc pressed right after the click reaches an open dialog (§11.3.1).

const listeners = new Set<() => void>();

export function subscribeLocation(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

export const readPathname = () => window.location.pathname;

/** Call after writing history yourself; popstate notifies on its own. */
export function notifyLocation(): void {
  for (const l of listeners) l();
}
