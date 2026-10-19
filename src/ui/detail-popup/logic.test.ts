import { describe, expect, it } from 'vitest';
import { classifySwipe, flipTransform, isPlainClick, isVisibleBox, matchPromptPath, uniqueBySlug } from './logic';

describe('matchPromptPath', () => {
  it('recognises a detail address of the locale', () => {
    expect(matchPromptPath('/en/prompts/ink-portrait/', 'en')).toBe('ink-portrait');
    expect(matchPromptPath('/zh-hans/prompts/tea-tin/', 'zh-hans')).toBe('tea-tin');
  });
  it('rejects other locales, lists, pages and malformed paths', () => {
    expect(matchPromptPath('/ja/prompts/ink-portrait/', 'en')).toBeNull();
    expect(matchPromptPath('/en/prompts/', 'en')).toBeNull();
    expect(matchPromptPath('/en/prompts/page/2/', 'en')).toBeNull();
    expect(matchPromptPath('/en/prompts/page/', 'en')).toBeNull();
    expect(matchPromptPath('/en/prompts/ink-portrait', 'en')).toBeNull();
    expect(matchPromptPath('/en/templates/poster/', 'en')).toBeNull();
    expect(matchPromptPath('/en/prompts/%E0%A4%A/', 'en')).toBeNull();
    expect(matchPromptPath(null, 'en')).toBeNull();
  });
});

describe('isPlainClick', () => {
  const base = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
  it('takes the primary button without modifiers', () => expect(isPlainClick(base)).toBe(true));
  it('leaves modified, secondary and handled clicks to the browser', () => {
    for (const k of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey', 'defaultPrevented'] as const)
      expect(isPlainClick({ ...base, [k]: true })).toBe(false);
    expect(isPlainClick({ ...base, button: 1 })).toBe(false);
  });
});

describe('flipTransform', () => {
  it('maps the target box onto the source box from the top-left corner', () => {
    expect(
      flipTransform({ left: 10, top: 20, width: 100, height: 50 }, { left: 110, top: 220, width: 400, height: 200 }),
    ).toBe('translate(-100px, -200px) scale(0.25, 0.25)');
  });
  it('does not divide by zero', () => {
    expect(flipTransform({ left: 0, top: 0, width: 10, height: 10 }, { left: 0, top: 0, width: 0, height: 0 })).toBe(
      'translate(0px, 0px) scale(1, 1)',
    );
  });
});

describe('isVisibleBox', () => {
  const vp = { width: 1000, height: 800 };
  it('accepts a box on screen', () =>
    expect(isVisibleBox({ left: 10, top: 10, width: 100, height: 100 }, vp)).toBe(true));
  it('rejects boxes off screen or collapsed', () => {
    expect(isVisibleBox({ left: 10, top: 900, width: 100, height: 100 }, vp)).toBe(false);
    expect(isVisibleBox({ left: 10, top: -200, width: 100, height: 100 }, vp)).toBe(false);
    expect(isVisibleBox({ left: 10, top: 10, width: 0, height: 0 }, vp)).toBe(false);
  });
});

describe('classifySwipe', () => {
  const base = { dx: 0, dy: 0, dt: 300, width: 390, rtl: false, atTop: true };
  it('swiping towards the inline start is next, the other way previous', () => {
    expect(classifySwipe({ ...base, dx: -120 })).toBe('next');
    expect(classifySwipe({ ...base, dx: 120 })).toBe('previous');
    expect(classifySwipe({ ...base, dx: -120, rtl: true })).toBe('previous');
    expect(classifySwipe({ ...base, dx: 120, rtl: true })).toBe('next');
  });
  it('a short fast flick counts; a short slow drag does not', () => {
    expect(classifySwipe({ ...base, dx: -40, dt: 50 })).toBe('next');
    expect(classifySwipe({ ...base, dx: -40, dt: 400 })).toBeNull();
  });
  it('down closes only from the top and when far or fast enough', () => {
    expect(classifySwipe({ ...base, dy: 160 })).toBe('close');
    expect(classifySwipe({ ...base, dy: 40, dt: 40 })).toBe('close');
    expect(classifySwipe({ ...base, dy: 160, atTop: false })).toBeNull();
    expect(classifySwipe({ ...base, dy: 60 })).toBeNull();
    expect(classifySwipe({ ...base, dy: -200 })).toBeNull();
  });
  it('diagonal movement does nothing', () => {
    expect(classifySwipe({ ...base, dx: -100, dy: 90 })).toBeNull();
  });
});

describe('uniqueBySlug', () => {
  it('keeps the first occurrence in order', () => {
    expect(uniqueBySlug([{ slug: 'a' }, { slug: 'b' }, { slug: 'a' }, { slug: 'c' }]).map((x) => x.slug)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});
