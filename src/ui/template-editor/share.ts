import type { FieldSpec, FieldValues } from '@/modules/template';

// Filled-in values in a link's fragment (design doc §11.8.4 分享填写结果): `#v2=<payload>`, where
// v2 is the template version and the payload is the values as base64url-encoded UTF-8 JSON. The
// fragment never reaches a server, so the values stay in the browser that opens the link.

const FRAGMENT = /^#?([A-Za-z0-9][\w.-]*)=([A-Za-z0-9_-]+)$/;

/** Long enough for any real prompt; a pasted address cannot make the editor hold megabytes. */
const MAX_PAYLOAD = 16_384;
const MAX_TEXT = 4_000;
const MAX_ITEMS = 50;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(payload: string): string | null {
  try {
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * The fragment for these values, without "#". With `fields`, keys follow the template's field
 * order and unknown keys are left out, so the same values always give the same link.
 */
export function encodeShare(version: string, values: FieldValues, fields?: readonly Pick<FieldSpec, 'name'>[]): string {
  let ordered: FieldValues = values;
  if (fields) {
    ordered = {};
    for (const field of fields) {
      const value = values[field.name];
      if (value !== undefined) ordered[field.name] = value;
    }
  }
  return `${version}=${toBase64Url(JSON.stringify(ordered))}`;
}

export type SharedValues = { version: string; values: FieldValues };

/**
 * Reads a fragment written by encodeShare. Returns null for anything else, including an address
 * fragment that is just an anchor. Values keep only the template's fields, each with the shape
 * of its type; the caller decides what a version mismatch means.
 */
export function decodeShare(hash: string, fields: readonly FieldSpec[]): SharedValues | null {
  const match = FRAGMENT.exec(hash);
  if (!match || match[2]!.length > MAX_PAYLOAD) return null;
  const json = fromBase64Url(match[2]!);
  if (json === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  const values: FieldValues = {};
  for (const field of fields) {
    const value = record[field.name];
    if (field.type === 'string-list') {
      if (Array.isArray(value))
        values[field.name] = value
          .filter((v): v is string => typeof v === 'string')
          .slice(0, MAX_ITEMS)
          .map((v) => v.slice(0, MAX_TEXT));
    } else if (typeof value === 'string') {
      values[field.name] = value.slice(0, MAX_TEXT);
    }
  }
  return { version: match[1]!, values };
}
