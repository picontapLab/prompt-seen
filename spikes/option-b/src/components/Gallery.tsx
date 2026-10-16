'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import type { CardModel, PromptDetail } from '@/lib/content';
import {
  getLocationPath,
  isOurPopupEntry,
  loadPopupDetail,
  notifyLocation,
  openPopupEntry,
  replacePopupEntry,
  subscribeLocation,
} from '@/lib/popup-history';
import { SITE_NAME, detailPath, listPath, matchDetailPath, withBasePath } from '@/lib/site.mjs';
import { PromptDetailBody } from './PromptDetailBody';

export function Gallery({ prefix, cards }: { prefix: string; cards: CardModel[] }) {
  const nextPathname = usePathname();
  const livePath = useSyncExternalStore(subscribeLocation, getLocationPath, () => listPath(prefix));
  // Foreign pushState calls only reach us through Next's usePathname sync.
  useEffect(() => notifyLocation(), [nextPathname]);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Popup open state = current path is a detail URL of this gallery's locale,
  // and the gallery is mounted (this component exists).
  const match = matchDetailPath(livePath);
  const openSlug =
    match && match.prefix === prefix && cards.some((c) => c.slug === match.slug) ? match.slug : null;

  const onCardClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openPopupEntry(withBasePath(detailPath(prefix, slug)), slug);
    // Commit the open dialog before this event returns, so an immediate Esc reaches it.
    flushSync(notifyLocation);
  };
  const prefetch = (slug: string) => void loadPopupDetail(prefix, slug).catch(() => {});

  return (
    <div data-gallery data-hydrated={hydrated ? 'true' : 'false'}>
      <span hidden data-testid="next-pathname">
        {nextPathname}
      </span>
      <ul className="grid">
        {cards.map((c, i) => (
          <li key={c.slug}>
            <a
              className="card"
              href={withBasePath(detailPath(prefix, c.slug))}
              data-card-slug={c.slug}
              data-index={i}
              onClick={(e) => onCardClick(e, c.slug)}
              onPointerEnter={() => prefetch(c.slug)}
              onFocus={() => prefetch(c.slug)}
            >
              <div className="art" style={{ background: `hsl(${c.hue} 55% 50%)` }} />
              <span>{c.title}</span>
            </a>
          </li>
        ))}
      </ul>
      <PromptPopup prefix={prefix} cards={cards} openSlug={openSlug} />
    </div>
  );
}

function PromptPopup({ prefix, cards, openSlug }: { prefix: string; cards: CardModel[]; openSlug: string | null }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shownRef = useRef(false);
  const openSlugRef = useRef<string | null>(null);
  const lastViewedRef = useRef<string | null>(null);
  const savedTitleRef = useRef('');
  const closingRef = useRef(false);
  const [detail, setDetail] = useState<PromptDetail | null>(null);
  const [failed, setFailed] = useState(false);

  const index = openSlug ? cards.findIndex((c) => c.slug === openSlug) : -1;
  const card = index >= 0 ? cards[index] : null;

  const restore = useCallback(() => {
    shownRef.current = false;
    const dlg = dialogRef.current;
    if (dlg?.open) dlg.close();
    document.documentElement.classList.remove('ps-scroll-lock');
    document.title = savedTitleRef.current;
    // §11.3: focus (and scroll to) the last viewed card, not the one first opened.
    const slug = lastViewedRef.current;
    const el = slug ? document.querySelector<HTMLElement>(`[data-card-slug="${slug}"]`) : null;
    if (el) {
      el.focus({ preventScroll: true });
      // Chrome applies the entry's own scroll restoration right after popstate,
      // so a synchronous scroll here would be overwritten. Defer one frame.
      requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest' }));
    }
  }, []);

  // Reconcile the dialog with the URL in the same commit.
  useLayoutEffect(() => {
    openSlugRef.current = openSlug;
    closingRef.current = false;
    const dlg = dialogRef.current!;
    if (openSlug && card) {
      lastViewedRef.current = openSlug;
      if (!shownRef.current) {
        shownRef.current = true;
        savedTitleRef.current = document.title;
        document.documentElement.classList.add('ps-scroll-lock');
        if (!dlg.open) dlg.showModal();
      }
      document.title = `${card.title} | ${SITE_NAME}`;
    } else if (shownRef.current) {
      restore();
    }
  }, [openSlug, card, restore]);

  // Soft navigation away unmounts the gallery while the dialog may be open.
  useLayoutEffect(
    () => () => {
      document.documentElement.classList.remove('ps-scroll-lock');
      shownRef.current = false;
    },
    [],
  );

  // Data: ignore stale responses so the latest target wins.
  useEffect(() => {
    if (!openSlug) return;
    let stale = false;
    setFailed(false);
    loadPopupDetail(prefix, openSlug).then(
      (d) => !stale && setDetail(d),
      () => !stale && setFailed(true),
    );
    for (const n of [cards[index - 1], cards[index + 1]]) if (n) void loadPopupDetail(prefix, n.slug).catch(() => {});
    return () => {
      stale = true;
    };
  }, [openSlug, prefix, cards, index]);

  const requestClose = useCallback(() => {
    if (closingRef.current || !openSlugRef.current) return;
    closingRef.current = true;
    if (isOurPopupEntry()) window.history.back();
    else router.push(listPath(prefix));
  }, [prefix, router]);

  const go = useCallback(
    (delta: number) => {
      const cur = openSlugRef.current;
      if (!cur || closingRef.current) return;
      const n = cards[cards.findIndex((c) => c.slug === cur) + delta];
      if (!n) return;
      replacePopupEntry(withBasePath(detailPath(prefix, n.slug)), n.slug);
      flushSync(notifyLocation);
    },
    [cards, prefix],
  );

  useEffect(() => {
    if (!openSlug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openSlug, go]);

  return (
    <dialog
      ref={dialogRef}
      className="popup"
      data-testid="prompt-popup"
      aria-labelledby="popup-title"
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClose={() => {
        // Closed by the browser itself (e.g. Esc without a cancelable cancel event).
        if (!dialogRef.current?.open && shownRef.current && openSlugRef.current) requestClose();
      }}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        if (e.target === e.currentTarget && outside) requestClose();
      }}
    >
      <div className="popup-bar">
        <button type="button" data-testid="popup-close" onClick={requestClose}>
          Close
        </button>
        <button type="button" data-testid="popup-prev" onClick={() => go(-1)} disabled={index <= 0}>
          ← Prev
        </button>
        <button type="button" data-testid="popup-next" onClick={() => go(1)} disabled={index >= cards.length - 1}>
          Next →
        </button>
      </div>
      {card &&
        (detail?.slug === card.slug && detail.prefix === prefix ? (
          <PromptDetailBody detail={detail} as="h2" headingId="popup-title" />
        ) : failed ? (
          <p data-testid="popup-error">
            Could not load. <a href={withBasePath(detailPath(prefix, card.slug))}>Open the full page</a>
          </p>
        ) : (
          <div data-testid="popup-loading">
            <h2 id="popup-title">{card.title}</h2>
            <p>Loading…</p>
          </div>
        ))}
    </dialog>
  );
}
