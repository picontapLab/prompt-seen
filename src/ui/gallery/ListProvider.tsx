'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { feedIndexFile } from '@/modules/feed/files';
import { formatQuery, isCustomOrder, isFiltered, parseQuery, type FeedQuery } from '@/modules/feed/query';
import type { FeedIndex } from '@/modules/feed/types';
import { paths, withBasePath } from '@/modules/url';
import { loadJson, prefetchJson, PREFETCH_DELAY_MS } from './prefetch';

// State shared by the list's showcase band, filter bar and feed (design doc §11.6.1, §11.8.2).
// The conditions live in the URL fragment, the one source of truth: shareable, restored with
// the history entry, and never a crawlable path (§9.4). The slim index loads when the
// conditions need it, or in idle time so the first filter answers at once.

export type ListLocale = { code: string; pathPrefix: string };

type ListContextValue = {
  locale: ListLocale;
  buildId: string;
  query: FeedQuery;
  setQuery: (next: FeedQuery) => void;
  /** The slim metadata index, once loaded. */
  index: FeedIndex | null;
  loadIndex: () => Promise<FeedIndex>;
};

const ListContext = createContext<ListContextValue | null>(null);

export function useList(): ListContextValue {
  const value = useContext(ListContext);
  if (!value) throw new Error('useList() needs a <ListProvider> above it');
  return value;
}

// The fragment as an external store: `hashchange` covers links and manual edits; replaceState
// fires no event, so writes notify subscribers themselves.
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('hashchange', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('hashchange', listener);
  };
}
const readHash = () => window.location.hash;
/** The server knows no fragment: the first render is the newest-first list, like the HTML. */
const serverHash = () => '';

const onIdle = (fn: () => void) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(fn, { timeout: 4000 })
    : window.setTimeout(fn, 2000);

export function ListProvider({
  locale,
  buildId,
  children,
}: {
  locale: ListLocale;
  buildId: string;
  children: ReactNode;
}) {
  const hash = useSyncExternalStore(subscribe, readHash, serverHash);
  const [index, setIndex] = useState<FeedIndex | null>(null);
  const indexUrl = withBasePath(paths.generated(feedIndexFile(locale.code)));

  const loadIndex = useCallback(
    () =>
      loadJson<FeedIndex>(indexUrl, { buildId }).then((data) => {
        setIndex(data);
        return data;
      }),
    [indexUrl, buildId],
  );

  const query = useMemo(() => parseQuery(hash, index ?? undefined), [hash, index]);
  const custom = isCustomOrder(query);

  useEffect(() => {
    if (custom) loadIndex().catch(() => {});
  }, [custom, loadIndex]);
  useEffect(() => {
    onIdle(() => prefetchJson(indexUrl));
  }, [indexUrl]);

  const setQuery = useCallback(
    (next: FeedQuery) => {
      // A custom order has no page addresses: the list address plus the conditions (§9.4).
      window.history.replaceState(null, '', withBasePath(paths.prompts(locale.pathPrefix)) + formatQuery(next));
      for (const l of listeners) l();
    },
    [locale.pathPrefix],
  );

  // Intent prefetch (§11.8.2 预取): a pointer or focus resting on a work's link for about 150 ms
  // fetches its popup JSON, never the detail page or the large image.
  const intent = useRef<{ link: Element; timer: number } | null>(null);
  const cancel = () => {
    if (intent.current) window.clearTimeout(intent.current.timer);
    intent.current = null;
  };
  const onIntent = (e: PointerEvent | FocusEvent) => {
    const link = (e.target as Element).closest?.('a[data-prefetch]');
    if (!link || intent.current?.link === link) return;
    cancel();
    const url = link.getAttribute('data-prefetch')!;
    intent.current = { link, timer: window.setTimeout(() => prefetchJson(url), PREFETCH_DELAY_MS) };
  };
  const onLeave = (e: PointerEvent | FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (intent.current && !(next && intent.current.link.contains(next))) cancel();
  };

  const value = useMemo(
    () => ({ locale, buildId, query, setQuery, index, loadIndex }),
    [locale, buildId, query, setQuery, index, loadIndex],
  );
  return (
    <ListContext.Provider value={value}>
      <div onPointerOver={onIntent} onPointerOut={onLeave} onFocus={onIntent} onBlur={onLeave}>
        {children}
      </div>
    </ListContext.Provider>
  );
}

/** The showcase band folds away while filters apply, so results start at the top (§11.8.2). */
export function HideWhenFiltered({ children }: { children: ReactNode }) {
  const { query } = useList();
  return <div hidden={isFiltered(query)}>{children}</div>;
}
