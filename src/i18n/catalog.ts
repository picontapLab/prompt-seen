// Reads UI message catalogs (Node only). Messages are split per feature:
// src/i18n/messages/{locale code}/{namespace}.json, so parallel sessions add their own
// file instead of editing a shared one (design doc §17.4). The file name is the namespace.
import fs from 'node:fs';
import path from 'node:path';
import compile from 'icu-minify/compile';

export type Messages = Record<string, unknown>;

export const MESSAGES_DIR = 'src/i18n/messages';

export function catalogDir(root: string, code: string): string {
  return path.join(root, MESSAGES_DIR, code);
}

export function listNamespaces(root: string, code: string): string[] {
  const dir = catalogDir(root, code);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .sort();
}

/** All namespaces of one locale, keyed by namespace. */
export function readCatalog(root: string, code: string): Messages {
  return Object.fromEntries(
    listNamespaces(root, code).map((ns) => [
      ns,
      JSON.parse(fs.readFileSync(path.join(catalogDir(root, code), `${ns}.json`), 'utf8')) as unknown,
    ]),
  );
}

/**
 * Every message compiled ahead of time with icu-minify, the format next-intl's
 * `messages.precompile` produces (design doc §16.1). The app formats only compiled messages:
 * next.config.ts swaps use-intl's runtime ICU parser for its format-only formatter, which keeps
 * ~9 KiB gzip of parser out of every page.
 */
export function compileMessages(messages: Messages): Messages {
  const walk = (value: unknown): unknown =>
    typeof value === 'string'
      ? compile(value)
      : Array.isArray(value)
        ? value.map(walk)
        : value && typeof value === 'object'
          ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]))
          : value;
  // Plain data: the compiler's option maps have no prototype, which client props reject.
  return JSON.parse(JSON.stringify(walk(messages))) as Messages;
}

/** Only the namespaces a client island needs (§3.5, §16.4: never ship every dictionary). */
export function pickNamespaces(messages: Messages, namespaces: readonly string[]): Messages {
  return Object.fromEntries(namespaces.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]));
}
