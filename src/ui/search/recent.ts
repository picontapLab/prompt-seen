// Recent searches on this device (design doc §11.8.6, §11.6.2): a short, versioned list per
// locale in local storage, shown when the quick search is empty and clearable there. Storage
// that is disabled, full or corrupt only means nothing is remembered.

export const RECENT_KEY = 'prompt-library:recent-searches:v1';
export const RECENT_LIMIT = 6;

type Entry = { q: string; locale: string; at: number };

const storage = (): Storage | undefined => (typeof window === 'undefined' ? undefined : window.localStorage);

function read(store: Storage | undefined = storage()): Entry[] {
  try {
    const value: unknown = JSON.parse(store?.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(value)
      ? value.filter(
          (e): e is Entry =>
            !!e &&
            typeof e === 'object' &&
            typeof e.q === 'string' &&
            typeof e.locale === 'string' &&
            typeof e.at === 'number',
        )
      : [];
  } catch {
    return [];
  }
}

function write(entries: Entry[], store: Storage | undefined = storage()) {
  try {
    store?.setItem(RECENT_KEY, JSON.stringify(entries));
  } catch {
    // storage disabled or full: nothing is remembered
  }
}

/** Newest first, for one locale. */
export function recentSearches(locale: string, store?: Storage): string[] {
  return read(store)
    .filter((e) => e.locale === locale)
    .sort((a, b) => b.at - a.at)
    .map((e) => e.q);
}

/** Remembers a query; the same query (ignoring case) moves to the top instead of repeating. */
export function rememberSearch(locale: string, query: string, store?: Storage, now = Date.now()): void {
  const q = query.trim().slice(0, 100);
  if (!q) return;
  const same = (e: Entry) => e.locale === locale && e.q.toLocaleLowerCase(locale) === q.toLocaleLowerCase(locale);
  const others = read(store).filter((e) => !same(e));
  const mine = others
    .filter((e) => e.locale === locale)
    .sort((a, b) => b.at - a.at)
    .slice(0, RECENT_LIMIT - 1);
  write([{ q, locale, at: now }, ...mine, ...others.filter((e) => e.locale !== locale)], store);
}

export function clearRecentSearches(locale: string, store?: Storage): void {
  write(
    read(store).filter((e) => e.locale !== locale),
    store,
  );
}
