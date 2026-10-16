'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/ui/primitives/Dialog';
import LanguageCombobox from './LanguageCombobox';
import type { MenuLink } from './MobileMenu';
import styles from './Shell.module.css';
import { ThemeChooser } from './ThemeSwitch';

/** The narrow-screen menu sheet; loaded the first time the menu opens (MobileMenu). */
export default function MenuSheet({
  links,
  isOpen,
  onOpenChange,
}: {
  links: readonly MenuLink[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('shell');
  return (
    <Dialog variant="sheet" title={t('menu.title')} isOpen={isOpen} onOpenChange={onOpenChange}>
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
            <span className={styles.menuLabel} aria-hidden="true">
              {t('language.label')}
            </span>
            <LanguageCombobox quiet={false} />
          </div>
          <ThemeChooser />
        </div>
      )}
    </Dialog>
  );
}
