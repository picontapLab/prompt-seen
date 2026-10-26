import { describe, expect, it, vi } from 'vitest';
import {
  createFavoritesStore,
  EXPORT_FORMAT,
  exportFavorites,
  FAVORITES_KEY,
  importFavorites,
  parseFavorites,
  serializeFavorites,
  type Favorite,
} from './store';

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  } as unknown as Storage & { data: Map<string, string> };
};
const throwing = {
  getItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('denied', 'SecurityError');
  },
} as unknown as Storage;

const clock = (start = Date.UTC(2026, 9, 20)) => {
  let t = start;
  return () => new Date((t += 1000));
};

const fav = (id: string, at: string, kind: Favorite['kind'] = 'prompt'): Favorite => ({ id, kind, at });

describe('parseFavorites', () => {
  it('reads valid entries newest first, one per ID', () => {
    const raw = serializeFavorites([
      fav('p_001', '2026-10-01T00:00:00.000Z'),
      fav('t_001', '2026-10-03T00:00:00.000Z', 'template'),
      fav('p_001', '2026-10-02T00:00:00.000Z'),
    ]);
    expect(parseFavorites(raw).map((f) => [f.id, f.at])).toEqual([
      ['t_001', '2026-10-03T00:00:00.000Z'],
      ['p_001', '2026-10-02T00:00:00.000Z'],
    ]);
  });

  it('reads corrupt or foreign records as empty', () => {
    expect(parseFavorites(null)).toEqual([]);
    expect(parseFavorites('{not json')).toEqual([]);
    expect(parseFavorites('[1,2]')).toEqual([]);
    expect(parseFavorites('{"items":"x"}')).toEqual([]);
  });

  it('drops damaged entries one by one', () => {
    const raw = JSON.stringify({
      items: [
        fav('p_001', '2026-10-01T00:00:00.000Z'),
        { id: 'p_002', kind: 'collection', at: '2026-10-01T00:00:00.000Z' },
        { id: '../etc', kind: 'prompt', at: '2026-10-01T00:00:00.000Z' },
        { id: 'p_003', kind: 'prompt', at: 'yesterday' },
        null,
      ],
    });
    expect(parseFavorites(raw).map((f) => f.id)).toEqual(['p_001']);
  });
});

describe('createFavoritesStore', () => {
  it('adds, removes and restores, writing the versioned key', () => {
    const storage = memoryStorage();
    const store = createFavoritesStore(() => storage, clock());
    expect(store.get()).toEqual([]);
    const a = store.add('p_001', 'prompt')!;
    store.add('t_001', 'template');
    expect(store.add('p_001', 'prompt')).toBeNull();
    expect(store.get().map((f) => f.id)).toEqual(['t_001', 'p_001']);
    expect(store.has('p_001')).toBe(true);
    expect(JSON.parse(storage.data.get(FAVORITES_KEY)!).items).toHaveLength(2);

    const removed = store.remove('p_001')!;
    expect(removed).toEqual(a);
    expect(store.has('p_001')).toBe(false);
    store.restore(removed);
    // Back in its old place: by its original time, behind the newer template.
    expect(store.get().map((f) => f.id)).toEqual(['t_001', 'p_001']);
  });

  it('keeps the same snapshot until something changes', () => {
    const store = createFavoritesStore(() => memoryStorage(), clock());
    const first = store.get();
    expect(store.get()).toBe(first);
    store.add('p_001', 'prompt');
    expect(store.get()).not.toBe(first);
    expect(store.getServerSnapshot()).toEqual([]);
  });

  it('works for the session when storage is disabled', () => {
    const store = createFavoritesStore(() => throwing, clock());
    expect(store.get()).toEqual([]);
    store.add('p_001', 'prompt');
    expect(store.has('p_001')).toBe(true);
    expect(store.get()).toHaveLength(1);
  });

  it('replaces a corrupt record on the next save', () => {
    const storage = memoryStorage({ [FAVORITES_KEY]: '{oops' });
    const store = createFavoritesStore(() => storage, clock());
    expect(store.get()).toEqual([]);
    store.add('p_009', 'prompt');
    expect(parseFavorites(storage.data.get(FAVORITES_KEY)!).map((f) => f.id)).toEqual(['p_009']);
  });

  it('notifies subscribers and follows other tabs', () => {
    const storage = memoryStorage();
    const listeners: ((e: StorageEvent) => void)[] = [];
    vi.stubGlobal('window', {
      addEventListener: (_: string, l: (e: StorageEvent) => void) => listeners.push(l),
      removeEventListener: () => {},
    });
    try {
      const store = createFavoritesStore(() => storage, clock());
      const seen = vi.fn();
      const off = store.subscribe(seen);
      store.add('p_001', 'prompt');
      expect(seen).toHaveBeenCalledTimes(1);
      // Another tab saves a template.
      storage.data.set(
        FAVORITES_KEY,
        serializeFavorites([fav('t_002', '2026-10-30T00:00:00.000Z', 'template'), ...store.get()]),
      );
      listeners.forEach((l) => l({ key: FAVORITES_KEY } as StorageEvent));
      expect(seen).toHaveBeenCalledTimes(2);
      expect(store.has('t_002')).toBe(true);
      listeners.forEach((l) => l({ key: 'something-else' } as StorageEvent));
      expect(seen).toHaveBeenCalledTimes(2);
      off();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('export and import', () => {
  const current = [fav('p_001', '2026-10-05T00:00:00.000Z')];

  it('round-trips an export', () => {
    const file = exportFavorites(current, new Date('2026-10-26T00:00:00.000Z'));
    expect(file).toEqual({ format: EXPORT_FORMAT, version: 1, exportedAt: '2026-10-26T00:00:00.000Z', items: current });
    const result = importFavorites([], JSON.stringify(file));
    expect(result).toMatchObject({ ok: true, added: 1, already: 0, invalid: 0 });
  });

  it('merges, keeping the time of works already saved', () => {
    const text = JSON.stringify({
      format: EXPORT_FORMAT,
      version: 1,
      items: [
        fav('p_001', '2026-01-01T00:00:00.000Z'),
        fav('t_001', '2026-10-01T00:00:00.000Z', 'template'),
        { id: 'nope', kind: 'prompt', at: '2026-10-01' },
      ],
    });
    const result = importFavorites(current, text);
    expect(result).toMatchObject({ ok: true, added: 1, already: 1, invalid: 1 });
    if (!result.ok) return;
    expect(result.items.map((f) => [f.id, f.at])).toEqual([
      ['p_001', '2026-10-05T00:00:00.000Z'],
      ['t_001', '2026-10-01T00:00:00.000Z'],
    ]);
  });

  it('accepts a bare array and refuses other files', () => {
    expect(importFavorites([], JSON.stringify([fav('p_002', '2026-10-01T00:00:00.000Z')]))).toMatchObject({
      ok: true,
      added: 1,
    });
    expect(importFavorites([], 'not json')).toEqual({ ok: false, reason: 'not-json' });
    expect(importFavorites([], '{"theme":"dark"}')).toEqual({ ok: false, reason: 'not-favorites' });
  });
});
