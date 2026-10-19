'use client';

import { useSyncExternalStore } from 'react';
import type { GoneReason as Reason } from '@/modules/content/types';
import { stripBasePath } from '@/modules/url';
import styles from './Pages.module.css';

const noChange = () => () => {};

/**
 * Why the requested address is gone (design doc §11.8.7 410): the host serves one 410 page per
 * language for every removed address, so the page carries its language's short list and picks
 * the reason for the address in the location bar after hydration.
 */
export function GoneReason({ reasons, labels }: { reasons: Record<string, Reason>; labels: Record<Reason, string> }) {
  // null on the server and during hydration: the first output is the same for every address.
  const pathname = useSyncExternalStore(
    noChange,
    () => location.pathname,
    () => null,
  );
  const path = pathname && stripBasePath(pathname);
  const reason = (path && reasons[path.endsWith('/') ? path : `${path}/`]) || null;
  if (!reason) return null;
  return (
    <p className={styles.reason} data-gone-reason={reason}>
      {labels[reason]}
    </p>
  );
}
