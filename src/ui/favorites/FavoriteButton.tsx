'use client';

import { Heart } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { favoritesStore, type FavoriteKind } from '@/state/favorites/store';
import { preferencesStore } from '@/state/preferences/store';
import copyStyles from '@/ui/feedback/CopyButton.module.css';
import { Button, IconButton } from '@/ui/primitives/Button';
import { announceFavorite } from './events';
import styles from './FavoriteButton.module.css';

export type FavoriteLabels = {
  save: string;
  saved: string;
  /** "Save (S)": the tooltip while single-key shortcuts are on (§11.10). */
  saveKey?: string;
};

export type FavoriteButtonProps = {
  id: string;
  kind: FavoriteKind;
  /** The work's title, for the removal toast ("Removed …"). */
  title: string;
  labels: FavoriteLabels;
  /**
   * icon: the card's corner button on the image (§11.8.2), round and translucent.
   * bar: a plain icon button among others, as in the mobile action bar (§11.8.3).
   * labelled: "Save" / "Saved" among the detail's secondary actions.
   */
  variant?: 'icon' | 'bar' | 'labelled';
  /** The button `S` presses on this page (§11.10); one per page or popup. */
  shortcut?: boolean;
  className?: string;
};

const noSubscription = () => () => {};

/**
 * Save or remove a work on this device (design doc §11.5, §11.1.7, §11.11 "Save / Saved"). A
 * toggle button: the server and hydration render it unpressed (§3.4), the stored state appears
 * right after. Pressing it updates every button for the same work at once, in this tab and the
 * others. Feedback stays on the control, except the one-time note and the undo, which the shell
 * shows as toasts (FavoritesFeedback). Inside a `[data-save-scope]`, a saved work's frame number
 * is circled (CircleMark).
 */
export function FavoriteButton({
  id,
  kind,
  title,
  labels,
  variant = 'icon',
  shortcut,
  className,
}: FavoriteButtonProps) {
  const saved = useSyncExternalStore(
    favoritesStore.subscribe,
    () => favoritesStore.has(id),
    () => false,
  );
  const singleKey = useSyncExternalStore(
    shortcut ? preferencesStore.subscribe : noSubscription,
    () => !!shortcut && preferencesStore.get().singleKeyShortcuts,
    () => false,
  );
  // Saved by this press, not loaded saved: only then does the circle draw in (CircleMark).
  const [fresh, setFresh] = useState(false);

  const toggle = () => {
    if (favoritesStore.has(id)) {
      const entry = favoritesStore.remove(id);
      setFresh(false);
      if (entry) announceFavorite({ type: 'removed', entry, title });
    } else {
      const entry = favoritesStore.add(id, kind);
      setFresh(true);
      if (entry) announceFavorite({ type: 'added', entry, title });
    }
  };

  const state = {
    'aria-pressed': saved,
    'data-saved': saved ? (fresh ? 'new' : '') : undefined,
    'data-favorite': id,
    'data-shortcut': shortcut ? 'save' : undefined,
    'aria-keyshortcuts': shortcut ? 'S' : undefined,
  } as const;
  const icon = <Heart aria-hidden="true" className={styles.heart} />;

  if (variant !== 'labelled')
    return (
      <IconButton
        {...state}
        icon={icon}
        label={labels.save}
        hint={singleKey && labels.saveKey ? labels.saveKey : undefined}
        onPress={toggle}
        className={[styles.button, variant === 'icon' && styles.icon, className].filter(Boolean).join(' ')}
      />
    );

  return (
    <span className={[copyStyles.wrap, className].filter(Boolean).join(' ')}>
      <Button {...state} variant="secondary" icon={icon} onPress={toggle} className={styles.button}>
        {/* Both labels share one cell, so the width holds (§11.9 按钮宽度稳定). */}
        <span className={copyStyles.labels}>
          <span aria-hidden={saved} data-active={!saved}>
            {labels.save}
          </span>
          <span aria-hidden={!saved} data-active={saved}>
            {labels.saved}
          </span>
        </span>
      </Button>
    </span>
  );
}
