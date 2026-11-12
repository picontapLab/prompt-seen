'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { builtLocales, config, type LocaleEntry } from '@/config';
import { searchClient } from '@/modules/search/client';
import { searchIndexFile } from '@/modules/search/files';
import type { IndexSource, NoResultHelp, PopularTerm, SearchResults } from '@/modules/search/types';
import { paths, withBasePath } from '@/modules/url';

// Search state for the quick panel and the search page (design doc §11.6.1 "搜索与高分图加载":
// idle / loading / success / error; §11.6.4). Each query is a request with a sequence number;
// only the answer to the latest one is applied, so a slow answer to "ne" never replaces the
// results of "neon". Earlier results stay on screen while new ones are on their way (§12.5).

export const indexSource = (locale: LocaleEntry): IndexSource => ({
  locale: locale.code,
  url: withBasePath(paths.generated(searchIndexFile(locale.code))),
});

export type SearchError = 'network' | 'stale' | 'unknown';

export type SearchState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  /** Results of the latest query answered; kept while a newer one loads. */
  results: SearchResults | null;
  /** Suggestions when the latest results are empty (§11.8.6), loaded after them. */
  help: NoResultHelp | null;
  error: SearchError | null;
};

/** The latest answer: for which query and attempt, and what came back. */
type Answer = { key: string; results: SearchResults | null; help: NoResultHelp | null; error: SearchError | null };

export function useSearch(locale: LocaleEntry, query: string, { limit = Infinity, enabled = true } = {}) {
  const [answer, setAnswer] = useState<Answer>({ key: '', results: null, help: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);
  const q = query.trim();
  const key = `${locale.code}\n${q}\n${attempt}`;

  useEffect(() => {
    if (!enabled || !q) return;
    const id = ++latest.current;
    const source = indexSource(locale);
    const client = searchClient();
    void client.request({ type: 'search', buildId: config.buildId, source, query: q, limit }).then((res) => {
      if (id !== latest.current) return;
      if (res.type === 'error') return setAnswer((a) => ({ ...a, key, error: res.error }));
      if (res.type !== 'results') return;
      setAnswer({ key, results: res.results, help: null, error: null });
      if (res.results.total > 0) return;
      const others = builtLocales.filter((l) => l.code !== locale.code).map(indexSource);
      void client.request({ type: 'help', buildId: config.buildId, source, others, query: q }).then((help) => {
        if (id !== latest.current || help.type !== 'help') return;
        setAnswer((a) => (a.key === key ? { ...a, help: help.help } : a));
      });
    });
  }, [locale, q, limit, enabled, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  // Derived, not stored: the status follows from whether the latest answer is for this query.
  const current = answer.key === key;
  const state: SearchState = !q
    ? { status: 'idle', results: null, help: null, error: null }
    : current && answer.error
      ? { status: 'error', results: answer.results, help: null, error: answer.error }
      : {
          status: current ? 'success' : 'loading',
          results: answer.results,
          help: current ? answer.help : null,
          error: null,
        };
  return { ...state, retry };
}

/** The locale's popular use cases, once its index has loaded (§11.8.6 "空输入"). */
export function usePopular(locale: LocaleEntry, enabled = true): PopularTerm[] | null {
  const [popular, setPopular] = useState<PopularTerm[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void searchClient()
      .request({ type: 'load', buildId: config.buildId, source: indexSource(locale) })
      .then((res) => {
        if (live && res.type === 'loaded') setPopular(res.popular);
      });
    return () => {
      live = false;
    };
  }, [locale, enabled]);
  return popular;
}

/**
 * The query to search: follows the field, except while an input method is composing (pinyin,
 * kana), when unfinished syllables would only flash "no results" (§11.6.4). Returns the query
 * and the composition handlers for the input.
 */
export function useCommittedQuery(value: string) {
  // The value when composition started; null when not composing.
  const [frozen, setFrozen] = useState<string | null>(null);
  const composing = useRef(false);
  const composingKey = useRef(false);
  return {
    query: frozen ?? value,
    isComposing: frozen !== null,
    isCompositionActive: () => composing.current || composingKey.current,
    inputProps: {
      onCompositionStart: () => {
        composing.current = true;
        setFrozen(value);
      },
      onCompositionEnd: () => {
        composing.current = false;
        setFrozen(null);
      },
      onKeyDownCapture: (event: KeyboardEvent<HTMLInputElement>) => {
        // Safari can end composition before delivering the confirming Enter as 229.
        // Keep that event marked through its native implicit form submission; stopping
        // propagation alone does not cancel the browser's default submit action.
        composingKey.current = event.nativeEvent.isComposing || event.keyCode === 229;
        if ((composing.current || composingKey.current) && (event.key === 'Enter' || event.key === 'Escape')) {
          // Keep React Aria and app shortcuts from selecting a result or closing the dialog.
          // Do not cancel the IME's native candidate-confirmation/cancellation action.
          event.stopPropagation();
        }
      },
      onKeyUpCapture: () => {
        composingKey.current = false;
      },
      onBlur: () => {
        composingKey.current = false;
      },
    },
  };
}
