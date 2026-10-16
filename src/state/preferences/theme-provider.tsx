'use client';

import { useCallback, useLayoutEffect, useSyncExternalStore } from 'react';
import { preferencesStore } from './store';
import { applyTheme, switchTheme, type ThemePreference } from './theme';

/**
 * Takes over the theme after hydration (design doc §11.6.3). The first-paint script has already
 * applied the stored choice; this keeps the document in step with the store from then on: a
 * change in this tab, in another tab, or React clearing <html> attributes when it remounts the
 * root (Strict Mode in development). It reads the store directly, never the hydration snapshot,
 * so hydration cannot briefly undo the stored theme.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    applyTheme(preferencesStore.get().theme);
    return preferencesStore.subscribe(() => applyTheme(preferencesStore.get().theme));
  }, []);
  return children;
}

/**
 * The stored theme preference and a setter. Renders 'system' on the server and during
 * hydration, then the stored value: controls showing the choice update right after hydration,
 * without a mismatch. Visual differences that must be right at first paint belong in CSS
 * (`.when-dark`, `.when-light`), not in this value.
 */
export function useThemePreference(): [ThemePreference, (next: ThemePreference) => void] {
  const preference = useSyncExternalStore(
    preferencesStore.subscribe,
    () => preferencesStore.get().theme,
    () => preferencesStore.getServerSnapshot().theme,
  );
  const set = useCallback((next: ThemePreference) => {
    switchTheme(next);
    preferencesStore.set({ theme: next });
  }, []);
  return [preference, set];
}
