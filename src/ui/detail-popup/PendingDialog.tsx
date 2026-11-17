'use client';

import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from 'react';
import type { FeedCard } from '@/modules/feed/types';
import { paths, stripBasePath, withBasePath } from '@/modules/url';
import { IconButton } from '@/ui/primitives/Button';
import type { PopupLocale, PopupOrigin } from './DetailPopup';
import { isPopupEntry, notifyLocation, readPathname, replaceWithGallery, subscribeLocation } from './history';
import { matchPromptPath } from './logic';
import { Pending } from './Pending';
import styles from './DetailPopup.module.css';

// The popup's stand-in while its code loads (design doc §11.3.1, §12.8-3, §12.8-5, §16.1).
// PopupHost loads DetailPopup after hydration; a click that arrives before it opens this dialog
// in the same commit, with the frame, title and status line the popup shows while its data loads.
// It handles leaving by itself: Close, Esc and the scrim go Back (or replace an entry the popup
// did not write), and Back closes it and returns focus to the card. Once the code is here,
// DetailPopup takes over in one commit (PopupHost), except while a Back is under way.

/** What PopupHost needs to know to hand over: open, or open and on its way out. */
export type PendingState = 'closed' | 'open' | 'leaving';

const serverPath = () => null;

export function PendingDialog({
  locale,
  items,
  getOrigin,
  galleryUrlRef,
  failed,
  onRetry,
  onState,
}: {
  locale: PopupLocale;
  items: readonly FeedCard[];
  getOrigin: () => PopupOrigin | null;
  /** Shared with DetailPopup so loading its code cannot lose the return address. */
  galleryUrlRef: RefObject<string>;
  /** The popup's code could not be loaded. */
  failed: boolean;
  onRetry: () => void;
  onState: (state: PendingState) => void;
}) {
  const t = useTranslations('popup');
  const titleId = useId();
  const prefix = locale.pathPrefix;
  const pathname = useSyncExternalStore(subscribeLocation, readPathname, serverPath);
  // Someone else's pushState reaches us only through Next.js's usePathname sync.
  const nextPathname = usePathname();
  useEffect(() => notifyLocation(), [nextPathname]);
  const slug = matchPromptPath(pathname === null ? null : stripBasePath(pathname), prefix);
  const card = slug ? (items.find((c) => c.slug === slug) ?? null) : null;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const shown = useRef(false);
  const leaving = useRef(false);

  // A foreign pushState can arrive before a render's passive effects. Never save its
  // detail address as the gallery to return to when closing the stand-in dialog.
  useLayoutEffect(() => {
    const currentPathname = window.location.pathname;
    if (!matchPromptPath(stripBasePath(currentPathname), prefix)) {
      galleryUrlRef.current = currentPathname + window.location.search + window.location.hash;
    }
  }, [galleryUrlRef, pathname, prefix]);

  // Open and close follow the address in the same commit, so an Esc right after the click reaches
  // an open dialog (§12.8-3).
  useLayoutEffect(() => {
    const dlg = dialogRef.current!;
    if (slug && !shown.current) {
      shown.current = true;
      document.documentElement.dataset.popupOpen = '';
      if (!dlg.open) dlg.showModal();
      dlg.querySelector<HTMLElement>('[data-popup-close]')?.focus();
      onState('open');
    } else if (!slug && shown.current) {
      shown.current = false;
      leaving.current = false;
      if (dlg.open) dlg.close();
      delete document.documentElement.dataset.popupOpen;
      const link = getOrigin()?.link;
      if (link?.isConnected) {
        link.focus({ preventScroll: true });
        requestAnimationFrame(() => link.scrollIntoView({ block: 'nearest' }));
      }
      onState('closed');
    }
  }, [slug, getOrigin, onState]);

  // Unmounted while open: DetailPopup takes over in this commit, or the gallery is leaving.
  useLayoutEffect(() => {
    const dlg = dialogRef.current!;
    return () => {
      if (!shown.current) return;
      shown.current = false; // the `close` event that follows is not a request to leave
      if (dlg.open) dlg.close();
      delete document.documentElement.dataset.popupOpen;
    };
  }, []);

  /** Close, Esc and the scrim: once, even when Esc is pressed again before Back has landed. */
  const leave = () => {
    if (!shown.current || leaving.current) return;
    leaving.current = true;
    onState('leaving');
    if (isPopupEntry()) window.history.back();
    else {
      replaceWithGallery(galleryUrlRef.current || withBasePath(paths.prompts(prefix)));
      notifyLocation();
    }
  };
  const downTarget = useRef<EventTarget | null>(null);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={slug ? titleId : undefined}
      data-popup=""
      data-popup-slug={slug ?? undefined}
      onCancel={(e) => {
        e.preventDefault();
        leave();
      }}
      onClose={(event) => {
        // A queued close event can arrive after Forward reopens this same dialog. Only
        // a dialog still closed by the browser (including repeated Esc) should leave.
        if (!event.currentTarget.open) leave();
      }}
      onPointerDown={(e) => (downTarget.current = e.target)}
      onClick={(e) => {
        if (e.target === e.currentTarget && downTarget.current === e.currentTarget) leave();
      }}
    >
      {slug && (
        <div className={styles.panel} lang={locale.htmlLang}>
          <div className={styles.bar}>
            <p className={styles.barTitle}>{card?.title ?? t('loading')}</p>
            <IconButton
              variant="ghost"
              tooltip={false}
              className={styles.close}
              data-popup-close=""
              icon={<X aria-hidden="true" />}
              label={t('close')}
              onPress={leave}
            />
          </div>
          <div className={styles.body}>
            <Pending
              card={card}
              titleId={titleId}
              failed={failed}
              fullPage={withBasePath(paths.prompt(prefix, slug))}
              onRetry={onRetry}
            />
          </div>
        </div>
      )}
    </dialog>
  );
}
