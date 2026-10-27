import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { analyticsLoader, analyticsOrigins } from './loader';

// The analytics loader (design doc §9.10.6, §16.4): nothing without a provider; otherwise one
// script element, added after load once the browser is idle.

function run(source: string, readyState: 'loading' | 'complete') {
  const added: Record<string, string>[] = [];
  const listeners: Record<string, () => void> = {};
  const idle: (() => void)[] = [];
  const context = {
    document: {
      readyState,
      body: { appendChild: (el: { attrs: Record<string, string> }) => added.push(el.attrs) },
      createElement: () => {
        const attrs: Record<string, string> = {};
        return {
          attrs,
          setAttribute: (k: string, v: string) => (attrs[k] = v),
          set defer(v: boolean) {
            attrs.defer = String(v);
          },
        };
      },
    },
    addEventListener: (type: string, fn: () => void) => (listeners[type] = fn),
    requestIdleCallback: (fn: () => void) => idle.push(fn),
    setTimeout: () => undefined,
  };
  (context as Record<string, unknown>).window = context;
  vm.runInNewContext(source, context);
  return { added, listeners, idle };
}

describe('analyticsLoader', () => {
  it('adds nothing without a provider', () => {
    expect(analyticsLoader({ provider: 'none' })).toBeNull();
    expect(analyticsOrigins({ provider: 'none' })).toEqual({ script: [], connect: [] });
  });

  it('waits for load and idle, then adds the Cloudflare beacon with its token', () => {
    // A placeholder token of one repeated digit, which secret scanners rightly ignore.
    const token = 'f'.repeat(32);
    const source = analyticsLoader({ provider: 'cloudflare', token })!;
    const page = run(source, 'loading');
    expect(page.added).toEqual([]);
    page.listeners.load!();
    expect(page.added).toEqual([]);
    page.idle[0]!();
    expect(page.added).toEqual([
      {
        defer: 'true',
        src: 'https://static.cloudflareinsights.com/beacon.min.js',
        'data-cf-beacon': `{"token":"${token}","spa":true}`,
      },
    ]);
  });

  it('adds Plausible with its domain when the page has already loaded', () => {
    const page = run(
      analyticsLoader({ provider: 'plausible', domain: 'example.com', src: 'https://stats.example.org/js/script.js' })!,
      'complete',
    );
    page.idle[0]!();
    expect(page.added[0]).toMatchObject({
      src: 'https://stats.example.org/js/script.js',
      'data-domain': 'example.com',
    });
    expect(
      analyticsOrigins({ provider: 'plausible', domain: 'x', src: 'https://stats.example.org/js/script.js' }).script,
    ).toEqual(['https://stats.example.org']);
  });
});
