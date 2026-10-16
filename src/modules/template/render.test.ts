import { describe, expect, it } from 'vitest';
import { parseTemplateBody, placeholderNames } from './parse';
import { graphemeLength, renderTemplate, validateValues } from './render';
import type { FieldSpec, TemplateVersionSpec } from './types';

// Rules from design doc §6.3 and §16.3: variable validation, defaults, output stability.

const product: FieldSpec = {
  name: 'product',
  type: 'string',
  required: true,
  group: 'subject',
  default: null,
  minLength: null,
  maxLength: 12,
  multiline: false,
};
const sellingPoints: FieldSpec = {
  name: 'sellingPoints',
  type: 'string-list',
  required: true,
  group: 'subject',
  default: null,
  minItems: 1,
  maxItems: 3,
  itemMaxLength: 10,
  separator: '; ',
};
const palette: FieldSpec = {
  name: 'palette',
  type: 'enum',
  required: true,
  group: 'style',
  default: 'warm neutral',
  options: [
    { value: 'warm neutral', swatch: ['#D8C3A5'] },
    { value: 'monochrome', swatch: null },
  ],
};
const headline: FieldSpec = {
  name: 'headline',
  type: 'string',
  required: false,
  group: 'text',
  default: null,
  minLength: null,
  maxLength: null,
  multiline: false,
};

const version: TemplateVersionSpec = {
  body: 'Poster for {{product}}.\nPoints: {{sellingPoints}}.\nPalette: {{palette}}.\nHeadline: "{{headline}}"\n',
  fields: [product, sellingPoints, palette, headline],
};

describe('parseTemplateBody', () => {
  it('splits text and placeholders with positions', () => {
    const { segments, problems } = parseTemplateBody('A {{product}}\nB {{palette}} {{product}}');
    expect(problems).toEqual([]);
    expect(segments).toEqual([
      { kind: 'text', text: 'A ' },
      { kind: 'field', name: 'product', line: 1, column: 3 },
      { kind: 'text', text: '\nB ' },
      { kind: 'field', name: 'palette', line: 2, column: 3 },
      { kind: 'text', text: ' ' },
      { kind: 'field', name: 'product', line: 2, column: 15 },
    ]);
    expect(placeholderNames(segments)).toEqual(['product', 'palette']);
  });

  it('reports malformed placeholders once, with their position', () => {
    const { problems } = parseTemplateBody('ok\nx {{ product }} y {{Bad}} z {{open');
    expect(problems.map((p) => [p.line, p.column])).toEqual([
      [2, 3],
      [2, 19],
      [2, 29],
    ]);
    expect(parseTemplateBody('a }} b').problems).toHaveLength(1);
  });

  it('leaves single braces alone', () => {
    expect(parseTemplateBody('{"style": {x}}').problems).toHaveLength(1); // only the stray "}}"
    expect(parseTemplateBody('{"style": "x"}').problems).toEqual([]);
  });
});

describe('renderTemplate', () => {
  it('renders with defaults, list separators and enum values', () => {
    const result = renderTemplate(version, { product: 'Mug', sellingPoints: ['handmade', 'matte'] });
    expect(result.ok).toBe(true);
    expect(result.text).toBe('Poster for Mug.\nPoints: handmade; matte.\nPalette: warm neutral.\nHeadline: ""');
    expect(result.values.palette).toBe('warm neutral');
  });

  it('is stable: the same input always gives the same output', () => {
    const values = { product: 'Mug', sellingPoints: ['a', 'b'], palette: 'monochrome', headline: 'Hi' };
    const outputs = new Set(Array.from({ length: 5 }, () => renderTemplate(version, values).text));
    expect(outputs.size).toBe(1);
  });

  it('never claims a complete prompt when a required value is missing', () => {
    const result = renderTemplate(version, { sellingPoints: ['a'] });
    expect(result.ok).toBe(false);
    expect(result.text).toBeNull();
    expect(result.errors).toEqual([{ field: 'product', code: 'required' }]);
    const seg = result.segments.find((s) => s.kind === 'field' && s.name === 'product');
    expect(seg).toMatchObject({ invalid: true, text: '', fieldIndex: 0 });
  });

  it('inserts values once and does not interpret placeholders inside them', () => {
    const result = renderTemplate(version, { product: '{{palette}}', sellingPoints: ['x'] });
    expect(result.text).toContain('Poster for {{palette}}.');
  });

  it('uses the edited value instead of the default, and an emptied optional field becomes ""', () => {
    const result = renderTemplate(version, {
      product: 'Mug',
      sellingPoints: ['x'],
      palette: 'monochrome',
      headline: '',
    });
    expect(result.text).toContain('Palette: monochrome.');
    expect(result.text).toContain('Headline: ""');
  });

  it('normalizes CRLF and trims the output, so preview, copy and download match', () => {
    const result = renderTemplate(
      { ...version, body: '\r\n' + version.body.replace(/\n/g, '\r\n') },
      {
        product: ' Mug ',
        sellingPoints: [' a '],
        headline: 'two\r\nlines',
      },
    );
    expect(result.text).not.toMatch(/\r/);
    expect(result.text?.startsWith('Poster for Mug.')).toBe(true);
    expect(result.text).toContain('Points: a.');
    expect(result.text).toContain('"two\nlines"');
  });

  it('reports a placeholder with no field definition', () => {
    const result = renderTemplate({ body: 'x {{missing}}', fields: [] });
    expect(result.ok).toBe(false);
    expect(result.segments[1]).toMatchObject({ kind: 'field', name: 'missing', fieldIndex: -1, invalid: true });
  });
});

describe('validateValues', () => {
  it('checks limits in grapheme clusters', () => {
    expect(graphemeLength('café')).toBe(4);
    expect(graphemeLength('🇯🇵👍🏽')).toBe(2);
    expect(validateValues([product], { product: '🇯🇵'.repeat(12) })).toEqual([]);
    expect(validateValues([product], { product: 'x'.repeat(13) })).toEqual([
      { field: 'product', code: 'too-long', limit: 12, actual: 13 },
    ]);
  });

  it('checks list counts, empty items and item length', () => {
    expect(validateValues([sellingPoints], { sellingPoints: [] })).toEqual([
      { field: 'sellingPoints', code: 'required' },
    ]);
    expect(validateValues([sellingPoints], { sellingPoints: ['a', 'b', 'c', 'd'] })).toEqual([
      { field: 'sellingPoints', code: 'too-many', limit: 3, actual: 4 },
    ]);
    expect(validateValues([sellingPoints], { sellingPoints: ['a', ' ', 'x'.repeat(11)] })).toEqual([
      { field: 'sellingPoints', code: 'empty-item', item: 1 },
      { field: 'sellingPoints', code: 'item-too-long', item: 2, limit: 10, actual: 11 },
    ]);
  });

  it('rejects unknown enum values and wrong types', () => {
    expect(validateValues([palette], { palette: 'neon' })).toEqual([{ field: 'palette', code: 'invalid-option' }]);
    expect(validateValues([palette], { palette: ['monochrome'] })).toEqual([{ field: 'palette', code: 'wrong-type' }]);
    expect(validateValues([sellingPoints], { sellingPoints: 'a; b' })).toEqual([
      { field: 'sellingPoints', code: 'wrong-type' },
    ]);
  });

  it('treats whitespace-only input as empty', () => {
    expect(validateValues([product], { product: '   ' })).toEqual([{ field: 'product', code: 'required' }]);
    expect(validateValues([headline], { headline: '   ' })).toEqual([]);
  });
});
