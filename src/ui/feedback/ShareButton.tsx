'use client';

import { Check, Share2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, IconButton } from '@/ui/primitives/Button';
import { COPY_FEEDBACK_MS, type CopyState } from './CopyButton';
import { writeClipboard } from './copy';
import styles from './CopyButton.module.css';

export type ShareButtonProps = {
  /** The page's canonical address in the current language (§11.7 "分享"). */
  url: string;
  title: string;
  labels: { share: string; copied: string; failed: string };
  /** Icon only, for the mobile action bar (§11.8.3). */
  iconOnly?: boolean;
};

/**
 * Share (§11.7): on touch devices with a share sheet, the system sheet; elsewhere the link is
 * copied, with feedback in place. Dismissing the share sheet is not an error.
 */
export function ShareButton({ url, title, labels, iconOnly }: ShareButtonProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function share() {
    clearTimeout(timer.current);
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    const ok = await writeClipboard(url);
    setState(ok ? 'done' : 'failed');
    timer.current = setTimeout(() => setState('idle'), COPY_FEEDBACK_MS);
  }

  const icon = state === 'done' ? <Check /> : state === 'failed' ? <X /> : <Share2 />;
  const status = (
    <span role="status" className="visually-hidden">
      {state === 'done' ? labels.copied : state === 'failed' ? labels.failed : ''}
    </span>
  );
  if (iconOnly)
    return (
      <>
        <IconButton icon={icon} label={labels.share} onPress={share} data-share-state={state} />
        {status}
      </>
    );
  return (
    <span className={styles.wrap}>
      <Button variant="secondary" icon={icon} onPress={share} data-share-state={state}>
        <span className={styles.labels}>
          <span aria-hidden={state !== 'idle'} data-active={state === 'idle'}>
            {labels.share}
          </span>
          <span aria-hidden={state !== 'done'} data-active={state === 'done'}>
            {labels.copied}
          </span>
          <span aria-hidden={state !== 'failed'} data-active={state === 'failed'}>
            {labels.failed}
          </span>
        </span>
      </Button>
      {status}
    </span>
  );
}
