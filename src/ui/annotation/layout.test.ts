import { describe, expect, it } from 'vitest';
import type { Annotation } from '@/modules/content/types';
import { placeAnnotations, promptExcerpt, splitPrompt } from './layout';

const text = 'Busy crossing at night. Pedestrians with dark umbrellas cross wide white stripes. Neon signs glow.';
const ann = (letter: string, phrase: string, region: Annotation['region']): Annotation => {
  const start = text.indexOf(phrase);
  return { letter, phrase, start, end: start + phrase.length, region, note: `${letter} note` };
};

const a = ann('A', 'dark umbrellas', { x: 0.1, y: 0.5, w: 0.3, h: 0.2 });
const b = ann('B', 'wide white stripes', { x: 0.05, y: 0.62, w: 0.9, h: 0.34 });
const c = ann('C', 'Neon signs', { x: 0.7, y: 0.1, w: 0.25, h: 0.2 });

describe('placeAnnotations', () => {
  it('puts the label on the nearer side when both are clear', () => {
    const [placed] = placeAnnotations([c]);
    expect(placed).toMatchObject({ letter: 'C', side: 'right', centerY: expect.closeTo(0.2) });
  });

  it('avoids a side whose leader would cross another box', () => {
    const blocker = ann('B', 'wide white stripes', { x: 0.75, y: 0.15, w: 0.2, h: 0.1 });
    expect(placeAnnotations([c, blocker])[0]!.side).toBe('right');
    const left = ann('A', 'dark umbrellas', { x: 0.6, y: 0.1, w: 0.1, h: 0.2 });
    const right = ann('B', 'wide white stripes', { x: 0.8, y: 0.1, w: 0.15, h: 0.2 });
    // A is nearer the right edge, but B sits between A and that edge.
    expect(placeAnnotations([left, right])[0]!.side).toBe('left');
  });

  it('lists overlapping boxes to hide while one is current', () => {
    const placed = placeAnnotations([a, b, c]);
    expect(placed.find((p) => p.letter === 'A')!.hides).toEqual(['B']);
    expect(placed.find((p) => p.letter === 'C')!.hides).toEqual([]);
  });

  it('moves corner labels below boxes that touch the top edge', () => {
    const top = ann('C', 'Neon signs', { x: 0.1, y: 0.02, w: 0.3, h: 0.2 });
    expect(placeAnnotations([top])[0]!.cornerBelow).toBe(true);
  });
});

describe('splitPrompt', () => {
  it('cuts the text into runs and phrases in order', () => {
    const pieces = splitPrompt(text, [b, a]);
    expect(pieces.map((p) => p.annotation?.letter ?? p.text)).toEqual([
      'Busy crossing at night. Pedestrians with ',
      'A',
      ' cross ',
      'B',
      '. Neon signs glow.',
    ]);
    expect(pieces.map((p) => p.text).join('')).toBe(text);
  });

  it('keeps text intact when an annotation does not match its offsets', () => {
    const stale = { ...a, start: 0, end: 5 };
    expect(splitPrompt(text, [stale])).toEqual([{ text, annotation: null }]);
  });
});

describe('promptExcerpt', () => {
  const long = `${'First sentence sets the scene. '}${'Filler words that go on. '.repeat(20)}Ending.`;

  it('returns short prompts whole', () => {
    expect(promptExcerpt(text, [a, b, c])).toEqual({ text, truncated: false, annotations: [a, b, c] });
  });

  it('cuts after the sentence holding the last annotation', () => {
    const phrase = 'Filler words';
    const start = long.indexOf(phrase, 40);
    const x: Annotation = { ...a, phrase, start, end: start + phrase.length };
    const out = promptExcerpt(long, [x], 200);
    expect(out.truncated).toBe(true);
    expect(out.text.endsWith('go on.')).toBe(true);
    expect(out.text.length).toBeLessThan(long.length);
    expect(out.annotations).toEqual([x]);
  });

  it('keeps at least the first sentence and drops annotations past the cut', () => {
    const phrase = 'Ending';
    const start = long.indexOf(phrase);
    const late: Annotation = { ...a, phrase, start, end: start + phrase.length };
    const out = promptExcerpt(long, [late], 60);
    expect(out.text).toBe(long.slice(0, start + phrase.length + 1).trimEnd());
    expect(out.annotations).toEqual([late]);
    const none = promptExcerpt(long, [], 60);
    expect(none.text).toBe('First sentence sets the scene.');
    expect(none.annotations).toEqual([]);
  });

  it('understands CJK sentence ends', () => {
    const zh = `第一句话。${'很长的描述'.repeat(80)}。结尾。`;
    expect(promptExcerpt(zh, [], 60).text).toBe('第一句话。');
  });
});
