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
import { DetailPopup, type PopupLocale, type PopupOrigin, type PopupSource } from './DetailPopup';
import { notifyLocation, pushPopupEntry } from './history';
import { isPlainClick, matchPromptPath } from './logic';

// A gallery that opens works in the detail popup (design doc §11.3). Wrap the area whose links
// should open the popup: a plain click on a link to a Prompt detail address of this locale
// becomes a history entry at that address and opens the popup over the gallery; modified
// clicks, other tabs and pages without JavaScript reach the pre-rendered full page, because the
// links stay real links. Links inside the popup (related prompts) replace its entry.
//
// The list inside registers its works in reading order with usePopupList (or <PopupWorks>), so
// previous / next follow the gallery and can ask it for the next batch.

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
        <DetailPopup locale={locale} siteName={siteName} source={source} getOrigin={getOrigin} />
      </div>
    </RegisterContext.Provider>
  );
}
