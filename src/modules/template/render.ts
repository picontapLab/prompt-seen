import { parseTemplateBody } from './parse';
import type { FieldError, FieldSpec, FieldValues, RenderResult, RenderedSegment, TemplateVersionSpec } from './types';

// Template rendering (design doc §6.3). Pure functions shared by the build, the template page
// and the editor (step 3c), so the default prompt in the HTML, the live preview, the copied
// text and the downloaded file are the same string. Nothing here evaluates field contents:
// values are inserted once, as text, and never scanned for placeholders again.

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

/** Length in grapheme clusters, so "é" or a flag emoji counts as one character (§13.2). */
export function graphemeLength(value: string): number {
  if (!segmenter) return Array.from(value).length;
  return Array.from(segmenter.segment(value)).length;
}

const toLf = (value: string) => value.replace(/\r\n?/g, '\n');

/** Values with defaults filled in for fields the caller did not provide. */
export function resolveValues(fields: readonly FieldSpec[], values: FieldValues): FieldValues {
  const resolved: FieldValues = {};
  for (const field of fields) {
    const given = values[field.name];
    if (given !== undefined) resolved[field.name] = given;
    else if (field.default !== null) resolved[field.name] = field.default;
  }
  return resolved;
}

function checkField(field: FieldSpec, value: string | string[] | undefined): FieldError[] {
  const errors: FieldError[] = [];
  const err = (e: Omit<FieldError, 'field'>) => errors.push({ field: field.name, ...e });

  if (field.type === 'string-list') {
    if (value !== undefined && !Array.isArray(value)) return [{ field: field.name, code: 'wrong-type' }];
    const items = (value ?? []).map((item) => toLf(item).trim());
    const min = Math.max(field.minItems ?? 0, field.required ? 1 : 0);
    items.forEach((item, index) => {
      if (!item) err({ code: 'empty-item', item: index });
      else if (field.itemMaxLength !== null && graphemeLength(item) > field.itemMaxLength)
        err({ code: 'item-too-long', item: index, limit: field.itemMaxLength, actual: graphemeLength(item) });
    });
    if (items.length === 0 && field.required) err({ code: 'required' });
    else if (items.length < min) err({ code: 'too-few', limit: min, actual: items.length });
    if (field.maxItems !== null && items.length > field.maxItems)
      err({ code: 'too-many', limit: field.maxItems, actual: items.length });
    return errors;
  }

  if (value !== undefined && typeof value !== 'string') return [{ field: field.name, code: 'wrong-type' }];
  const text = toLf(value ?? '').trim();

  if (field.type === 'enum') {
    if (!text) {
      if (field.required) err({ code: 'required' });
    } else if (!field.options.some((o) => o.value === text)) err({ code: 'invalid-option' });
    return errors;
  }

  if (!text) {
    if (field.required) err({ code: 'required' });
    return errors;
  }
  const length = graphemeLength(text);
  if (field.minLength !== null && length < field.minLength)
    err({ code: 'too-short', limit: field.minLength, actual: length });
  if (field.maxLength !== null && length > field.maxLength)
    err({ code: 'too-long', limit: field.maxLength, actual: length });
  return errors;
}

/** Problems with the values, after defaults; empty when the prompt can be rendered. */
export function validateValues(fields: readonly FieldSpec[], values: FieldValues): FieldError[] {
  const resolved = resolveValues(fields, values);
  return fields.flatMap((field) => checkField(field, resolved[field.name]));
}

/** The text a value contributes to the prompt (§6.3): lists joined, enums by value, trimmed. */
export function serializeValue(field: FieldSpec, value: string | string[] | undefined): string {
  if (value === undefined) return '';
  if (field.type === 'enum' && typeof value === 'string') {
    const option = field.options.find((o) => o.value === toLf(value).trim());
    if (option?.renderText !== undefined) return option.renderText;
  }
  if (field.type === 'string-list') {
    return (Array.isArray(value) ? value : [value])
      .map((item) => toLf(item).trim())
      .filter(Boolean)
      .join(field.separator);
  }
  return toLf(Array.isArray(value) ? value.join(' ') : value).trim();
}

/**
 * Renders a template version with the given values (§6.3). Missing values use the field
 * defaults; optional empty values become empty strings. When any value is invalid the result
 * has `ok: false` and `text: null` (never a prompt that claims to be complete), but the
 * segments are still returned so the preview can show where input is needed.
 */
export function renderTemplate(version: TemplateVersionSpec, values: FieldValues = {}): RenderResult {
  const resolved = resolveValues(version.fields, values);
  const errors = version.fields.flatMap((field) => checkField(field, resolved[field.name]));
  const invalid = new Set(errors.map((e) => e.field));
  const { segments: body, problems } = parseTemplateBody(toLf(version.body));

  const segments: RenderedSegment[] = body.map((segment) => {
    if (segment.kind === 'text') return segment;
    const fieldIndex = version.fields.findIndex((f) => f.name === segment.name);
    const field = version.fields[fieldIndex];
    if (!field) return { kind: 'field', name: segment.name, fieldIndex, text: `{{${segment.name}}}`, invalid: true };
    return {
      kind: 'field',
      name: segment.name,
      fieldIndex,
      text: serializeValue(field, resolved[segment.name]),
      invalid: invalid.has(segment.name),
    };
  });

  const undefinedField = segments.some((s) => s.kind === 'field' && s.fieldIndex < 0);
  const ok = errors.length === 0 && problems.length === 0 && !undefinedField;
  return {
    ok,
    text: ok
      ? segments
          .map((s) => s.text)
          .join('')
          .trim()
      : null,
    segments,
    errors,
    values: resolved,
  };
}
