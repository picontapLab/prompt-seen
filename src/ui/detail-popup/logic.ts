// Pure parts of the detail popup, unit-tested in logic.test.ts.
import type { LocaleEntry } from '@/config';
import { paths } from '@/modules/url';

/**
 * The slug of a Prompt detail address in the locale with URL prefix `prefix`, or null. `path`
 * is internal (base path removed). The page address round-trips through `paths.prompt`, so the
 * popup recognises exactly the addresses the site builds.
 */
export function matchPromptPath(path: string | null, prefix: string): string | null {
  if (!path) return null;
  const m = /^\/([^/]+)\/prompts\/([^/]+)\/$/.exec(path);
  if (!m || m[1] !== prefix || m[2] === 'page') return null;
  let slug: string;
  try {
    slug = decodeURIComponent(m[2]!);
  } catch {
    return null;
  }
  return paths.prompt(prefix, slug) === path ? slug : null;
}

/** A click the popup may take over: the primary button with no modifier (§11.3.1). */
export function isPlainClick(e: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}): boolean {
  return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export type Box = { left: number; top: number; width: number; height: number };

/**
 * The transform that puts an element laid out at `to` over `from` (FLIP, §12.6), with
 * `transform-origin: 0 0`. Both boxes come from the same image at its original ratio, so the
 * two scales are nearly equal and the picture is not distorted.
 */
export function flipTransform(from: Box, to: Box): string {
  const sx = to.width ? from.width / to.width : 1;
  const sy = to.height ? from.height / to.height : 1;
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})`;
}

/** A box worth flying from: on screen, not collapsed (a card scrolled away or skipped). */
export function isVisibleBox(b: Box, viewport: { width: number; height: number }): boolean {
  return (
    b.width > 4 &&
    b.height > 4 &&
    b.top < viewport.height &&
    b.top + b.height > 0 &&
    b.left < viewport.width &&
    b.left + b.width > 0
  );
}

/** System back gestures start this close to the screen edge; custom swipes do not (§11.3). */
export const EDGE_GUARD_PX = 20;

export type SwipeResult = 'next' | 'previous' | 'close' | null;

/**
 * What a finished one-finger swipe in the mobile popup asks for (§11.3): sideways switches
 * works in reading order (towards the inline start is "next": left in LTR, right in RTL), down
 * closes. A swipe counts when it travels far enough, or is fast enough over a short distance,
 * and stays mostly on one axis.
 */
export function classifySwipe(s: {
  dx: number;
  dy: number;
  /** Milliseconds from touch start to end. */
  dt: number;
  /** Width of the viewport, for the distance threshold. */
  width: number;
  rtl: boolean;
  /** Down-swipes close only when the popup was scrolled to the top at touch start. */
  atTop: boolean;
}): SwipeResult {
  const { dx, dy, rtl, atTop } = s;
  const dt = Math.max(s.dt, 1);
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax > ay * 1.5) {
    const far = ax >= Math.max(60, s.width * 0.18);
    const fast = ax >= 24 && ax / dt >= 0.5;
    if (!far && !fast) return null;
    const towardsStart = rtl ? dx > 0 : dx < 0;
    return towardsStart ? 'next' : 'previous';
  }
  if (dy > 0 && ay > ax * 1.5 && atTop) {
    const far = dy >= 120;
    const fast = dy >= 32 && dy / dt >= 0.6;
    return far || fast ? 'close' : null;
  }
  return null;
}

/** Unique works in reading order: an editorial feature row repeats its work (§11.8.2). */
export function uniqueBySlug<T extends { slug: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((x) => (seen.has(x.slug) ? false : (seen.add(x.slug), true)));
}

/** The part of a locale entry the popup needs, as plain data for the browser. */
export const popupLocale = (l: Pick<LocaleEntry, 'code' | 'pathPrefix' | 'htmlLang' | 'direction'>) => ({
  code: l.code,
  pathPrefix: l.pathPrefix,
  htmlLang: l.htmlLang,
  direction: l.direction,
});
