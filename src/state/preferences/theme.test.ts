import { describe, expect, it } from 'vitest';
import { createPreferencesStore, parsePreferences, PREFERENCES_KEY } from './store';
import { applyTheme, themeColorOverride, themeInitScript, type ThemePreference } from './theme';

// A minimal document: just what the first-paint script and applyTheme touch.
class FakeElement {
  attributes = new Map<string, string>();
  name = '';
  content = '';
  parent: FakeHead | null = null;
  constructor(readonly tagName: string) {}
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  closest() {
    return null;
  }
  remove() {
    this.parent?.children.splice(this.parent.children.indexOf(this), 1);
  }
}
class FakeHead {
  children: FakeElement[] = [new FakeElement('meta')];
  get firstChild() {
    return this.children[0] ?? null;
  }
  insertBefore(node: FakeElement, ref: FakeElement | null) {
    node.parent = this;
    this.children.splice(ref ? this.children.indexOf(ref) : this.children.length, 0, node);
  }
  querySelector(selector: string) {
    return selector.includes('data-theme-override')
      ? (this.children.find((c) => c.name === 'theme-color' && c.attributes.has('data-theme-override')) ?? null)
      : null;
  }
}
const fakeDocument = () => {
  const head = new FakeHead();
  return { documentElement: new FakeElement('html'), head, createElement: (tag: string) => new FakeElement(tag) };
};
const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  } as unknown as Storage & { data: Map<string, string> };
};
const state = (doc: ReturnType<typeof fakeDocument>) => ({
  theme: doc.documentElement.getAttribute('data-theme'),
  themeColor: doc.head.children.filter((c) => c.attributes.has('data-theme-override')).map((c) => c.content),
  firstInHead: doc.head.firstChild?.attributes.has('data-theme-override') ?? false,
});

function runInitScript(stored: string | null | Error) {
  const doc = fakeDocument();
  const storage = {
    getItem: () => {
      if (stored instanceof Error) throw stored;
      return stored;
    },
  };
  new Function('document', 'localStorage', themeInitScript(PREFERENCES_KEY))(doc, storage);
  return doc;
}

describe('first-paint theme script', () => {
  it.each<[string, string | null, ThemePreference]>([
    ['nothing stored', null, 'system'],
    ['explicit dark', '{"theme":"dark"}', 'dark'],
    ['explicit light', '{"theme":"light","sort":"latest"}', 'light'],
    ['system', '{"theme":"system"}', 'system'],
    ['unknown value', '{"theme":"sepia"}', 'system'],
    ['corrupt JSON', '{theme:', 'system'],
    ['JSON null', 'null', 'system'],
  ])('%s: same document state as applyTheme', (_, stored, preference) => {
    const viaScript = runInitScript(stored);
    const viaApply = fakeDocument();
    applyTheme(preference, viaApply as unknown as Document);
    expect(state(viaScript)).toEqual(state(viaApply));
  });

  it('marks an explicit choice and puts its theme colour first in <head>', () => {
    expect(state(runInitScript('{"theme":"dark"}'))).toEqual({
      theme: 'dark',
      themeColor: [themeColorOverride.dark],
      firstInHead: true,
    });
  });

  it('leaves the system theme when storage is blocked', () => {
    expect(state(runInitScript(new Error('SecurityError')))).toEqual({
      theme: null,
      themeColor: [],
      firstInHead: false,
    });
  });
});

describe('theme colour override', () => {
  it('is the canvas colour, written differently from the viewport metadata', () => {
    expect(themeColorOverride).toEqual({ light: 'rgb(237 236 232)', dark: 'rgb(18 17 16)' });
  });
});

describe('applyTheme', () => {
  it('replaces and removes the theme-colour override', () => {
    const doc = fakeDocument() as unknown as Document;
    applyTheme('dark', doc);
    applyTheme('light', doc);
    expect(state(doc as never)).toEqual({ theme: 'light', themeColor: [themeColorOverride.light], firstInHead: true });
    applyTheme('system', doc);
    expect(state(doc as never)).toEqual({ theme: null, themeColor: [], firstInHead: false });
  });
});

describe('preferences store', () => {
  it('reads defaults from corrupt or foreign records', () => {
    expect(parsePreferences('[1,2]').known).toEqual({ theme: 'system', singleKeyShortcuts: true });
    expect(parsePreferences('not json').known).toEqual({ theme: 'system', singleKeyShortcuts: true });
    expect(parsePreferences('{"singleKeyShortcuts":"no"}').known.singleKeyShortcuts).toBe(true);
    expect(parsePreferences('{"singleKeyShortcuts":false}').known.singleKeyShortcuts).toBe(false);
  });

  it('writes a versioned record and keeps fields it does not know', () => {
    const storage = memoryStorage({ [PREFERENCES_KEY]: '{"theme":"dark","shortcuts":false}' });
    const store = createPreferencesStore(() => storage);
    expect(store.get()).toEqual({ theme: 'dark', singleKeyShortcuts: true });
    store.set({ theme: 'light' });
    expect(JSON.parse(storage.data.get(PREFERENCES_KEY)!)).toEqual({
      theme: 'light',
      singleKeyShortcuts: true,
      shortcuts: false,
    });
  });

  it('keeps working for the session when storage throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    const store = createPreferencesStore(() => broken);
    let notified = 0;
    store.subscribe(() => notified++);
    expect(store.get()).toEqual({ theme: 'system', singleKeyShortcuts: true });
    store.set({ theme: 'dark' });
    expect(store.get()).toEqual({ theme: 'dark', singleKeyShortcuts: true });
    expect(notified).toBe(1);
  });

  it('returns the same snapshot until something changes', () => {
    const store = createPreferencesStore(() => memoryStorage());
    expect(store.get()).toBe(store.get());
  });
});
