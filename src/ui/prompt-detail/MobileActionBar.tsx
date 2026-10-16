'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/ui/feedback/CopyButton';
import { ShareButton } from '@/ui/feedback/ShareButton';
import styles from './MobileActionBar.module.css';

/**
 * The bottom action bar on narrow screens (design doc §11.8.3): copy as the primary action plus
 * share, so the prompt can be copied from anywhere on the page. It steps aside while the sheet's
 * own copy button is on screen, so two identical buttons never show at once. It renders hidden
 * and appears only once JavaScript runs, because its buttons need it. Saving arrives in step 4c.
 */
export function MobileActionBar({
  copyText,
  sheetCopyId,
  shareUrl,
  title,
}: {
  copyText: string;
  /** Id of the sheet's copy button. */
  sheetCopyId: string;
  shareUrl: string;
  title: string;
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
        labels={{
          copy: t('copy.label'),
          done: t('copy.done'),
          failed: t('copy.failed'),
          failedHint: t('copy.failedHint'),
        }}
      />
      <ShareButton
        iconOnly
        url={shareUrl}
        title={title}
        labels={{ share: t('share.label'), copied: t('share.copied'), failed: t('share.failed') }}
      />
    </div>
  );
}
