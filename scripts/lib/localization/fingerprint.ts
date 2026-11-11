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

export function proseFingerprint(prose: {
  title: string;
  description: string;
  body: string;
  seoTitle?: string;
  seoDescription?: string;
  reasons?: Record<string, string>;
}): string {
  return fingerprint({
    title: prose.title,
    description: prose.description,
    body: prose.body,
    seoTitle: prose.seoTitle ?? null,
    seoDescription: prose.seoDescription ?? null,
    reasons: prose.reasons ?? {},
  });
}

/** Owners at numeric paths survive text equality, but not a move to another entity. */
export function entityFingerprint(file: string, document: unknown, parts: (string | number)[]): string {
  let value = document;
  const owners: unknown[] = [file];
  for (const part of parts.slice(0, -1)) {
    if (!value || typeof value !== 'object') break;
    value = (value as Record<string | number, unknown>)[part];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      for (const key of ['id', 'name', 'value']) if (typeof record[key] === 'string') owners.push([key, record[key]]);
    }
  }
  return fingerprint(owners);
}
