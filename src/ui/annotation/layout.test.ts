import { describe, expect, it } from 'vitest';
import type { Annotation } from '@/modules/content/types';
import { displayWidth, fitAnnotatedExcerpt, placeAnnotations, promptExcerpt, splitPrompt } from './layout';

const text = 'Busy crossing at night. Pedestrians with dark umbrellas cross wide white stripes. Neon signs glow.';
const ann = (letter: string, phrase: string, region: Annotation['region']): Annotation => {
  const start = text.indexOf(phrase);
  return { letter, phrase, start, end: start + phrase.length, region, note: `${letter} note` };
};

const a = ann('A', 'dark umbrellas', { x: 0.1, y: 0.5, w: 0.3, h: 0.2 });
const b = ann('B', 'wide white stripes', { x: 0.05, y: 0.62, w: 0.9, h: 0.34 });
const c = ann('C', 'Neon signs', { x: 0.7, y: 0.1, w: 0.25, h: 0.2 });

it('keeps separated annotated phrases selectable in a compact home quote', () => {
  const excerpt = fitAnnotatedExcerpt(promptExcerpt(text, [a, c]), 35);
  expect(displayWidth(excerpt.text)).toBeLessThanOrEqual(35);
  expect(excerpt.text).toContain(' … ');
  expect(
    splitPrompt(excerpt.text, excerpt.annotations)
      .filter((piece) => piece.annotation)
      .map((piece) => piece.text),
  ).toEqual([a.phrase, c.phrase]);
});

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
    expect(promptExcerpt(text, [a, b, c])).toEqual({
      text,
      truncated: false,
      truncatedStart: false,
      annotations: [a, b, c],
    });
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

  it('measures the budget in display width, so CJK text counts double', () => {
    const zh = `${'绿茶罐海报'.repeat(10)}。${'柔和的背景'.repeat(10)}。`; // 102 characters, width 204
    expect(promptExcerpt(zh, [], 160).truncated).toBe(true);
    expect(promptExcerpt(zh, [], 204).truncated).toBe(false);
    const en = 'x'.repeat(150);
    expect(promptExcerpt(en, [], 160).truncated).toBe(false);
  });
});

describe('displayWidth', () => {
  it('counts CJK ideographs, kana, Hangul and full-width forms as two', () => {
    expect(displayWidth('Tab')).toBe(3);
    expect(displayWidth('看见')).toBe(4);
    expect(displayWidth('フレーズ')).toBe(8); // the long-vowel mark too
    expect(displayWidth('문구')).toBe(4);
    expect(displayWidth('，。、「」')).toBe(10);
    expect(displayWidth('Ａ１')).toBe(4);
    expect(displayWidth('Ä é ß ж ع')).toBe(9);
  });
});

describe('promptExcerpt with dropLeading', () => {
  const prompt =
    'Draw the whole scene as a flat vector illustration with clean outlines and soft shadows. ' +
    'Create an editorial poster for a tea tin on a soft circular backdrop. ' +
    'Show the selling points: airtight lid; single estate. ' +
    'Palette: sage green. Leave the headline bars blank.';
  const at = (letter: string, phrase: string): Annotation => {
    const start = prompt.indexOf(phrase);
    return { letter, phrase, start, end: start + phrase.length, region: a.region, note: `${letter} note` };
  };
  const backdrop = at('A', 'a soft circular backdrop');
  const estate = at('B', 'single estate');

  it('starts at the sentence holding the first annotation when the opening does not fit', () => {
    const out = promptExcerpt(prompt, [backdrop, estate], 160, { dropLeading: true });
    expect(out.text).toBe(
      'Create an editorial poster for a tea tin on a soft circular backdrop. Show the selling points: airtight lid; single estate.',
    );
    expect(out).toMatchObject({ truncated: true, truncatedStart: true });
    // Offsets point into the excerpt, so every phrase still splits out of the quote.
    expect(
      splitPrompt(out.text, out.annotations)
        .filter((p) => p.annotation)
        .map((p) => p.text),
    ).toEqual(['a soft circular backdrop', 'single estate']);
  });

  it('keeps the opening when it fits, when the first sentence holds a phrase, or without annotations', () => {
    expect(promptExcerpt(prompt, [backdrop, estate], 400, { dropLeading: true }).truncatedStart).toBe(false);
    const opening = at('A', 'flat vector illustration');
    expect(promptExcerpt(prompt, [opening, estate], 160, { dropLeading: true }).truncatedStart).toBe(false);
    expect(promptExcerpt(prompt, [], 60, { dropLeading: true })).toMatchObject({
      text: 'Draw the whole scene as a flat vector illustration with clean outlines and soft shadows.',
      truncatedStart: false,
    });
    expect(promptExcerpt(prompt, [backdrop, estate], 160).truncatedStart).toBe(false);
  });

  it('never drops an annotation to stay inside the budget', () => {
    const blank = at('C', 'headline bars blank');
    const out = promptExcerpt(prompt, [backdrop, estate, blank], 60, { dropLeading: true });
    expect(out.annotations.map((x) => x.letter)).toEqual(['A', 'B', 'C']);
    expect(out.text.startsWith('Create an editorial poster')).toBe(true);
    expect(out.truncated).toBe(false);
  });

  it('works on CJK prompts', () => {
    const zh =
      '将产品本身和整个场景绘制为二维扁平矢量插画：使用简洁的纯色色块、清晰轮廓和少量平面阴影。 为散叶绿茶罐创作一张编辑类产品海报，置于柔和的圆形背景之上。 通过画面表现这些核心卖点：密封罐盖；单一产地。 配色：鼠尾草绿。';
    const pick = (letter: string, phrase: string): Annotation => {
      const start = zh.indexOf(phrase);
      return { letter, phrase, start, end: start + phrase.length, region: a.region, note: '' };
    };
    const out = promptExcerpt(zh, [pick('A', '柔和的圆形背景'), pick('B', '单一产地')], 160, { dropLeading: true });
    expect(out.text).toBe(
      '为散叶绿茶罐创作一张编辑类产品海报，置于柔和的圆形背景之上。 通过画面表现这些核心卖点：密封罐盖；单一产地。',
    );
    expect(out).toMatchObject({ truncated: true, truncatedStart: true });
  });
});
