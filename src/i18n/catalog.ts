// Reads UI message catalogs (Node only). Messages are split per feature:
// src/i18n/messages/{locale code}/{namespace}.json, so parallel sessions add their own
// file instead of editing a shared one (design doc §17.4). The file name is the namespace.
import fs from 'node:fs';
import path from 'node:path';

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

/** Only the namespaces a client island needs (§3.5, §16.4: never ship every dictionary). */
export function pickNamespaces(messages: Messages, namespaces: readonly string[]): Messages {
  return Object.fromEntries(namespaces.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]));
}
