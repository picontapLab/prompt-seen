'use client';

import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { paths } from '@/modules/url';
import { favoritesStore } from '@/state/favorites/store';
import buttonStyles from '@/ui/primitives/Button.module.css';
import styles from './FavoritesLink.module.css';

const count = () => favoritesStore.get().length;

/**
 * The header's way to the works saved on this device (§11.5): a plain link, icon and name, with
 * the number saved once the page has taken over (the server knows none, §3.4). The name stays
 * the link's accessible name on narrow screens, where only the icon shows.
 */
export function FavoritesLink({ locale }: { locale: string }) {
  const t = useTranslations('favorites');
  const format = useFormatter();
  const n = useSyncExternalStore(favoritesStore.subscribe, count, () => 0);
  return (
    <Link
      href={paths.favorites(locale)}
      prefetch={false}
      className={`${buttonStyles.button} ${buttonStyles.ghost} ${buttonStyles.link} ${styles.link}`}
      aria-label={t('linkCount', { count: n })}
      title={t('link')}
      data-favorites-link=""
    >
      <span className={buttonStyles.content}>
        <Heart aria-hidden="true" />
        <span className={styles.label} aria-hidden="true">
          {t('link')}
        </span>
        {n > 0 && (
          <span className={styles.count} aria-hidden="true" data-favorites-count="">
            {format.number(n)}
          </span>
        )}
      </span>
    </Link>
  );
}
