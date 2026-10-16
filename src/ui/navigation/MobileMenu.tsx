'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Dialog, IconButton } from '@/ui/primitives';
import { LanguageSwitch } from './LanguageSwitch';
import styles from './Shell.module.css';
import { ThemeChooser } from './ThemeSwitch';

export type MenuLink = { key: string; href: string; label: string };

/**
 * Menu for narrow screens (§11.2, §11.8.2): the sections, language and theme in a side sheet.
 * Footer links are repeated here so they stay reachable above an endless list.
 */
export function MobileMenu({ links }: { links: readonly MenuLink[] }) {
  const t = useTranslations('shell');
  return (
    <Dialog
      variant="sheet"
      title={t('menu.title')}
      trigger={<IconButton variant="ghost" tooltip={false} icon={<Menu aria-hidden="true" />} label={t('menu.open')} />}
    >
      {(close) => (
        <div className={styles.menuBody}>
          {links.length > 0 && (
            <nav aria-label={t('nav.label')}>
              <ul className={styles.menuLinks}>
                {links.map((l) => (
                  <li key={l.key}>
                    <Link href={l.href} onClick={close}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div className={styles.menuGroup}>
            <span className={styles.menuLabel}>{t('language.label')}</span>
            <LanguageSwitch quiet={false} />
          </div>
          <ThemeChooser />
        </div>
      )}
    </Dialog>
  );
}
