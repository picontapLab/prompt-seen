import { sha256 } from '../content/read';

/** Stable field fingerprints: YAML mapping order is not a translation change. */
export function fingerprint(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, v]) => [key, normalize(v)]),
      );
    return typeof item === 'string' ? item.replace(/\r\n?/g, '\n').trim() : item;
  };
  return `sha256:${sha256(JSON.stringify(normalize(value ?? null)))}`;
}
