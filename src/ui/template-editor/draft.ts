import type { FieldSpec, FieldValues } from '@/modules/template';
import { completeValues } from './values';

// Local drafts of template values (design doc §11.4, §11.6.2): one versioned record per template
// version, so values entered for v1 are never applied to the fields of v2. Only the values are
// stored. When storage is disabled, full or corrupt, editing and copying keep working for the
// session; a record that cannot be read is removed rather than half applied.

const PREFIX = 'prompt-library:template-draft:v1';

export const draftKey = (templateId: string, version: string) => `${PREFIX}:${templateId}:${version}`;

type DraftRecord = { values: FieldValues; savedAt: string };

function isRecord(value: unknown): value is DraftRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const values = (value as { values?: unknown }).values;
  if (!values || typeof values !== 'object' || Array.isArray(values)) return false;
  return Object.values(values).every(
    (v) => typeof v === 'string' || (Array.isArray(v) && v.every((item) => typeof item === 'string')),
  );
}

/** The saved values, complete for these fields, or null when there is no usable draft. */
export function readDraft(storage: Storage | undefined, key: string, fields: readonly FieldSpec[]): FieldValues | null {
  let raw: string | null;
  try {
    raw = storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // corrupt: removed below
  }
  if (!isRecord(parsed)) {
    removeDraft(storage, key);
    return null;
  }
  return completeValues(fields, parsed.values);
}

export function writeDraft(storage: Storage | undefined, key: string, values: FieldValues, now = new Date()): void {
  const record: DraftRecord = { values, savedAt: now.toISOString() };
  try {
    storage?.setItem(key, JSON.stringify(record));
  } catch {
    // storage full or disabled: the values still hold for this session
  }
}

export function removeDraft(storage: Storage | undefined, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // disabled: nothing was stored
  }
}

/** localStorage when the browser allows it; reading it can throw when site data is blocked. */
export function browserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
