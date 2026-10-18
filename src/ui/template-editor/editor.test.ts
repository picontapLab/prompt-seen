import { describe, expect, it } from 'vitest';
import type { LocalizedField, TemplateSample } from '@/modules/content/types';
import { renderTemplate } from '@/modules/template';
import { draftKey, readDraft, removeDraft, writeDraft } from './draft';
import { editorReducer, initialEditorState, visibleErrors } from './editor-state';
import { decodeShare, encodeShare } from './share';
import {
  completeValues,
  controlFor,
  fieldsWithErrors,
  groupFields,
  necessityMarker,
  ratioOf,
  sameValues,
  sampleValues,
  splitItems,
} from './values';

// The editor's pure parts (design doc §11.4, §11.6.2, §11.8.4): values, controls, shared links,
// drafts and state. The behaviour in a browser is tested in tests/e2e/editor.browser.spec.ts.

const label = (name: string) => ({ label: name, help: null, groupLabel: null, optionLabels: {} });

const product: LocalizedField = {
  ...label('Product'),
  name: 'product',
  type: 'string',
  required: true,
  group: 'subject',
  groupLabel: 'Subject',
  default: null,
  minLength: null,
  maxLength: 12,
  multiline: false,
};
const points: LocalizedField = {
  ...label('Selling points'),
  name: 'points',
  type: 'string-list',
  required: true,
  group: 'subject',
  groupLabel: 'Subject',
  default: null,
  minItems: 1,
  maxItems: 3,
  itemMaxLength: 10,
  separator: '; ',
};
const palette: LocalizedField = {
  ...label('Palette'),
  name: 'palette',
  type: 'enum',
  required: true,
  group: 'style',
  groupLabel: 'Style',
  default: 'warm',
  options: [
    { value: 'warm', swatch: ['#E8DCC8'] },
    { value: 'cool', swatch: ['#1F2A44'] },
  ],
};
const ratio: LocalizedField = {
  ...label('Aspect ratio'),
  name: 'ratio',
  type: 'enum',
  required: true,
  group: 'composition',
  groupLabel: 'Composition',
  default: '4:5',
  options: ['4:5', '1:1', '21:9'].map((value) => ({ value, swatch: null })),
};
const headline: LocalizedField = {
  ...label('Headline'),
  name: 'headline',
  type: 'string',
  required: false,
  group: null,
  default: null,
  minLength: null,
  maxLength: null,
  multiline: false,
};
const fields = [product, points, palette, ratio, headline];
const samples: TemplateSample[] = [
  { name: 'default', values: { product: 'Mug', points: ['handmade'], palette: 'warm', ratio: '4:5', headline: 'Hi' } },
  { name: 'tin', values: { product: 'Tin', points: ['airtight'], palette: 'cool', ratio: '1:1' } },
];
const spec = { body: '{{product}}: {{points}}. {{palette}} {{ratio}} {{headline}}', fields };

describe('values', () => {
  it('completes values with defaults and empty values of the right shape', () => {
    expect(completeValues(fields, {})).toEqual({
      product: '',
      points: [],
      palette: 'warm',
      ratio: '4:5',
      headline: '',
    });
    expect(completeValues(fields, { product: ['x'] as never, palette: 'neon', points: 'a' as never })).toEqual({
      product: '',
      points: [],
      palette: 'warm',
      ratio: '4:5',
      headline: '',
    });
    expect(sampleValues(fields, samples, 1)).toMatchObject({ product: 'Tin', headline: '' });
  });

  it('compares values field by field', () => {
    expect(sameValues({ a: ['x'], b: '' }, { a: ['x'] })).toBe(true);
    expect(sameValues({ a: ['x'] }, { a: ['x', 'y'] })).toBe(false);
    expect(sameValues({ a: 'x' }, { a: ['x'] })).toBe(false);
  });

  it('picks a control per field (§11.8.4)', () => {
    expect(fields.map(controlFor)).toEqual(['text', 'tokens', 'swatch', 'ratio', 'text']);
    expect(controlFor({ ...headline, multiline: true })).toBe('textarea');
    const choice = { ...palette, options: palette.options.map((o) => ({ ...o, swatch: null })) };
    expect(controlFor(choice)).toBe('segments');
    const many = { ...choice, options: ['a', 'b', 'c', 'd', 'e'].map((value) => ({ value, swatch: null })) };
    expect(controlFor(many)).toBe('select');
    expect(ratioOf('21:9')).toBeCloseTo(21 / 9);
  });

  it('marks the minority: optional fields when most are required', () => {
    expect(necessityMarker(fields)).toBe('optional');
    expect(necessityMarker([headline, { ...headline, name: 'b' }, product])).toBe('required');
  });

  it('groups fields in order of first use, ungrouped last, keeping each field index', () => {
    expect(groupFields(fields).map((g) => [g.id, g.fields.map((f) => f.index)])).toEqual([
      ['subject', [0, 1]],
      ['style', [2]],
      ['composition', [3]],
      [null, [4]],
    ]);
  });

  it('lists fields needing attention in form order', () => {
    const { errors } = renderTemplate(spec, { ...sampleValues(fields, samples, 0), points: [], product: '' });
    expect(fieldsWithErrors(fields, errors)).toEqual(['product', 'points']);
  });
});

describe('shared links', () => {
  it('round-trips values, Unicode included, in field order', () => {
    const values = { headline: '手作り ☕️', product: 'Mug "A"', points: ['a; b', 'c'] };
    const fragment = encodeShare('v2', values, fields);
    expect(fragment).toMatch(/^v2=[A-Za-z0-9_-]+$/);
    expect(decodeShare(`#${fragment}`, fields)).toEqual({
      version: 'v2',
      values: { product: 'Mug "A"', points: ['a; b', 'c'], headline: '手作り ☕️' },
    });
    expect(encodeShare('v2', { headline: 'x', product: 'y' }, fields)).toBe(
      encodeShare('v2', { product: 'y', headline: 'x' }, fields),
    );
  });

  it('ignores anchors, broken payloads and values of the wrong shape', () => {
    expect(decodeShare('#examples', fields)).toBeNull();
    expect(decodeShare('', fields)).toBeNull();
    expect(decodeShare('#v1=%%%', fields)).toBeNull();
    expect(decodeShare('#v1=bm90IGpzb24', fields)).toBeNull(); // "not json"
    const odd = encodeShare('v1', { product: 3, points: 'x', palette: 'cool', unknown: 'y' } as never);
    expect(decodeShare(odd, fields)).toEqual({ version: 'v1', values: { palette: 'cool' } });
  });

  it('caps what a pasted address can put in the editor', () => {
    const long = encodeShare('v1', { product: 'x'.repeat(10_000) }, fields);
    expect((decodeShare(long, fields)!.values.product as string).length).toBe(4000);
    expect(decodeShare(`v1=${'A'.repeat(20_000)}`, fields)).toBeNull();
  });
});

function memoryStorage(fail = false): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => {
      if (fail) throw new Error('blocked');
      return data.get(k) ?? null;
    },
    setItem: (k, v) => {
      if (fail) throw new Error('quota');
      data.set(k, v);
    },
    removeItem: (k) => {
      if (fail) throw new Error('blocked');
      data.delete(k);
    },
  };
}

describe('drafts', () => {
  const key = draftKey('t_001', 'v2');

  it('keys drafts by template and version (§11.6.2)', () => {
    expect(key).toBe('prompt-library:template-draft:v1:t_001:v2');
    expect(draftKey('t_001', 'v1')).not.toBe(key);
  });

  it('stores only the values and reads them back complete', () => {
    const storage = memoryStorage();
    writeDraft(storage, key, { product: 'Cup', points: ['x'] }, new Date('2026-10-17T00:00:00Z'));
    expect(JSON.parse(storage.getItem(key)!)).toEqual({
      values: { product: 'Cup', points: ['x'] },
      savedAt: '2026-10-17T00:00:00.000Z',
    });
    expect(readDraft(storage, key, fields)).toMatchObject({ product: 'Cup', points: ['x'], palette: 'warm' });
    removeDraft(storage, key);
    expect(readDraft(storage, key, fields)).toBeNull();
  });

  it('removes a corrupt record instead of applying part of it', () => {
    const storage = memoryStorage();
    storage.setItem(key, '{"values":{"product":3}}');
    expect(readDraft(storage, key, fields)).toBeNull();
    expect(storage.getItem(key)).toBeNull();
    storage.setItem(key, 'not json');
    expect(readDraft(storage, key, fields)).toBeNull();
  });

  it('keeps working when storage is disabled or full', () => {
    const storage = memoryStorage(true);
    expect(() => writeDraft(storage, key, { product: 'x' })).not.toThrow();
    expect(readDraft(storage, key, fields)).toBeNull();
    expect(readDraft(undefined, key, fields)).toBeNull();
  });
});

describe('editor state', () => {
  const start = initialEditorState(sampleValues(fields, samples, 0));

  it('changes one value and pulses only that field (§11.8.4 局部反馈)', () => {
    const next = editorReducer(start, { type: 'edit', field: 'product', value: 'Cup' });
    expect(next.values.product).toBe('Cup');
    expect(next.pulses).toEqual({ product: 1 });
    expect(editorReducer(next, { type: 'edit', field: 'product', value: 'Cup' })).toBe(next);
  });

  it('shows a missing value once the field was left, a limit at once, everything after a blocked copy', () => {
    let state = editorReducer(start, { type: 'edit', field: 'product', value: '' });
    state = editorReducer(state, { type: 'edit', field: 'headline', value: 'x' });
    state = editorReducer(state, { type: 'edit', field: 'points', value: ['x'.repeat(11)] });
    const { errors } = renderTemplate(spec, state.values);
    expect(visibleErrors(state, errors).map((e) => e.code)).toEqual(['item-too-long']);
    const touched = editorReducer(state, { type: 'touch', field: 'product' });
    expect(visibleErrors(touched, errors).map((e) => e.field)).toEqual(['product', 'points']);
    const revealed = editorReducer(state, { type: 'reveal' });
    expect(visibleErrors(revealed, errors)).toHaveLength(2);
  });

  it('loads a sample, a draft or an undo: values replaced, errors hidden, changed fields pulsed', () => {
    const edited = editorReducer(editorReducer(start, { type: 'touch', field: 'product' }), { type: 'reveal' });
    const loaded = editorReducer(edited, { type: 'load', values: sampleValues(fields, samples, 1), sample: 1 });
    expect(loaded).toMatchObject({ sample: 1, touched: [], reveal: false, notice: null });
    expect(Object.keys(loaded.pulses).sort()).toEqual(['headline', 'palette', 'points', 'product', 'ratio']);
    const restored = editorReducer(start, { type: 'load', values: start.values, notice: { kind: 'restored' } });
    expect(restored.pulses).toEqual({});
    expect(restored.notice).toEqual({ kind: 'restored' });
  });

  it('clears a restored notice on the next edit but keeps a version mismatch in view', () => {
    const restored = editorReducer(start, { type: 'load', values: start.values, notice: { kind: 'restored' } });
    expect(editorReducer(restored, { type: 'edit', field: 'product', value: 'x' }).notice).toBeNull();
    const mismatch = editorReducer(start, {
      type: 'load',
      values: start.values,
      notice: { kind: 'mismatch', version: 'v1' },
    });
    expect(editorReducer(mismatch, { type: 'edit', field: 'product', value: 'x' }).notice).toEqual({
      kind: 'mismatch',
      version: 'v1',
    });
  });
});

describe('TokenInput', () => {
  it('splits typed or pasted text on the separator, dropping empty pieces', () => {
    expect(splitItems('a; b ;; c', '; ')).toEqual(['a', 'b', 'c']);
    expect(splitItems('five stalks, drifting leaves', ', ')).toEqual(['five stalks', 'drifting leaves']);
    expect(splitItems('  one  ', '; ')).toEqual(['one']);
  });
});
