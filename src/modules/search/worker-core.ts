import { loadEngine, noResultHelp, search, type Engine } from './engine';
import type { IndexSource, SearchIndexFile, WorkerRequest, WorkerResponse } from './types';
import { SEARCH_SCHEMA_VERSION, SEARCH_ANALYZER_VERSION } from './types';

// What the search Worker does with a request (design doc §13.3), without the Worker itself, so
// the same code answers on the main thread when Workers are unavailable, and in unit tests.
// Indexes load once per address; a failed load is forgotten so a retry fetches again.

export type FetchJson = (url: string) => Promise<unknown>;

export class SearchError extends Error {
  constructor(readonly kind: 'network' | 'stale') {
    super(kind === 'stale' ? 'the index belongs to another build' : 'the index could not be loaded');
  }
}

export const defaultFetchJson: FetchJson = async (url) => {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new SearchError('network');
  }
  if (!res.ok) throw new SearchError('network');
  return res.json();
};

export function createSearchCore(fetchJson: FetchJson = defaultFetchJson) {
  const engines = new Map<string, Promise<Engine>>();

  function engine(source: IndexSource, buildId: string): Promise<Engine> {
    const cacheKey = `${buildId}:${source.locale}:${source.url}`;
    let pending = engines.get(cacheKey);
    if (!pending) {
      pending = fetchJson(source.url).then((data) => {
        const file = data as SearchIndexFile;
        // An index from another deployment would not match this page's addresses (§13.3).
        if (
          file.buildId !== buildId ||
          file.locale !== source.locale ||
          file.schemaVersion !== SEARCH_SCHEMA_VERSION ||
          file.analyzerVersion !== SEARCH_ANALYZER_VERSION
        )
          throw new SearchError('stale');
        return loadEngine(file);
      });
      pending.catch(() => engines.delete(cacheKey));
      engines.set(cacheKey, pending);
    }
    return pending;
  }

  return async function handle(req: WorkerRequest): Promise<WorkerResponse> {
    try {
      const e = await engine(req.source, req.buildId);
      switch (req.type) {
        case 'load':
          return { type: 'loaded', seq: req.seq, popular: e.file.popular, counts: e.file.counts };
        case 'search':
          return { type: 'results', seq: req.seq, results: search(e, req.query, req.limit) };
        case 'help': {
          // Other languages are optional: one that fails to load is left out of the suggestions.
          const others = await Promise.all(req.others.map((s) => engine(s, req.buildId).catch(() => null)));
          return {
            type: 'help',
            seq: req.seq,
            help: noResultHelp(
              e,
              others.filter((o) => o !== null),
              req.query,
            ),
          };
        }
      }
    } catch (error) {
      return { type: 'error', seq: req.seq, error: error instanceof SearchError ? error.kind : 'unknown' };
    }
  };
}
