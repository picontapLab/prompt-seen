'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import type { FeedCard } from '@/modules/feed/types';
import { paths, stripBasePath, withBasePath } from '@/modules/url';
import type { DetailPopup as DetailPopupType, PopupLocale, PopupOrigin, PopupSource } from './DetailPopup';
import { notifyLocation, pushPopupEntry } from './history';
import { isPlainClick, matchPromptPath } from './logic';
import { PendingDialog, type PendingState } from './PendingDialog';

// A gallery that opens works in the detail popup (design doc §11.3). Wrap the area whose links
// should open the popup: a plain click on a link to a Prompt detail address of this locale
// becomes a history entry at that address and opens the popup over the gallery; modified
// clicks, other tabs and pages without JavaScript reach the pre-rendered full page, because the
// links stay real links. Links inside the popup (related prompts) replace its entry.
//
// The list inside registers its works in reading order with usePopupList (or <PopupWorks>), so
// previous / next follow the gallery and can ask it for the next batch.
//
// The popup itself (DetailPopup, with the detail body's client parts) is not first-load code
// (§16.1): it loads once the host has hydrated. Until it is here, PendingDialog stands in, so a
// click that comes first still opens at once and Esc and Back behave (§12.8-3, §12.8-5).

const RegisterContext = createContext<((source: PopupSource | null) => void) | null>(null);

/** Registers the gallery's works with the surrounding PopupHost. */
export function usePopupList(source: PopupSource): void {
  const register = useContext(RegisterContext);
  const { items, hasMore, loadMore } = source;
  useEffect(() => {
    register?.({ items, hasMore, loadMore });
  }, [register, items, hasMore, loadMore]);
  useEffect(() => () => register?.(null), [register]);
}

/** A fixed set of works (topic pages): registers them and renders nothing. */
export function PopupWorks({ items }: { items: readonly FeedCard[] }) {
  usePopupList({ items, hasMore: false });
  return null;
}

type Popup = typeof DetailPopupType;
/** Loaded once per page; a host mounted later (Back to a gallery) renders the popup at once. */
let loaded: Popup | null = null;
const loadPopup = () => import('./DetailPopup').then((m) => (loaded = m.DetailPopup));
const NO_ITEMS: readonly FeedCard[] = [];

export function PopupHost({
  locale,
  siteName,
  children,
}: {
  locale: PopupLocale;
  siteName: string;
  children: ReactNode;
}) {
  const [source, setSource] = useState<PopupSource | null>(null);
  const register = useCallback((s: PopupSource | null) => setSource(s), []);
  const origin = useRef<PopupOrigin | null>(null);
  const getOrigin = useCallback(() => origin.current, []);

  // On the server and at hydration `loaded` is null, so both render the stand-in.
  const [DetailPopup, setDetailPopup] = useState<Popup | null>(() => loaded);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<PendingState>('closed');
  const load = useCallback(() => {
    loadPopup().then(
      (popup) => setDetailPopup(() => popup),
      () => setFailed(true),
    );
  }, []);
  useEffect(() => {
    if (!loaded) load();
  }, [load]);
  const retry = useCallback(() => {
    setFailed(false);
    load();
  }, [load]);

  // Capture phase: before next/link's own handler (a related prompt in the popup is a Link),
  // which then sees the event handled and stays out.
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (!isPlainClick(e)) return;
    const link = (e.target as Element).closest?.('a[href]');
    if (!(link instanceof HTMLAnchorElement) || !e.currentTarget.contains(link)) return;
    if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin) return;
    const slug = matchPromptPath(stripBasePath(url.pathname), locale.pathPrefix);
    if (!slug) return;
    // A link to the work already open (the popup's "open the full page") loads that page.
    if (matchPromptPath(stripBasePath(window.location.pathname), locale.pathPrefix) === slug) return;
    e.preventDefault();
    // The card the image flies from and focus returns to; a related prompt inside the popup is not one.
    if (!link.closest('dialog[data-popup]')) origin.current = { slug, link, at: performance.now() };
    pushPopupEntry(withBasePath(paths.prompt(locale.pathPrefix, slug)), slug);
    // Commit the open dialog before the event returns, so an Esc right after the click reaches it.
    flushSync(notifyLocation);
  };

  return (
    <RegisterContext.Provider value={register}>
      <div onClickCapture={onClickCapture} data-popup-host="" style={{ display: 'contents' }}>
        {children}
        {/* While the stand-in is on its way out (Back under way), it finishes that first. */}
        {DetailPopup && pending !== 'leaving' ? (
          <DetailPopup
            locale={locale}
            siteName={siteName}
            source={source}
            getOrigin={getOrigin}
            takeover={pending === 'open'}
          />
        ) : (
          <PendingDialog
            locale={locale}
            items={source?.items ?? NO_ITEMS}
            getOrigin={getOrigin}
            failed={failed}
            onRetry={retry}
            onState={setPending}
          />
        )}
      </div>
    </RegisterContext.Provider>
  );
}
