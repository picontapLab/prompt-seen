import type { Favorite } from '@/state/favorites/store';

// What happened when a save button was pressed, for feedback shown elsewhere than the button
// (design doc §11.5, §11.1.7): the one-time "saved on this device" note and the undo of a
// removal, both toasts shown by FavoritesFeedback in the shell. The favourites page handles
// removals itself (the card stays in place, faded, with its own undo), so it claims them.

export type FavoriteChange = { type: 'added' | 'removed'; entry: Favorite; title: string };

type Listener = (change: FavoriteChange) => void;
const listeners = new Set<Listener>();
let inlineRemovals = 0;

export function announceFavorite(change: FavoriteChange): void {
  for (const l of listeners) l(change);
}

export function onFavoriteChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** While a page shows removals in place, the shell offers no undo toast. Returns the release. */
export function handleRemovalsInline(): () => void {
  inlineRemovals += 1;
  return () => void (inlineRemovals -= 1);
}

export const removalsHandledInline = () => inlineRemovals > 0;
