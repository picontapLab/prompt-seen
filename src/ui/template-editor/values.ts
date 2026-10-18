import type { LocalizedField, TemplateSample } from '@/modules/content/types';
import { resolveValues, type FieldError, type FieldSpec, type FieldValues } from '@/modules/template';

// Values as the editor holds them (design doc §11.4, §11.8.4). Pure helpers without a 'use
// client' directive, so the server render, the browser and the unit tests share them.

/**
 * Every field with a value of its own type: text fields hold a string, lists an array, choices
 * their option value. Controlled inputs need one for every field, and values read from a draft
 * or a shared link go through here so a value of the wrong shape never reaches a control.
 */
export function completeValues(fields: readonly FieldSpec[], values: FieldValues): FieldValues {
  const resolved = resolveValues(fields, values);
  const complete: FieldValues = {};
  for (const field of fields) {
    const value = resolved[field.name];
    if (field.type === 'string-list') {
      complete[field.name] = Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
    } else if (field.type === 'enum') {
      const known = typeof value === 'string' && field.options.some((o) => o.value === value);
      complete[field.name] = known ? value : (field.default ?? field.options[0]?.value ?? '');
    } else {
      complete[field.name] = typeof value === 'string' ? value : '';
    }
  }
  return complete;
}

/** The values of sample `index`, complete. Sample 0 is `default` (§6.2). */
export function sampleValues(fields: readonly FieldSpec[], samples: readonly TemplateSample[], index: number) {
  return completeValues(fields, samples[index]?.values ?? {});
}

export function sameValues(a: FieldValues, b: FieldValues): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const x = a[key];
    const y = b[key];
    if (Array.isArray(x) || Array.isArray(y)) {
      if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.some((v, i) => v !== y[i])) return false;
    } else if ((x ?? '') !== (y ?? '')) return false;
  }
  return true;
}

/** Option values that read as a ratio ("4:5", "21:9"), drawn as small frames (§11.8.4). */
const RATIO = /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/;

export type ControlKind = 'text' | 'textarea' | 'tokens' | 'ratio' | 'swatch' | 'segments' | 'select';

/**
 * The control for a field (§11.8.4 控件选择): ratios as frames, palettes as swatches, up to four
 * options as segments, longer lists as a select, string lists as tokens.
 */
export function controlFor(field: FieldSpec): ControlKind {
  if (field.type === 'string') return field.multiline ? 'textarea' : 'text';
  if (field.type === 'string-list') return 'tokens';
  if (field.options.length > 0 && field.options.every((o) => RATIO.test(o.value))) return 'ratio';
  if (field.options.some((o) => o.swatch && o.swatch.length > 0)) return 'swatch';
  return field.options.length <= 4 ? 'segments' : 'select';
}

/** Width over height of a ratio value such as "21:9". */
export function ratioOf(value: string): number {
  const [w, h] = value.split(':').map(Number);
  return w && h ? w / h : 1;
}

/**
 * Which fields carry a marker (§11.8.4 必填标注): when most are required, only the optional ones
 * say "optional", and the other way round. Never a lone asterisk or colour.
 */
export function necessityMarker(fields: readonly FieldSpec[]): 'optional' | 'required' {
  const required = fields.filter((f) => f.required).length;
  return required * 2 >= fields.length ? 'optional' : 'required';
}

/** Fields that need attention, in form order: what "N fields to fill" counts (§11.4). */
export function fieldsWithErrors(fields: readonly FieldSpec[], errors: readonly FieldError[]): string[] {
  const names = new Set(errors.map((e) => e.field));
  return fields.filter((f) => names.has(f.name)).map((f) => f.name);
}

export type FieldGroup = {
  id: string | null;
  label: string | null;
  fields: { field: LocalizedField; index: number }[];
};

/**
 * Fields grouped by `group` (§11.8.4 字段分组), groups in order of first use and fields in their
 * definition order. `index` is the position in `fields`, which picks the variable colour.
 * Ungrouped fields come last.
 */
export function groupFields(fields: readonly LocalizedField[]): FieldGroup[] {
  const groups: FieldGroup[] = [];
  let ungrouped: FieldGroup | null = null;
  fields.forEach((field, index) => {
    if (field.group === null) {
      ungrouped ??= { id: null, label: null, fields: [] };
      ungrouped.fields.push({ field, index });
      return;
    }
    let group = groups.find((g) => g.id === field.group);
    if (!group) groups.push((group = { id: field.group, label: field.groupLabel ?? field.group, fields: [] }));
    group.fields.push({ field, index });
  });
  return ungrouped ? [...groups, ungrouped] : groups;
}

/** Variable colour of a field: the six var-* token pairs in field order (§11.1.1). */
export const varColor = (fieldIndex: number) => (Math.max(fieldIndex, 0) % 6) + 1;

/** Splits typed or pasted text on a list field's separator, dropping empty pieces (TokenInput). */
export function splitItems(text: string, separator: string): string[] {
  const mark = separator.trim() || separator;
  return (mark ? text.split(mark) : [text]).map((s) => s.trim()).filter(Boolean);
}
