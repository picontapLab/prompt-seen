'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { CopyButton, type CopyButtonProps } from '@/ui/feedback/CopyButton';
import { ShareButton } from '@/ui/feedback/ShareButton';
import styles from './MobileActionBar.module.css';

/**
 * The bottom action bar on narrow screens (design doc §11.8.3): copy as the primary action plus
 * share, so the prompt can be copied from anywhere on the page. It steps aside while the sheet's
 * own copy button is on screen, so two identical buttons never show at once. It renders hidden
 * and appears only once JavaScript runs, because its buttons need it.
 */
export function MobileActionBar({
  copyText,
  copyBlocked,
  onCopied,
  sheetCopyId,
  shareUrl,
  title,
  favorite,
}: {
  /** A function is read at the moment of the press, as the sheet's own button does (§11.6.4). */
  copyText: string | (() => string);
  /** A template with fields still to fill: the button says so instead of copying (§11.4). */
  copyBlocked?: CopyButtonProps['blocked'];
  onCopied?: () => void;
  /** Id of the sheet's copy button. */
  sheetCopyId: string;
  shareUrl: string;
  title: string;
  /** The save button as an icon (§11.8.3: copy, save and share). */
  favorite?: ReactNode;
}) {
  const t = useTranslations('detail');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(sheetCopyId);
    if (!target || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setVisible(!entry!.isIntersecting), { threshold: 0 });
    io.observe(target);
    return () => io.disconnect();
  }, [sheetCopyId]);

  return (
    <div
      className={styles.bar}
      data-visible={visible || undefined}
      role="group"
      aria-label={t('actions.label')}
      inert={!visible}
    >
      <CopyButton
        text={copyText}
        size="lg"
        className={styles.copy}
        blocked={copyBlocked}
        onResult={(state) => state === 'done' && onCopied?.()}
        labels={{
          copy: t('copy.label'),
          done: t('copy.done'),
          failed: t('copy.failed'),
          failedHint: t('copy.failedHint'),
        }}
      />
      {favorite}
      <ShareButton
        iconOnly
        url={shareUrl}
        title={title}
        labels={{ share: t('share.label'), copied: t('share.copied'), failed: t('share.failed') }}
      />
    </div>
  );
}
