// Favourites saved on this device (design doc §11.5, §11.6.1, §11.6.2): one versioned
// local-storage record holding only what identifies a work (ID, kind, when it was saved), read
// through a small external store (useSyncExternalStore). Titles and images come from the current
// content index when the favourites are shown. Other tabs follow through the storage event. When
// storage is disabled, full or corrupt, the store keeps working for this session, so browsing,
// copying and saving never depend on it.

export const FAVORITES_KEY = 'prompt-library:favorites:v1';

/** Kinds of work that can be saved: Prompts and templates (§11.5 按类型筛选). */
export type FavoriteKind = 'prompt' | 'template';
export const FAVORITE_KINDS: readonly FavoriteKind[] = ['prompt', 'template'];

export type Favorite = {
  /** Stable content ID (§5.1), never the slug, which may change. */
  id: string;
  kind: FavoriteKind;
  /** When it was saved: ISO 8601. The favourites page lists newest first. */
  at: string;
};

/** Format of an exported file (§11.5 导出与导入): only IDs, kinds and times. */
export const EXPORT_FORMAT = 'prompt-seen-favorites';
export type FavoritesFile = { format: typeof EXPORT_FORMAT; version: 1; exportedAt: string; items: Favorite[] };

/** Content IDs: a kind letter and a stable suffix (`p_001`, `t_003`). */
const ID = /^[a-z]_[A-Za-z0-9_-]{1,64}$/;
/** Generous cap, so a damaged or hostile file cannot fill the storage quota. */
export const MAX_FAVORITES = 2000;

const EMPTY: readonly Favorite[] = Object.freeze([]);

function isFavorite(value: unknown): value is Favorite {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    ID.test(v.id) &&
    (FAVORITE_KINDS as readonly unknown[]).includes(v.kind) &&
    typeof v.at === 'string' &&
    !Number.isNaN(Date.parse(v.at))
  );
}

/**
 * Valid entries, newest first, one per ID (the newest wins). Invalid entries are dropped one by
 * one, so a single damaged item does not cost the others.
 */
export function normalizeFavorites(items: readonly unknown[]): Favorite[] {
  const seen = new Set<string>();
  const out: Favorite[] = [];
  const sorted = items
    .filter(isFavorite)
    .map((f) => ({ id: f.id, kind: f.kind, at: new Date(f.at).toISOString() }))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  for (const f of sorted) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
    if (out.length >= MAX_FAVORITES) break;
  }
  return out;
}

/**
 * Reads the stored record. A record that is not JSON, or not this version's shape, reads as
 * empty and is replaced on the next save (§11.6.2: reset clearly rather than apply bad data).
 */
export function parseFavorites(raw: string | null): Favorite[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const items = (value as { items?: unknown }).items;
      if (Array.isArray(items)) return normalizeFavorites(items);
    }
  } catch {
    // corrupt record: start empty
  }
  return [];
}

export const serializeFavorites = (items: readonly Favorite[]) => JSON.stringify({ items });

/** The file the favourites page exports. */
export function exportFavorites(items: readonly Favorite[], now = new Date()): FavoritesFile {
  return { format: EXPORT_FORMAT, version: 1, exportedAt: now.toISOString(), items: [...items] };
}

export type ImportResult =
  | { ok: true; items: Favorite[]; added: number; already: number; invalid: number }
  | { ok: false; reason: 'not-json' | 'not-favorites' };

/**
 * Merges an exported file into the current favourites. Accepts this site's export format and a
 * bare array of entries. Works already saved keep their own time; new ones keep the file's.
 */
export function importFavorites(current: readonly Favorite[], text: string): ImportResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'not-json' };
  }
  const list = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && (value as { format?: unknown }).format === EXPORT_FORMAT
      ? (value as { items?: unknown }).items
      : null;
  if (!Array.isArray(list)) return { ok: false, reason: 'not-favorites' };
  const incoming = normalizeFavorites(list);
  const have = new Set(current.map((f) => f.id));
  const fresh = incoming.filter((f) => !have.has(f.id));
  return {
    ok: true,
    items: normalizeFavorites([...current, ...fresh]),
    added: fresh.length,
    already: incoming.length - fresh.length,
    invalid: list.length - incoming.length,
  };
}

type Listener = () => void;

export function createFavoritesStore(storage: () => Storage | undefined, now: () => Date = () => new Date()) {
  let snapshot: readonly Favorite[] | null = null;
  let ids: ReadonlySet<string> = new Set();
  const listeners = new Set<Listener>();

  function load(): readonly Favorite[] {
    let raw: string | null;
    try {
      raw = storage()?.getItem(FAVORITES_KEY) ?? null;
    } catch {
      // storage disabled: keep what this session knows
      return snapshot ?? EMPTY;
    }
    return parseFavorites(raw);
  }

  const emit = () => listeners.forEach((l) => l());

  function commit(next: readonly Favorite[]) {
    snapshot = next.length ? next : EMPTY;
    ids = new Set(snapshot.map((f) => f.id));
    try {
      storage()?.setItem(FAVORITES_KEY, serializeFavorites(snapshot));
    } catch {
      // storage full or disabled: the change still holds for this session
    }
    emit();
  }

  const get = (): readonly Favorite[] => {
    if (!snapshot) {
      snapshot = load();
      ids = new Set(snapshot.map((f) => f.id));
    }
    return snapshot;
  };

  const has = (id: string): boolean => {
    get();
    return ids.has(id);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== FAVORITES_KEY && event.key !== null) return;
    snapshot = load();
    ids = new Set(snapshot.map((f) => f.id));
    emit();
  };

  return {
    /** Newest first; the same array until something changes (useSyncExternalStore). */
    get,
    /** What the server renders and hydration starts from: nothing saved (§3.4). */
    getServerSnapshot: (): readonly Favorite[] => EMPTY,
    has,
    /** Saves a work; returns the entry, or null when it was already saved. */
    add(id: string, kind: FavoriteKind): Favorite | null {
      if (has(id)) return null;
      const entry: Favorite = { id, kind, at: now().toISOString() };
      commit(normalizeFavorites([entry, ...get()]));
      return entry;
    },
    /** Removes a work; returns the removed entry so it can be restored (§11.5 撤销). */
    remove(id: string): Favorite | null {
      const entry = get().find((f) => f.id === id) ?? null;
      if (entry) commit(get().filter((f) => f.id !== id));
      return entry;
    },
    /** Undo of a removal: the entry comes back with its original time, so in its old place. */
    restore(entry: Favorite): void {
      if (!has(entry.id)) commit(normalizeFavorites([...get(), entry]));
    },
    /** Replaces everything, e.g. after an import. */
    replace(items: readonly Favorite[]): void {
      commit(normalizeFavorites(items));
    },
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== 'undefined') window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
      };
    },
  };
}

export type FavoritesStore = ReturnType<typeof createFavoritesStore>;

export const favoritesStore = createFavoritesStore(() =>
  typeof window === 'undefined' ? undefined : window.localStorage,
);
