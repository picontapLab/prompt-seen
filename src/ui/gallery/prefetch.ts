// JSON the list loads, cached per address for the life of the page (design doc §3.5, §11.8.2).
// Later batches, the filter index and the popup's detail models all come through here, so a
// prefetched file is never requested twice; step 4a's popup reads detail models with loadJson.

const cache = new Map<string, Promise<unknown>>();
/** Parsed data of requests that have succeeded, readable synchronously (`peekJson`). */
const settled = new Map<string, unknown>();

export class StaleBuildError extends Error {
  constructor(url: string) {
    super(`${url} belongs to another build`);
    this.name = 'StaleBuildError';
  }
}

/**
 * Fetches and parses a JSON file once. A failed request is forgotten, so a retry fetches again.
 * With `buildId`, data from another deployment is rejected (§13.3: pages, lists and indexes of
 * one build go together).
 */
export function loadJson<T>(
  url: string,
  opts: { buildId?: string; priority?: RequestPriority; retry?: boolean } = {},
): Promise<T> {
  let pending = cache.get(url) as Promise<T> | undefined;
  if (!pending) {
    // A retry skips the HTTP cache: WebKit can answer a repeated request with the earlier failure.
    const init: RequestInit = { priority: opts.priority ?? 'auto', ...(opts.retry && { cache: 'reload' }) };
    pending = fetch(url, init).then(async (res) => {
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      const data = (await res.json()) as T;
      settled.set(url, data);
      return data;
    });
    cache.set(url, pending);
    pending.catch(() => cache.delete(url));
  }
  return opts.buildId
    ? pending.then((data) => {
        const build = (data as { buildId?: string }).buildId;
        if (build && build !== opts.buildId) throw new StaleBuildError(url);
        return data;
      })
    : pending;
}

/**
 * Data already fetched for this address, or undefined. Lets the detail popup render a prefetched
 * model in the same commit as the click, without a frame of its loading state (§11.3.2).
 */
export function peekJson<T>(url: string): T | undefined {
  return settled.get(url) as T | undefined;
}

/** Warms the cache at low priority; errors are ignored until the data is really needed. */
export function prefetchJson(url: string): void {
  loadJson(url, { priority: 'low' }).catch(() => {});
}

/** How long a pointer or focus must rest on a card before its popup data is fetched (§11.8.2). */
export const PREFETCH_DELAY_MS = 150;
