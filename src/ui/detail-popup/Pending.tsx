'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { FeedCard } from '@/modules/feed/types';
import { getImage } from '@/modules/media';
import { Button } from '@/ui/primitives/Button';
import styles from './DetailPopup.module.css';

/**
 * Until the model is there: the frame the visitor clicked, its title and a status line (§11.3.2).
 * Shared by the popup and by PopupHost's stand-in dialog, so the two look the same while either
 * waits.
 */
export function Pending({
  card,
  titleId,
  failed,
  fullPage,
  onRetry,
}: {
  card: FeedCard | null;
  titleId: string;
  failed: boolean;
  fullPage: string;
  onRetry: () => void;
}) {
  const t = useTranslations('popup');
  const img = card ? getImage(card.cover, 'card') : null;
  return (
    <div className={styles.pending}>
      {card && img && (
        <span
          className={styles.pendingFrame}
          style={{ '--w': card.cover.width, '--h': card.cover.height, background: img.placeholder } as CSSProperties}
        >
          <img src={img.src} srcSet={img.srcSet} sizes="(min-width: 1024px) 58vw, 100vw" alt={img.alt} />
        </span>
      )}
      <div className={styles.pendingText}>
        <h2 id={titleId} className={styles.pendingTitle}>
          {card?.title ?? t('loading')}
        </h2>
        {failed ? (
          <div role="alert" className={styles.pendingStatus}>
            <p>{t('failed')}</p>
            <p className={styles.pendingActions}>
              <Button variant="secondary" onPress={onRetry}>
                {t('retry')}
              </Button>
              <a href={fullPage}>{t('openFull')}</a>
            </p>
          </div>
        ) : (
          <p role="status" className={`${styles.pendingStatus} after-delay`}>
            {t('loading')}
          </p>
        )}
      </div>
    </div>
  );
}
