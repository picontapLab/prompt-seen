// Theme preference (design doc §11.6.3, §11.9): system (default), light or dark.
//
// Ownership of the root element: `data-theme` on <html> exists only for an explicit choice and
// is written by two parties with the same rules, the first-paint script (themeInitScript, before
// any CSS paints) and applyTheme (after hydration and on every change). React never renders the
// attribute. The browser chrome colour follows through a theme-color <meta> without a media
// query, placed first in <head> so it wins over the per-system ones from the viewport metadata.

import { duration } from '@/styles/tokens/motion';
import { themeColor } from '@/styles/tokens/theme-color';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = 'light' | 'dark';

export const THEME_ATTRIBUTE = 'data-theme';
/** Marks the theme-color <meta> written for an explicit choice. */
export const THEME_COLOR_OVERRIDE = 'data-theme-override';
const SWITCHING_ATTRIBUTE = 'data-theme-switching';

/**
 * The override's colour, written as rgb() on purpose. React hydrates the <meta> elements of
 * <head> by their content: with the same "#edece8" as the viewport's light theme-color, React
 * would adopt the script-inserted override as its own node, and removing the override later
 * breaks the next client navigation ("removeChild" of null).
 */
export const themeColorOverride = Object.fromEntries(
  Object.entries(themeColor).map(([theme, hex]) => {
    const n = parseInt(hex.slice(1), 16);
    return [theme, `rgb(${n >> 16} ${(n >> 8) & 255} ${n & 255})`];
  }),
) as Record<ResolvedTheme, string>;

export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);

export function resolveTheme(preference: ThemePreference, win: Window = window): ResolvedTheme {
  if (preference !== 'system') return preference;
  return win.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Puts the document in the state the first-paint script would produce for this preference. */
export function applyTheme(preference: ThemePreference, doc: Document = document): void {
  const root = doc.documentElement;
  let meta = doc.head.querySelector<HTMLMetaElement>(`meta[name="theme-color"][${THEME_COLOR_OVERRIDE}]`);
  if (preference === 'system') {
    root.removeAttribute(THEME_ATTRIBUTE);
    meta?.remove();
    return;
  }
  root.setAttribute(THEME_ATTRIBUTE, preference);
  if (!meta) {
    meta = doc.createElement('meta');
    meta.name = 'theme-color';
    meta.setAttribute(THEME_COLOR_OVERRIDE, '');
    doc.head.insertBefore(meta, doc.head.firstChild);
  }
  meta.content = themeColorOverride[preference];
}

let switchingTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Applies a theme the user just chose. Only colours transition, briefly; with reduced motion the
 * switch is immediate (§11.6.3). Focus, scroll and form state are untouched: nothing re-renders.
 */
export function switchTheme(preference: ThemePreference, doc: Document = document): void {
  const root = doc.documentElement;
  const win = doc.defaultView;
  const reduced =
    !win || win.matchMedia('(prefers-reduced-motion: reduce)').matches || !!root.closest('[data-motion="reduce"]');
  if (!reduced) {
    root.setAttribute(SWITCHING_ATTRIBUTE, '');
    clearTimeout(switchingTimer);
    switchingTimer = setTimeout(() => root.removeAttribute(SWITCHING_ATTRIBUTE), duration.content + 60);
  }
  applyTheme(preference, doc);
}

/**
 * The inline script that runs in <head> before first paint (§11.6.3): reads the stored choice and
 * applies it exactly like applyTheme. Plain ES5 with every failure swallowed, so a blocked or
 * corrupt storage leaves the system theme. Static export cannot use CSP nonces; Next.js already
 * emits inline scripts for its own data, so this adds no new CSP requirement (§15.4.3).
 */
export function themeInitScript(storageKey: string): string {
  const key = JSON.stringify(storageKey);
  const dark = JSON.stringify(themeColorOverride.dark);
  const light = JSON.stringify(themeColorOverride.light);
  return (
    `(function(){try{var d=document,r=d.documentElement,t;` +
    `try{t=JSON.parse(localStorage.getItem(${key})||'{}').theme}catch(e){}` +
    `if(t==='light'||t==='dark'){r.setAttribute('${THEME_ATTRIBUTE}',t);` +
    `var m=d.createElement('meta');m.name='theme-color';m.content=t==='dark'?${dark}:${light};` +
    `m.setAttribute('${THEME_COLOR_OVERRIDE}','');d.head.insertBefore(m,d.head.firstChild)}}catch(e){}})();`
  );
}
