// Device preferences (design doc §11.6.1, §11.6.2): one versioned local-storage record, read
// through a small external store (useSyncExternalStore). Other tabs follow through the storage
// event. When storage is disabled, full or corrupt, the store keeps working for this session.
// Later steps add their own fields (sort order, single-key shortcuts) to Preferences.

import { isThemePreference, type ThemePreference } from './theme';

export const PREFERENCES_KEY = 'prompt-library:preferences:v1';

export type Preferences = {
  theme: ThemePreference;
};

export const DEFAULT_PREFERENCES: Preferences = Object.freeze({ theme: 'system' });

/** Known fields are validated one by one; unknown fields are kept for other versions of the site. */
export function parsePreferences(raw: string | null): { known: Preferences; rest: Record<string, unknown> } {
  let value: unknown = null;
  try {
    value = raw ? JSON.parse(raw) : null;
  } catch {
    // corrupt record: start from the defaults
  }
  const record = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    known: { theme: isThemePreference(record.theme) ? record.theme : DEFAULT_PREFERENCES.theme },
    rest: record,
  };
}

type Listener = () => void;

export function createPreferencesStore(storage: () => Storage | undefined) {
  let snapshot: Preferences | null = null;
  let rest: Record<string, unknown> = {};
  const listeners = new Set<Listener>();

  function load(): Preferences {
    let raw: string | null = null;
    try {
      raw = storage()?.getItem(PREFERENCES_KEY) ?? null;
    } catch {
      // storage disabled: keep what this session knows
      return snapshot ?? DEFAULT_PREFERENCES;
    }
    const parsed = parsePreferences(raw);
    rest = parsed.rest;
    return parsed.known;
  }

  const emit = () => listeners.forEach((l) => l());

  const get = (): Preferences => (snapshot ??= load());

  const onStorage = (event: StorageEvent) => {
    if (event.key !== PREFERENCES_KEY && event.key !== null) return;
    snapshot = load();
    emit();
  };

  return {
    /** The current preferences; the same object until something changes (useSyncExternalStore). */
    get,
    /** What the server renders and hydration starts from: the defaults (§3.4). */
    getServerSnapshot(): Preferences {
      return DEFAULT_PREFERENCES;
    },
    set(patch: Partial<Preferences>): void {
      snapshot = { ...get(), ...patch };
      try {
        storage()?.setItem(PREFERENCES_KEY, JSON.stringify({ ...rest, ...snapshot }));
      } catch {
        // storage full or disabled: the change still holds for this session
      }
      emit();
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

export type PreferencesStore = ReturnType<typeof createPreferencesStore>;

export const preferencesStore = createPreferencesStore(() =>
  typeof window === 'undefined' ? undefined : window.localStorage,
);
