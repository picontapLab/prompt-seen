'use client';

import { languageAttributes } from '@/ui/prompt-detail/language';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { LocaleEntry } from '@/config';
import { EMPTY_QUERY, formatQuery } from '@/modules/feed/query';
import type { SearchKind, SearchResults } from '@/modules/search/types';
import { paths, withBasePath } from '@/modules/url';
import { NoResults, SearchFailure } from './NoResults';
import { registerPageSearch } from './page-focus';
import { rememberSearch } from './recent';
import { ResultRow } from './ResultRow';
import styles from './SearchPage.module.css';
import { useCommittedQuery, usePopular, useSearch } from './use-search';

/** Results shown per group at first, and added each time the end of a group comes near. */
const STEP = 24;
/** The address follows the field after a pause in typing, so history is not flooded (§11.6.1). */
const URL_DELAY_MS = 300;

/**
 * The search page's island (§11.8.6, §11.6.1). The page is static and noindex; the query lives
 * in `?q=`, read after hydration, so the HTML never depends on it. A large field (focused on
 * arrival where a keyboard is likely, never popping up a touch keyboard, §11.9), then results
 * grouped by kind with their counts and matched words marked. Long groups grow as the end comes
 * near, without a button (§11.12). Nothing found shows the suggestions of NoResults.
 */
export function SearchPage({ locale }: { locale: LocaleEntry }) {
  const t = useTranslations('search');
  const [value, setValue] = useState('');
  const [ready, setReady] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const { query, inputProps, isComposing, isCompositionActive } = useCommittedQuery(value);
  const search = useSearch(locale, query, { enabled: ready });
  const trimmed = query.trim();
  const popular = usePopular(locale, ready && !trimmed);

  useEffect(() => {
    // Reading location after hydration keeps the first render identical to the static HTML.
    const q = new URLSearchParams(window.location.search).get('q') ?? '';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the address is only known in the browser
    setValue(q);
    setReady(true);
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) field.current?.focus();
    return registerPageSearch(() => {
      field.current?.focus();
      field.current?.select();
    });
  }, []);

  useEffect(() => {
    if (!ready || isComposing) return;
    const timer = window.setTimeout(() => {
      const next = withBasePath(paths.search(locale.pathPrefix, query));
      if (next !== window.location.pathname + window.location.search)
        window.history.replaceState(window.history.state, '', next);
    }, URL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query, ready, isComposing, locale.pathPrefix]);

  const remember = () => {
    if (!isCompositionActive() && trimmed) rememberSearch(locale.code, trimmed);
  };

  const results = trimmed ? search.results : null;
  const noResults = !!trimmed && search.status === 'success' && results?.total === 0;
  const status = !trimmed
    ? ''
    : search.status === 'loading'
      ? t('page.updating')
      : results
        ? t('page.summary', { count: results.total, query: results.query })
        : '';

  return (
    <div className={styles.page}>
      <form
        role="search"
        className={styles.form}
        action={withBasePath(paths.search(locale.pathPrefix))}
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          remember();
        }}
      >
        <label htmlFor="search-field" className="visually-hidden">
          {t('panel.field')}
        </label>
        <Search className={styles.icon} aria-hidden="true" />
        <input
          {...inputProps}
          ref={field}
          id="search-field"
          name="q"
          type="search"
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('panel.placeholder')}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
        />
      </form>

      <p
        // With nothing found the heading below says it; the count is still announced.
        className={noResults ? `${styles.status} visually-hidden` : styles.status}
        role="status"
        aria-live="polite"
        data-search-status=""
      >
        {status}
      </p>

      {search.status === 'error' && search.error ? (
        <SearchFailure error={search.error} onRetry={search.retry} />
      ) : noResults ? (
        <NoResults locale={locale} query={trimmed} help={search.help} onQuery={setValue} />
      ) : results ? (
        <Results results={results} locale={locale} onOpen={remember} pending={search.status === 'loading'} />
      ) : (
        !trimmed &&
        popular &&
        popular.length > 0 && (
          <section className={styles.popular} aria-labelledby="popular-uses">
            <h2 id="popular-uses" className={styles.groupTitle}>
              {t('panel.popular')}
            </h2>
            <ul className={styles.popularList}>
              {popular.map((p) => (
                <li key={p.id}>
                  <a
                    href={withBasePath(paths.prompts(locale.pathPrefix)) + formatQuery({ ...EMPTY_QUERY, use: [p.id] })}
                  >
                    <span {...languageAttributes(p.labelLocale)}>{p.label}</span>{' '}
                    <span className={styles.count}>{p.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )
      )}
    </div>
  );
}

function Results({
  results,
  locale,
  onOpen,
  pending,
}: {
  results: SearchResults;
  locale: LocaleEntry;
  onOpen: () => void;
  pending: boolean;
}) {
  const t = useTranslations('search');
  const [shown, setShown] = useState<{ query: string; n: Partial<Record<SearchKind, number>> }>({ query: '', n: {} });
  // A new query starts every group at its first step again.
  const counts = shown.query === results.query ? shown.n : {};
  const more = (kind: SearchKind) =>
    setShown((s) => {
      const n = s.query === results.query ? s.n : {};
      return { query: results.query, n: { ...n, [kind]: (n[kind] ?? STEP) + STEP } };
    });

  return (
    <div className={styles.results} data-pending={pending || undefined}>
      {results.groups.map((g) => {
        const limit = counts[g.kind] ?? STEP;
        const id = `results-${g.kind}`;
        return (
          <section key={g.kind} className={styles.group} aria-labelledby={id} data-group={g.kind}>
            <h2 id={id} className={styles.groupTitle}>
              {t(`groups.${g.kind}`)} <span className={styles.count}>{g.hits.length}</span>
            </h2>
            <ul className={styles.list}>
              {g.hits.slice(0, limit).map((hit) => (
                <li key={hit.id}>
                  <a href={withBasePath(hit.path)} className={styles.result} onClick={onOpen}>
                    <ResultRow hit={hit} locale={locale.code} description />
                  </a>
                </li>
              ))}
            </ul>
            {g.hits.length > limit && (
              // Keyed by the limit: a new sentinel observes afresh, also when it is still in range.
              <MoreSentinel key={limit} onNear={() => more(g.kind)}>
                {t('page.more', { shown: limit, total: g.hits.length })}
              </MoreSentinel>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Shows more when it comes within about a screen of the viewport (§11.8.2: no button). */
function MoreSentinel({ onNear, children }: { onNear: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const near = useRef(onNear);
  useEffect(() => {
    near.current = onNear;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && near.current(), {
      rootMargin: '0px 0px 100% 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <p ref={ref} className={styles.more} data-search-more="">
      {children}
    </p>
  );
}
