'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
} from 'react';
import { flushSync } from 'react-dom';
import type { LocaleEntry } from '@/config';
import type { PromptDetail } from '@/modules/content/types';
import { promptJsonFile } from '@/modules/feed/files';
import type { FeedCard } from '@/modules/feed/types';
import { getImage } from '@/modules/media';
import { paths, stripBasePath, withBasePath } from '@/modules/url';
import { duration, ease } from '@/styles/tokens/motion';
import { loadJson, peekJson, prefetchJson } from '@/ui/gallery/prefetch';
import { Button, IconButton } from '@/ui/primitives/Button';
import { PortalScope } from '@/ui/primitives/PortalScope';
import { PromptDetailBody } from '@/ui/prompt-detail/PromptDetailBody';
import { fly, rectOf, type Flight } from './flight';
import {
  isPopupEntry,
  notifyLocation,
  readPathname,
  replacePopupEntry,
  replaceWithGallery,
  subscribeLocation,
} from './history';
import { isVisibleBox, matchPromptPath } from './logic';
import { useSwipe } from './useSwipe';
import styles from './DetailPopup.module.css';

// The detail popup (design doc §11.3, §11.3.1, §11.3.2, §12.1, §12.6). It is open exactly when
// the address is a Prompt detail address of this locale while the gallery that hosts it is
// mounted; everything else (the dialog, scroll lock, title, focus) follows from that. The body
// is the full page's PromptDetailBody, rendered from the same JSON model.

export type PopupLocale = Pick<LocaleEntry, 'code' | 'pathPrefix' | 'htmlLang' | 'direction'>;

/** Works the host's gallery shows, in reading order, and how to get more (PopupHost). */
export type PopupSource = { items: readonly FeedCard[]; hasMore: boolean; loadMore?: () => void };

/** The card the visitor clicked, for the shared image and the focus on return. */
export type PopupOrigin = { slug: string; link: HTMLAnchorElement; at: number };

/** A click that has to fly is one whose data is there within this time; later, content fades in. */
const FLIGHT_WINDOW_MS = 450;
const css = (e: readonly number[]) => `cubic-bezier(${e.join(', ')})`;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Desktop and tablet expand from the card; phones get the plain full-screen transition (§11.3). */
const expands = () => window.matchMedia('(min-width: 768px)').matches;
const serverPath = () => null;

export function DetailPopup({
  locale,
  siteName,
  source,
  getOrigin,
}: {
  locale: PopupLocale;
  siteName: string;
  source: PopupSource | null;
  /** The card of the latest click that opened the popup (PopupHost). */
  getOrigin: () => PopupOrigin | null;
}) {
  const t = useTranslations('popup');
  const td = useTranslations('detail');
  const titleId = useId();
  const rtl = locale.direction === 'rtl';
  const prefix = locale.pathPrefix;

  // --- Where we are -------------------------------------------------------------------------
  const pathname = useSyncExternalStore(subscribeLocation, readPathname, serverPath);
  // Someone else's pushState reaches us only through Next.js's usePathname sync.
  const nextPathname = usePathname();
  useEffect(() => notifyLocation(), [nextPathname]);
  const openSlug = matchPromptPath(pathname === null ? null : stripBasePath(pathname), prefix);

  const items = useMemo(() => source?.items ?? [], [source]);
  const index = openSlug ? items.findIndex((c) => c.slug === openSlug) : -1;
  const card = index >= 0 ? items[index]! : null;
  const hasMore = !!source?.hasMore && !!source.loadMore;

  // --- Data ---------------------------------------------------------------------------------
  const jsonUrl = useCallback(
    (slug: string) => withBasePath(paths.generated(promptJsonFile(locale.code, slug))),
    [locale.code],
  );
  const [loaded, setLoaded] = useState<{ slug: string; detail: PromptDetail } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const detail = openSlug
    ? loaded?.slug === openSlug
      ? loaded.detail
      : (peekJson<PromptDetail>(jsonUrl(openSlug)) ?? null)
    : null;
  const haveDetail = !!detail;

  useEffect(() => {
    if (!openSlug || haveDetail) return;
    // The newest target wins: a late answer for an earlier one is dropped, and it can never
    // reopen a closed popup, since only the address opens it (§11.3.1).
    let live = true;
    loadJson<PromptDetail>(jsonUrl(openSlug), { retry: attempt > 0 }).then(
      (d) => live && setLoaded({ slug: openSlug, detail: d }),
      () => live && setFailed(openSlug),
    );
    return () => {
      live = false;
    };
  }, [openSlug, haveDetail, attempt, jsonUrl]);

  // --- Elements and bookkeeping ----------------------------------------------------------------
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const shown = useRef(false);
  const openRef = useRef<string | null>(null);
  const lastViewed = useRef<string | null>(null);
  const savedTitle = useRef('');
  const galleryUrl = useRef('');
  const stepDir = useRef<1 | -1 | 0>(0);
  /** The work at which "next" waited for the next batch; the step goes ahead when it arrives. */
  const [wantNext, setWantNext] = useState<string | null>(null);
  const flights = useRef(new Set<Flight>());
  const stepAnim = useRef<Animation | null>(null);
  const exit = useRef<{ finish: () => void; cancel: () => void; anims: Animation[] } | null>(null);
  const downTarget = useRef<EventTarget | null>(null);
  /** The click whose image has flown already. */
  const flown = useRef<PopupOrigin | null>(null);

  const stopMotion = useCallback(() => {
    for (const f of flights.current) f.animation.cancel();
    flights.current.clear();
    stepAnim.current?.cancel();
    stepAnim.current = null;
    const leaving = exit.current;
    exit.current = null;
    leaving?.anims.forEach((a) => a.cancel());
    dialogRef.current?.removeAttribute('data-closing');
    if (panelRef.current) panelRef.current.style.transform = '';
  }, []);

  /** The gallery's link to a work, outside the dialog; the clicked card when it is still there. */
  const cardLink = useCallback(
    (slug: string): HTMLAnchorElement | null => {
      const o = getOrigin();
      if (o?.slug === slug && o.link.isConnected) return o.link;
      const root = dialogRef.current?.closest('[data-popup-host]');
      if (!root) return null;
      const href = withBasePath(paths.prompt(prefix, slug));
      const inDialog = (el: Element) => !!dialogRef.current?.contains(el);
      const pick = (scope: string) =>
        [...root.querySelectorAll<HTMLAnchorElement>(`${scope} a[href="${CSS.escape(href)}"]`)].find(
          (el) => !inDialog(el),
        ) ?? null;
      return pick('[role="feed"]') ?? pick('');
    },
    [getOrigin, prefix],
  );

  /** Back to the gallery: focus (and scroll to) the last work viewed, not the first opened (§11.3). */
  const restore = useCallback(() => {
    shown.current = false;
    stopMotion();
    const dlg = dialogRef.current;
    if (dlg?.open) dlg.close();
    delete document.documentElement.dataset.popupOpen;
    document.title = savedTitle.current;
    const slug = lastViewed.current;
    const link = slug ? cardLink(slug) : null;
    if (link) {
      link.focus({ preventScroll: true });
      // Chrome restores the entry's scroll position right after popstate (when restoration is
      // automatic); a synchronous scroll would be overwritten, so wait a frame (§11.3.1).
      requestAnimationFrame(() => link.scrollIntoView({ block: 'nearest' }));
    } else {
      // The card is gone (filters changed, another order): the list's heading takes focus.
      const heading = document.querySelector<HTMLElement>('main h1');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }
  }, [cardLink, stopMotion]);

  // Remember the gallery's own address, for closing an entry the popup did not write.
  useEffect(() => {
    if (!openSlug) galleryUrl.current = window.location.pathname + window.location.search + window.location.hash;
  }, [openSlug, pathname]);

  // --- Open and close follow the address, in the same commit --------------------------------------
  useLayoutEffect(() => {
    const dlg = dialogRef.current!;
    openRef.current = openSlug;
    if (openSlug) {
      lastViewed.current = openSlug;
      if (exit.current) stopMotion(); // a new target interrupts a closing popup
      if (!shown.current) {
        shown.current = true;
        savedTitle.current = document.title;
        document.documentElement.dataset.popupOpen = '';
        if (!dlg.open) dlg.showModal();
        // Focus starts on Close (WAI-ARIA dialog pattern), not on the first step button.
        dlg.querySelector<HTMLElement>('[data-popup-close]')?.focus();
      }
    } else if (shown.current) {
      restore();
    }
  }, [openSlug, restore, stopMotion]);

  // Navigating to another route unmounts the gallery with the popup: release what we hold.
  useLayoutEffect(
    () => () => {
      for (const f of flights.current) f.animation.cancel();
      exit.current?.anims.forEach((a) => a.cancel());
      delete document.documentElement.dataset.popupOpen;
      shown.current = false;
    },
    [],
  );

  // Document title (§11.9): "{title} · Prompt · {site}", as on the full page.
  const title = detail?.seo.title ?? card?.title ?? null;
  useLayoutEffect(() => {
    if (openSlug && title) document.title = td('documentTitle', { title, kind: td('kinds.prompt'), siteName });
  }, [openSlug, title, siteName, td]);

  // --- Motion -----------------------------------------------------------------------------------
  // Opening: the clicked card's image flies to the stage once the model is there (at once when it
  // was prefetched). Later than FLIGHT_WINDOW_MS, the content simply fades in.
  useLayoutEffect(() => {
    const o = getOrigin();
    if (!openSlug || !haveDetail || !o || o.slug !== openSlug || flown.current === o) return;
    flown.current = o;
    const dlg = dialogRef.current;
    const target = bodyRef.current?.querySelector<HTMLElement>('[data-stage-picture]');
    const img = o.link.querySelector('img');
    if (!dlg || !target || !img?.currentSrc || reducedMotion() || !expands()) return;
    if (performance.now() - o.at > FLIGHT_WINDOW_MS) return;
    const from = rectOf(img);
    const to = rectOf(target);
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    if (!isVisibleBox(from, viewport) || !isVisibleBox(to, viewport)) return;
    const flight = fly({
      src: img.currentSrc,
      from,
      to,
      layer: dlg,
      hide: target,
      duration: duration.expand,
      easing: css(ease.enter),
      radius: getComputedStyle(target).borderRadius,
    });
    flights.current.add(flight);
    void flight.done.then(() => flights.current.delete(flight));
  }, [openSlug, haveDetail, getOrigin]);

  // Previous / next: the new work enters along the reading direction (§12.1), from the top.
  useLayoutEffect(() => {
    const dir = stepDir.current;
    stepDir.current = 0;
    if (!openSlug || !dir) return;
    if (dialogRef.current) dialogRef.current.scrollTop = 0;
    const el = bodyRef.current;
    if (!el || reducedMotion()) return;
    stepAnim.current?.cancel();
    const x = 24 * dir * (rtl ? -1 : 1);
    stepAnim.current = el.animate(
      [
        { opacity: 0, transform: `translateX(${x}px)` },
        { opacity: 1, transform: 'none' },
      ],
      { duration: duration.content, easing: css(ease.enter) },
    );
  }, [openSlug, rtl]);

  // --- Commands ---------------------------------------------------------------------------------
  /** Leaves the popup: Back when the entry is ours (one Back returns to the gallery), else replace. */
  const commitClose = useCallback(() => {
    if (!openRef.current) return;
    if (isPopupEntry()) window.history.back();
    else {
      replaceWithGallery(galleryUrl.current || withBasePath(paths.prompts(prefix)));
      notifyLocation();
    }
  }, [prefix]);

  /**
   * Close button, Esc and the scrim (§11.3.1): a short exit (≤ 180 ms) back onto the card, then the
   * history step. A second request, or any history change meanwhile, ends the exit at once.
   */
  const requestClose = useCallback(
    (animate = true) => {
      if (!openRef.current) return;
      if (exit.current) return exit.current.finish();
      const dlg = dialogRef.current;
      const picture = bodyRef.current?.querySelector<HTMLElement>('[data-stage-picture]');
      const slug = lastViewed.current;
      const link = slug ? cardLink(slug) : null;
      const img = link?.querySelector('img');
      const shot = picture?.querySelector<HTMLImageElement>('img:not([aria-hidden])');
      if (!animate || !dlg || reducedMotion() || !expands()) return commitClose();

      dlg.dataset.closing = '';
      let flight: Flight | null = null;
      if (picture && img && shot?.complete && shot.currentSrc) {
        // Bring the card into view under the scrim (the page cannot scroll while locked, but a
        // script can), so the image lands where the visitor will find it.
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        if (!isVisibleBox(rectOf(img), viewport)) link!.scrollIntoView({ block: 'center' });
        const to = rectOf(img);
        if (isVisibleBox(to, viewport))
          flight = fly({
            src: shot.currentSrc,
            from: rectOf(picture),
            to,
            layer: dlg,
            hide: picture,
            duration: duration.exit,
            easing: css(ease.exit),
            radius: getComputedStyle(img).borderRadius,
          });
      }
      const fade = panelRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: duration.exit,
        easing: css(ease.exit),
        fill: 'forwards',
      });
      const anims = [flight?.animation, fade].filter((a): a is Animation => !!a);
      let settled = false;
      // The fills hold the faded state until the dialog has closed (restore → stopMotion).
      const end = (commit: boolean) => {
        if (settled) return;
        settled = true;
        if (commit) commitClose();
        else stopMotion();
      };
      exit.current = { finish: () => end(true), cancel: () => end(false), anims };
      void Promise.all(anims.map((a) => a.finished)).then(
        () => exit.current && end(true),
        () => {},
      );
    },
    [cardLink, commitClose, stopMotion],
  );

  /** Switches to another work in place: replaces the entry, so one Back still leaves (§11.3). */
  const stepTo = useCallback(
    (target: FeedCard, delta: 1 | -1, sync: boolean) => {
      stepDir.current = delta;
      replacePopupEntry(withBasePath(paths.prompt(prefix, target.slug)), target.slug);
      if (sync) flushSync(notifyLocation);
      else notifyLocation();
    },
    [prefix],
  );

  const go = useCallback(
    (delta: 1 | -1) => {
      const cur = openRef.current;
      if (!cur || exit.current) return;
      const i = items.findIndex((c) => c.slug === cur);
      if (i < 0) return;
      const target = items[i + delta];
      if (target) return stepTo(target, delta, true);
      // At the end of what is loaded: ask for the next batch and step once it is in (§11.3).
      if (delta > 0 && hasMore) {
        setWantNext(cur);
        source!.loadMore!();
      }
    },
    [items, hasMore, source, stepTo],
  );

  const waitingForMore = wantNext !== null && wantNext === openSlug && hasMore && index === items.length - 1;
  useEffect(() => {
    if (wantNext === null || wantNext !== openSlug || index < 0) return;
    const target = items[index + 1];
    if (target) stepTo(target, 1, false);
  }, [wantNext, openSlug, index, items, stepTo]);

  // Near the end of what is loaded, the next batch loads in the background; neighbours prefetch.
  useEffect(() => {
    if (!openSlug || index < 0) return;
    if (hasMore && index >= items.length - 3) source?.loadMore?.();
    for (const n of [items[index - 1], items[index + 1]]) if (n) prefetchJson(jsonUrl(n.slug));
  }, [openSlug, index, items, hasMore, source, jsonUrl]);

  // Keyboard ← → (§11.10): in reading order, so mirrored in RTL. Not in text fields or sliders,
  // not with modifiers (Alt+← is the browser's Back), not during IME composition.
  useEffect(() => {
    if (!openSlug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing) return;
      const target = e.target as Element | null;
      if (
        target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"]')
      )
        return;
      e.preventDefault();
      go((e.key === 'ArrowRight') !== rtl ? 1 : -1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openSlug, go, rtl]);

  // A button that became disabled at the end of the list drops focus; keep it in the dialog.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!openSlug || !dlg?.open) return;
    const active = document.activeElement;
    if (!active || active === document.body || (active instanceof HTMLButtonElement && active.disabled))
      dlg.querySelector<HTMLElement>('[data-popup-close]')?.focus();
  });

  // Phones: swipe sideways to switch, down to close (§11.3).
  useSwipeOnPhones(dialogRef, panelRef, rtl, !!openSlug, (r) => {
    if (r === 'close') requestClose(false);
    else go(r === 'next' ? 1 : -1);
  });

  // --- Render -----------------------------------------------------------------------------------
  const hasPrev = index > 0;
  const hasNext = index >= 0 && (index < items.length - 1 || hasMore);
  const showSteps = index >= 0;
  const preview = card ? getImage(card.cover, 'card').src : undefined;

  const nav = (side: 'previous' | 'next') => {
    const prev = side === 'previous';
    // Chevrons point the way the works move, mirrored in RTL (§11.1.6).
    const Icon = prev !== rtl ? ChevronLeft : ChevronRight;
    return (
      <IconButton
        variant="secondary"
        tooltip={false}
        className={styles.step}
        data-side={prev ? 'start' : 'end'}
        data-popup-step={side}
        icon={<Icon aria-hidden="true" />}
        label={t(side)}
        isDisabled={prev ? !hasPrev : !hasNext}
        isPending={!prev && waitingForMore}
        onPress={() => go(prev ? -1 : 1)}
      />
    );
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={openSlug ? titleId : undefined}
      data-popup=""
      data-popup-slug={openSlug ?? undefined}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClose={() => {
        // Closed by the browser itself (repeated Esc without user activation skips `cancel`).
        if (!dialogRef.current?.open && shown.current && openRef.current) requestClose(false);
      }}
      onPointerDown={(e) => (downTarget.current = e.target)}
      onClick={(e) => {
        // The scrim around the panel: a click that starts and ends there (§11.7: never the only way out).
        if (e.target === e.currentTarget && downTarget.current === e.currentTarget) requestClose();
      }}
    >
      <PortalScope getContainer={() => dialogRef.current}>
        {openSlug && (
          <>
            <div ref={panelRef} className={styles.panel} lang={locale.htmlLang}>
              <div className={styles.bar}>
                {showSteps && (
                  <div className={styles.steps}>
                    {nav('previous')}
                    {nav('next')}
                  </div>
                )}
                <IconButton
                  variant="ghost"
                  tooltip={false}
                  className={styles.close}
                  data-popup-close=""
                  icon={<X aria-hidden="true" />}
                  label={t('close')}
                  onPress={() => requestClose()}
                />
              </div>
              <div ref={bodyRef} key={openSlug} className={styles.body} data-ready={haveDetail || undefined}>
                {detail ? (
                  <PromptDetailBody
                    detail={detail}
                    locale={locale}
                    siteName={siteName}
                    heading={{ level: 2, id: titleId }}
                    coverPreview={preview}
                  />
                ) : (
                  <Pending
                    card={card}
                    titleId={titleId}
                    failed={failed === openSlug}
                    fullPage={withBasePath(paths.prompt(prefix, openSlug))}
                    onRetry={() => {
                      setFailed(null);
                      setAttempt((a) => a + 1);
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </PortalScope>
    </dialog>
  );
}

/** Until the model is there: the frame the visitor clicked, its title and a status line (§11.3.2). */
function Pending({
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

function useSwipeOnPhones(
  dialog: RefObject<HTMLDialogElement | null>,
  panel: RefObject<HTMLDivElement | null>,
  rtl: boolean,
  open: boolean,
  onSwipe: Parameters<typeof useSwipe>[3],
) {
  const wide = useSyncExternalStore(subscribeWide, expands, () => true);
  useSwipe(dialog, panel, { enabled: open && !wide, rtl, reducedMotion }, onSwipe);
}

function subscribeWide(cb: () => void) {
  const mq = window.matchMedia('(min-width: 768px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
