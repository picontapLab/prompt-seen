'use client';

import { useTranslations } from 'next-intl';
import { useId, useSyncExternalStore } from 'react';
import { DEFAULT_PREFERENCES, preferencesStore } from '@/state/preferences/store';
import { Dialog } from '@/ui/primitives/Dialog';
import styles from './Shortcuts.module.css';

type Row = { keys: string[][]; action: string; scope: string; single: boolean };

/** Keys as the table shows them; each inner list is one combination ("⌘K"), alternatives apart. */
const ROWS: Row[] = [
  { keys: [['/']], action: 'search', scope: 'everywhere', single: true },
  {
    keys: [
      ['⌘', 'K'],
      ['Ctrl', 'K'],
    ],
    action: 'search',
    scope: 'everywhere',
    single: false,
  },
  { keys: [['←'], ['→']], action: 'step', scope: 'popup', single: false },
  { keys: [['Esc']], action: 'close', scope: 'panels', single: false },
  { keys: [['C']], action: 'copy', scope: 'copy', single: true },
  { keys: [['S']], action: 'save', scope: 'save', single: true },
  { keys: [['?']], action: 'help', scope: 'everywhere', single: true },
];

/**
 * The list of keyboard shortcuts (design doc §11.10) and the switch for single-key ones (WCAG
 * 2.1.4 Character Key Shortcuts): off, `/`, `C`, `S` and `?` do nothing, while ⌘K / Ctrl+K,
 * the arrows and Esc keep working. The choice is a device preference (§11.9 记住偏好). Loaded the
 * first time the list opens (KeyboardShortcuts), so pages do not carry it (§16.4).
 */
export default function ShortcutsDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('shortcuts');
  const id = useId();
  const singleKey = useSyncExternalStore(
    preferencesStore.subscribe,
    () => preferencesStore.get().singleKeyShortcuts,
    () => DEFAULT_PREFERENCES.singleKeyShortcuts,
  );

  return (
    <Dialog title={t('title')} isOpen={isOpen} onOpenChange={onOpenChange} className={styles.dialog}>
      <div className={styles.body}>
        <div className={styles.switch}>
          <input
            id={`${id}-single`}
            type="checkbox"
            checked={singleKey}
            onChange={(e) => preferencesStore.set({ singleKeyShortcuts: e.target.checked })}
            aria-describedby={`${id}-single-help`}
            data-single-key-switch=""
          />
          <label htmlFor={`${id}-single`}>{t('single')}</label>
          <p id={`${id}-single-help`} className={styles.help}>
            {t('singleHelp')}
          </p>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{t('key')}</th>
              <th scope="col">{t('action')}</th>
              <th scope="col">{t('where')}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.keys.flat().join('')} data-off={(row.single && !singleKey) || undefined}>
                <td className={styles.keys}>
                  {row.keys.map((combo, i) => (
                    <span key={combo.join('+')}>
                      {i > 0 && <span className={styles.or}> {t('or')} </span>}
                      {combo.map((k) => (
                        <kbd key={k}>{k}</kbd>
                      ))}
                    </span>
                  ))}
                </td>
                <td>{t(`actions.${row.action}`)}</td>
                <td className={styles.scope}>{t(`scopes.${row.scope}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}
