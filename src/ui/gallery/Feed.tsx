'use client';

import { useTranslations } from 'next-intl';
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { articleCount, assembleBatch, showsInterlude, type ListItem } from '@/modules/feed/assemble';
import { feedPageFile } from '@/modules/feed/files';
import { editorialFor, EMPTY_QUERY, formatQuery, isCustomOrder, queryResults } from '@/modules/feed/query';
import { FEED_PAGE_SIZE, type FeedBlock, type FeedFacts, type FeedPage, type Interlude } from '@/modules/feed/types';
import { paths, withBasePath } from '@/modules/url';
import { Button } from '@/ui/primitives/Button';
import { Card } from './Card';
import styles from './Feed.module.css';
import gallery from './Gallery.module.css';
import { InterludeView } from './Interludes';
import { useList } from './ListProvider';
import { loadJson, StaleBuildError } from './prefetch';

// The continuous list (design doc §9.4, §11.6.1, §11.8.2). Built on real page addresses: the
// server renders one page with its cards and page links; in the browser, a sentinel about 1.5
// viewports before the end appends the next page, and scrolling up near the top of a list
// opened at /page/{n}/ prepends the previous one. The address follows the page in view
// (history.replaceState), so a refresh or a shared link starts there. Filters and the featured
// sort assemble batches from the slim index and the same page files. There is no "load more"
// button: a failed batch offers a retry, and retries by itself when the network returns or
// the end of the list comes near again.

type Load = 'idle' | 'loading' | 'error' | 'stale';

type Batch = {
  key: string;
  /** Page number in the newest-first list; null in a custom order. */
  page: number | null;
  blocks: FeedBlock[];
  articleOffset: number;
  /** Index of the batch's first prompt and how many prompts it holds. */
  from: number;
  count: number;
};

/** A filtered or featured list: the matching prompts in order, in batches of a page's size. */
type Custom = { results: FeedFacts[]; editorial: Interlude[]; batchCount: number; articleTotal: number };

/** What the list shows. `key` is the fragment of its conditions; "" is the newest-first pages. */
type ListState = { key: string; custom: Custom | null; batches: Batch[] };

type Snapshot = {
  v: 1;
  build: string;
  /** Path and fragment the snapshot belongs to. */
  url: string;
  first: number;
  last: number;
  batches: number;
  anchor: { key: string; top: number } | null;
};

const promptsIn = (blocks: readonly FeedBlock[]) =>
  blocks.reduce(
    (n, b) => n + (b.t === 'cards' ? b.items.length : b.t === 'feature' && b.reason === 'extreme' ? 1 : 0),
    0,
  );

const pageBatch = (p: FeedPage): Batch => ({
  key: `p${p.page}`,
  page: p.page,
  blocks: p.blocks,
  articleOffset: p.articleOffset,
  from: p.offset,
  count: promptsIn(p.blocks),
});

/** Articles in a custom order: every prompt, plus each batch's interlude where it shows. */
function customArticles(results: readonly FeedFacts[], editorial: readonly Interlude[], size: number) {
  let n = results.length;
  if (!editorial.length) return n;
  for (let k = 0; k * size < results.length; k += 1) {
    const ids = results.slice(k * size, (k + 1) * size).map((f) => f.id);
    if (showsInterlude(editorial[k % editorial.length]!, ids)) n += 1;
  }
  return n;
}

const navHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 56;

/** Within this many viewports of the view a sentinel counts as near (§11.8.2: about 1.5). */
const NEAR = 1.5;
const isNear = (el: HTMLElement | null) => {
  if (!el) return false;
  const box = el.getBoundingClientRect();
  const h = window.innerHeight;
  return box.top < h * (1 + NEAR) && box.bottom > -h * NEAR;
};

/**
 * Replaces the current address without a history entry. Next.js keeps its router state in the
 * entry and syncs usePathname (it copies its own fields into the state given); the list's
 * snapshot (`feed`) is carried over.
 */
function replaceAddress(url: string, feed: Snapshot | undefined = window.history.state?.feed) {
  window.history.replaceState(feed ? { feed } : null, '', url);
}

const noSubscribe = () => () => {};

export type FeedProps = {
  /** The page the server rendered; the list starts from it. */
  initial: FeedPage;
  /** Shown after the last batch, e.g. recommended collections (§11.8.2 结束与页脚). */
  end?: ReactNode;
};

export function Feed({ initial, end }: FeedProps) {
  const t = useTranslations('feed');
  const { locale, buildId, query, setQuery, index, loadIndex } = useList();
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const pageSize = index?.pageSize ?? FEED_PAGE_SIZE;

  const [list, setList] = useState<ListState>(() => ({ key: '', custom: null, batches: [pageBatch(initial)] }));
  const [next, setNext] = useState<Load>('idle');
  const [prev, setPrev] = useState<Load>('idle');
  const [switchFailed, setSwitchFailed] = useState<{ key: string; stale: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [announce, setAnnounce] = useState('');

  const feedRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listTop = useRef<HTMLDivElement>(null);
  const holdAnchor = useRef<{ key: string; top: number } | null>(null);
  const wentUp = useRef(false);
  const shownPage = useRef(initial.page);
  const restoring = useRef<Snapshot | null>(null);
  /** The last attempt at each end failed: the next one bypasses the HTTP cache. */
  const lastFailed = useRef({ next: false, prev: false });
  const statusId = useId();

  const customKey = isCustomOrder(query) ? formatQuery(query) : '';
  const switching = list.key !== customKey;
  const { custom, batches } = list;
  const total = custom ? custom.results.length : initial.total;
  const articleTotal = custom ? custom.articleTotal : initial.articleTotal;
  const first = batches[0];
  const last = batches[batches.length - 1];
  const hasNext = custom ? batches.length < custom.batchCount : !!last && last.page! < initial.pageCount;
  const hasPrev = !custom && !!first && first.page! > 1;

  const fetchPage = (n: number, retry = false) =>
    loadJson<FeedPage>(withBasePath(paths.generated(feedPageFile(locale.code, n))), { buildId, retry });

  async function customBatch(c: Custom, k: number, before: Batch | undefined, retry = false): Promise<Batch> {
    const facts = c.results.slice(k * pageSize, (k + 1) * pageSize);
    const pages = await Promise.all([...new Set(facts.map((f) => f.p))].map((n) => fetchPage(n, retry)));
    const items = new Map<string, ListItem>();
    for (const p of pages)
      for (const b of p.blocks) {
        if (b.t === 'cards') for (const card of b.items) items.set(card.id, { card, feature: null });
        else if (b.t === 'feature' && b.reason === 'extreme') items.set(b.card.id, { card: b.card, feature: b });
      }
    const picked = facts.map((f) => items.get(f.id)).filter((x): x is ListItem => !!x);
    const pick = c.editorial.length ? c.editorial[k % c.editorial.length]! : null;
    const blocks = assembleBatch(picked, pick && { ...pick, key: `${pick.key}@q${k}` });
    return {
      key: `q${k}`,
      page: null,
      blocks,
      articleOffset: before ? before.articleOffset + articleCount(before.blocks) : 0,
      from: k * pageSize,
      count: picked.length,
    };
  }

  // --- Loading more ------------------------------------------------------------------------------
  async function loadNext() {
    const key = list.key;
    const retry = lastFailed.current.next;
    setNext('loading');
    try {
      const batch = list.custom
        ? await customBatch(list.custom, list.batches.length, last, retry)
        : pageBatch(await fetchPage(last!.page! + 1, retry));
      setList((l) =>
        l.key !== key || l.batches.some((b) => b.key === batch.key) ? l : { ...l, batches: [...l.batches, batch] },
      );
      setAnnounce(t('status.loaded', { count: batch.count }));
      setNext('idle');
      lastFailed.current.next = false;
    } catch (e) {
      lastFailed.current.next = true;
      setNext(e instanceof StaleBuildError ? 'stale' : 'error');
    }
  }

  async function loadPrev() {
    const n = first!.page! - 1;
    const retry = lastFailed.current.prev;
    setPrev('loading');
    try {
      const page = await fetchPage(n, retry);
      // Keep the work at the top of the view where it is (§11.8.2 向上加载). Browsers with
      // scroll anchoring already do; the measured correction covers the others.
      holdAnchor.current = topVisible(feedRef.current);
      setList((l) =>
        l.key || l.batches.some((b) => b.page === n) ? l : { ...l, batches: [pageBatch(page), ...l.batches] },
      );
      setAnnounce(t('status.loaded', { count: promptsIn(page.blocks) }));
      setPrev('idle');
      lastFailed.current.prev = false;
    } catch (e) {
      lastFailed.current.prev = true;
      setPrev(e instanceof StaleBuildError ? 'stale' : 'error');
    }
  }

  /** Loads at either end when its sentinel is near and nothing else is under way. */
  const tryLoad = useEffectEvent(() => {
    if (switching) return;
    const restoreMore = !!restoring.current && !!custom && batches.length < restoring.current.batches;
    if (hasNext && next === 'idle' && (restoreMore || isNear(bottomRef.current))) void loadNext();
    // A list opened at /page/{n}/ stays put until the visitor scrolls up (§11.8.2).
    if (hasPrev && prev === 'idle' && wentUp.current && isNear(topRef.current)) void loadPrev();
  });

  // After each change of the list the sentinel may still be near: load again if so.
  useEffect(() => {
    if (hydrated) tryLoad();
  }, [hydrated, list, next, prev]);

  useLayoutEffect(() => {
    const anchor = holdAnchor.current;
    if (!anchor) return;
    holdAnchor.current = null;
    const el = feedRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(anchor.key)}"]`);
    if (el) window.scrollBy(0, el.getBoundingClientRect().top - anchor.top);
  }, [list]);

  // --- Switching between the page list and a custom order ------------------------------------
  /** The list for a set of conditions: page 1, or the first batch of the custom order. */
  const listFor = useEffectEvent(async (key: string): Promise<{ state: ListState; results: number | null }> => {
    if (!key) {
      const page = initial.page === 1 ? initial : await fetchPage(1);
      return { state: { key, custom: null, batches: [pageBatch(page)] }, results: null };
    }
    const idx = index ?? (await loadIndex());
    const results = queryResults(idx, query);
    const editorial = editorialFor(idx, query, results);
    const c: Custom = {
      results,
      editorial,
      batchCount: Math.ceil(results.length / idx.pageSize),
      articleTotal: customArticles(results, editorial, idx.pageSize),
    };
    const batch = results.length ? await customBatch(c, 0, undefined) : null;
    return { state: { key, custom: c, batches: batch ? [batch] : [] }, results: results.length };
  });
  useEffect(() => {
    if (!switching) return;
    // Conditions changed: start again at the top of the list (§11.8.2 筛选与搜索).
    const top = listTop.current;
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
    let live = true; // conditions may change again while this loads; the newest wins
    listFor(customKey).then(
      ({ state, results }) => {
        if (!live) return;
        setNext('idle');
        setList(state);
        if (results !== null) setAnnounce(t('filters.results', { count: results }));
      },
      (e) => live && setSwitchFailed({ key: customKey, stale: e instanceof StaleBuildError }),
    );
    return () => {
      live = false;
    };
  }, [switching, customKey, attempt, t]);

  function retrySwitch() {
    setSwitchFailed(null);
    setAttempt((a) => a + 1);
  }

  // --- The address of the page in view, the snapshot for returning, and the sentinels ---------
  const syncAddress = useEffectEvent(() => {
    if (custom || switching) return;
    const feed = feedRef.current;
    if (!feed) return;
    const box = feed.getBoundingClientRect();
    const y = navHeight() + window.innerHeight * 0.25;
    let page: number | null = null;
    if (box.top > y) page = first?.page ?? null;
    else if (box.bottom >= y)
      // Several points across the row: one of them may fall in the gap between two cards.
      for (const x of [0.5, 0.25, 0.75, 0.1, 0.9]) {
        const el = document.elementFromPoint(box.left + box.width * x, y)?.closest<HTMLElement>('[data-feed-page]');
        if (el) {
          page = Number(el.dataset.feedPage);
          break;
        }
      }
    if (page && page !== shownPage.current) {
      shownPage.current = page;
      replaceAddress(withBasePath(paths.promptsPage(locale.pathPrefix, page)) + window.location.hash);
    }
  });

  const onOnline = useEffectEvent(() => {
    if (next === 'error') setNext('idle');
    if (prev === 'error') setPrev('idle');
    if (switchFailed) retrySwitch();
  });

  const saveSnapshot = useEffectEvent(() => {
    if (!first || !last) return;
    const snap: Snapshot = {
      v: 1,
      build: buildId,
      url: window.location.pathname + window.location.hash,
      first: first.page ?? 1,
      last: last.page ?? batches.length,
      batches: batches.length,
      anchor: topVisible(feedRef.current),
    };
    replaceAddress(window.location.href, snap);
  });

  /** Back to this list (§11.6.1): the pages it had, or null when there is nothing to restore. */
  const pagesToRestore = useEffectEvent(async (): Promise<{ pages: FeedPage[]; snap: Snapshot } | null> => {
    const snap = window.history.state?.feed as Snapshot | undefined;
    if (!snap || snap.v !== 1 || snap.build !== buildId) return null;
    if (snap.url !== window.location.pathname + window.location.hash) return null;
    if (customKey) {
      // The first batch loads as usual; tryLoad adds batches until the count matches.
      restoring.current = snap;
      return null;
    }
    const numbers = Array.from({ length: snap.last - snap.first + 1 }, (_, i) => snap.first + i);
    return { pages: await Promise.all(numbers.map((n) => (n === initial.page ? initial : fetchPage(n)))), snap };
  });

  useEffect(() => {
    // The list restores its own position (§11.3.1: one place manages scroll restoration). The
    // browser's would land after it, at a height measured with fewer batches.
    const scrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    pagesToRestore().then(
      (found) => {
        if (!found) return;
        holdAnchor.current = found.snap.anchor;
        setList((l) => (l.key ? l : { ...l, batches: found.pages.map(pageBatch) }));
      },
      () => {}, // nothing to restore: the list starts at this page
    );
    const io = new IntersectionObserver(() => tryLoad(), {
      rootMargin: `${NEAR * 100}% 0px ${NEAR * 100}% 0px`,
    });
    if (bottomRef.current) io.observe(bottomRef.current);
    if (topRef.current) io.observe(topRef.current);
    let lastY = window.scrollY;
    let frame = 0;
    const scroll = () => {
      if (window.scrollY < lastY - 4 && !wentUp.current) {
        wentUp.current = true;
        tryLoad();
      }
      lastY = window.scrollY;
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          syncAddress();
          // The observer reports only crossings; a sentinel that stays near after a batch needs this.
          tryLoad();
        });
    };
    // Before leaving: link clicks (capture runs before Next.js handles them) and page hide
    // (back/forward cache, closing the tab, full-page navigation).
    const click = (e: MouseEvent) => {
      if ((e.target as Element).closest?.('a[href]')) saveSnapshot();
    };
    const hide = () => saveSnapshot();
    const online = () => onOnline();
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('online', online);
    window.addEventListener('pagehide', hide);
    document.addEventListener('click', click, true);
    return () => {
      window.history.scrollRestoration = scrollRestoration;
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('online', online);
      window.removeEventListener('pagehide', hide);
      document.removeEventListener('click', click, true);
    };
  }, []);

  // Restoring a custom order ends once its batches are back; then the anchor is held.
  useLayoutEffect(() => {
    const snap = restoring.current;
    if (!snap || !custom || switching) return;
    if (batches.length < Math.min(snap.batches, custom.batchCount)) return;
    restoring.current = null;
    const anchor = snap.anchor;
    const el = anchor && feedRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(anchor.key)}"]`);
    if (anchor && el) window.scrollBy(0, el.getBoundingClientRect().top - anchor.top);
  }, [batches, custom, switching]);

  // --- Render ----------------------------------------------------------------------------------
  const children = useMemo(() => {
    const out: ReactNode[] = [];
    batches.forEach((batch, bi) => {
      let pos = batch.articleOffset;
      const page = batch.page ?? undefined;
      batch.blocks.forEach((block, i) => {
        if (block.t === 'cards') {
          for (const card of block.items) {
            pos += 1;
            out.push(
              <Card
                key={card.id}
                card={card}
                locale={locale.code}
                posinset={pos}
                setsize={articleTotal}
                className={gallery.cell}
                priority={bi === 0 && pos - batch.articleOffset <= 6}
                page={page}
                dataKey={card.id}
              />,
            );
          }
          return;
        }
        pos += 1;
        // A filler ends the row before the interlude, so a short row keeps its height.
        if (bi > 0 || i > 0) out.push(<span key={`f-${block.key}`} className={gallery.filler} aria-hidden="true" />);
        out.push(
          <InterludeView
            key={block.key}
            block={block}
            posinset={pos}
            setsize={articleTotal}
            locale={locale.code}
            page={page}
            dataKey={block.key}
          />,
        );
      });
    });
    return out;
  }, [batches, articleTotal, locale.code]);

  const loadedFrom = first ? first.from + 1 : 0;
  const loadedTo = last ? last.from + last.count : 0;
  const nextRange = { from: loadedTo + 1, to: Math.min(loadedTo + pageSize, total) };
  const failed = switchFailed?.key === customKey ? switchFailed : null;
  const busy = next === 'loading' || prev === 'loading' || (switching && !failed);
  const empty = !switching && !!custom && custom.results.length === 0;

  return (
    <div
      ref={listTop}
      className={styles.list}
      data-feed-more={hydrated && hasNext ? '' : undefined}
      data-feed-state={switching ? 'switching' : next}
    >
      <a href={`#${statusId}`} className={`visually-hidden ${styles.skip}`}>
        {t('feed.skip')}
      </a>
      <div ref={topRef} className={styles.sentinel} aria-hidden="true" />
      {prev === 'loading' && <p className={styles.edge}>{t('status.developingEarlier')}</p>}
      {prev === 'error' && (
        <p className={styles.edge}>
          {t('status.failedEarlier')}{' '}
          <Button variant="secondary" onPress={() => void loadPrev()}>
            {t('status.retry')}
          </Button>
        </p>
      )}
      {empty ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>{t('filters.empty.title')}</h2>
          <p>{t('filters.empty.body')}</p>
          <Button variant="secondary" onPress={() => setQuery({ ...EMPTY_QUERY, sort: query.sort })}>
            {t('filters.clear')}
          </Button>
        </div>
      ) : (
        <div
          ref={feedRef}
          role="feed"
          aria-label={t('feed.label')}
          aria-busy={busy}
          className={gallery.gallery}
          data-switching={switching || undefined}
        >
          {children}
          {next === 'loading' && <Placeholders count={Math.min(6, nextRange.to - nextRange.from + 1)} />}
        </div>
      )}
      <div ref={bottomRef} className={styles.sentinel} aria-hidden="true" />

      <div id={statusId} className={styles.status} tabIndex={-1}>
        <p className={styles.progress}>
          {next === 'loading' && <span className={styles.dot} aria-hidden="true" />}
          {next === 'loading' && <span>{t('status.developing', nextRange)} · </span>}
          {failed ? (
            <span>
              {failed.stale ? t('status.stale') : t('filters.failed')}{' '}
              <Button variant="secondary" onPress={() => (failed.stale ? window.location.reload() : retrySwitch())}>
                {failed.stale ? t('status.reload') : t('status.retry')}
              </Button>
            </span>
          ) : next === 'error' ? (
            <span>
              {t('status.failed', nextRange)}{' '}
              <Button variant="secondary" onPress={() => void loadNext()}>
                {t('status.retry')}
              </Button>
            </span>
          ) : next === 'stale' || prev === 'stale' ? (
            <span>
              {t('status.stale')}{' '}
              <Button variant="secondary" onPress={() => window.location.reload()}>
                {t('status.reload')}
              </Button>
            </span>
          ) : !hasNext && loadedFrom === 1 && total > 0 ? (
            <span data-feed-end="">{t('status.end', { total })}</span>
          ) : total > 0 ? (
            <span>{t('status.shown', { from: loadedFrom, to: loadedTo, total })}</span>
          ) : null}
        </p>
        {!custom && initial.pageCount > 1 && (
          <nav aria-label={t('status.pages')} className={styles.pages}>
            <span aria-hidden="true">{t('status.page')}</span>
            <ul>
              {Array.from({ length: initial.pageCount }, (_, i) => i + 1).map((n) => (
                <li key={n}>
                  <a
                    href={withBasePath(paths.promptsPage(locale.pathPrefix, n))}
                    aria-label={t('status.pageLink', { page: n })}
                    aria-current={n === initial.page ? 'page' : undefined}
                  >
                    {n}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      {!hasNext && !empty && end}
      <p className="visually-hidden" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

/** Frames with no picture yet, at typical ratios, while a batch develops (§11.8.2 加载中). */
function Placeholders({ count }: { count: number }) {
  const ratios = [1, 0.8, 1.5, 0.75, 1.78, 1.25];
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const r = ratios[i % ratios.length]!;
        return (
          <span
            key={`placeholder-${i}`}
            className={`${gallery.cell} ${styles.placeholder}`}
            style={{ '--w': r, '--h': 1, '--r': r } as CSSProperties}
            aria-hidden="true"
          />
        );
      })}
    </>
  );
}

/** The article nearest the top of the view, with its position, to hold it in place. */
function topVisible(feed: HTMLElement | null): { key: string; top: number } | null {
  if (!feed) return null;
  const limit = navHeight();
  for (const el of feed.querySelectorAll<HTMLElement>('[data-key]')) {
    const box = el.getBoundingClientRect();
    if (box.bottom > limit) return { key: el.dataset.key!, top: box.top };
  }
  return null;
}
