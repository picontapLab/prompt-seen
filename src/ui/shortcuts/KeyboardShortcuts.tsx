'use client';

import { Keyboard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { lazy, Suspense, useEffect, useState } from 'react';
import { preferencesStore } from '@/state/preferences/store';
import { Button } from '@/ui/primitives/Button';
import { isEditable, shortcutTarget, singleKeyAction } from './keys';
import styles from './Shortcuts.module.css';

const load = () => import('./ShortcutsDialog');
const ShortcutsDialog = lazy(load);

/**
 * The site's single-key shortcuts that act on a page (design doc §11.10): `C` copies the prompt
 * of the page or the open popup, `S` saves or removes it, `?` lists every shortcut. `/` and
 * ⌘K / Ctrl+K are the search launcher's, ← → the popup's. Keys press the page's own button
 * (`data-shortcut`), so feedback, announcements and the undo are the same as with a click. The
 * shortcuts list, with the switch that turns single keys off (WCAG 2.1.4), also opens from the
 * footer button, which keeps working when they are off. Mounted once by the shell.
 */
export function KeyboardShortcuts() {
  const t = useTranslations('shortcuts');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = singleKeyAction(e);
      if (!action || isEditable(e.target) || !preferencesStore.get().singleKeyShortcuts) return;
      if (action === 'help') {
        e.preventDefault();
        setMounted(true);
        setOpen(true);
        return;
      }
      const target = shortcutTarget(action);
      if (!target) return;
      e.preventDefault();
      // A click on the button itself: React Aria treats it as a (virtual) press.
      target.click();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        icon={<Keyboard aria-hidden="true" />}
        onPress={() => {
          setMounted(true);
          setOpen(true);
        }}
        onHoverStart={() => void load()}
        onFocus={() => void load()}
        aria-keyshortcuts="Shift+?"
        className={styles.open}
        data-shortcuts-open=""
      >
        {t('open')}
      </Button>
      {mounted && (
        <Suspense>
          <ShortcutsDialog isOpen={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
