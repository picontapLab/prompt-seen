import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  cjkCharacters,
  fontFaceCss,
  formatUnicodeRange,
  parseUnicodeRange,
  planSlices,
  sliceFile,
  subsetSlice,
} from './subset';

describe('unicode ranges', () => {
  it('parses and formats unicode-range descriptors', () => {
    expect(parseUnicodeRange('U+4e00-4e03,U+4e08')).toEqual([
      [0x4e00, 0x4e03],
      [0x4e08, 0x4e08],
    ]);
    expect(formatUnicodeRange([0x4e08, 0x4e00, 0x4e01, 0x4e02, 0x4e02])).toBe('U+4e00-4e02,U+4e08');
  });
});

describe('cjkCharacters', () => {
  it('keeps CJK text and the punctuation the Latin face leaves out on CJK pages', () => {
    const chars = cjkCharacters(['竹林长卷 Ink “scroll”…', 'プロンプト', 'Привет']);
    expect([...chars].map((c) => String.fromCodePoint(c)).sort()).toEqual(
      ['竹', '林', '长', '卷', '“', '”', '…', 'プ', 'ロ', 'ン', 'ト'].sort(),
    );
  });
});

describe('planSlices', () => {
  it('groups characters by the slice that covers them and reports the rest', () => {
    const plan = planSlices(new Set([0x4e00, 0x4e01, 0x6797, 0x1f600]), { '[1]': 'U+4e00-4e01', '[2]': 'U+6700-67ff' });
    expect(Object.fromEntries(plan.bySlice)).toEqual({ '[1]': [0x4e00, 0x4e01], '[2]': [0x6797] });
    expect(plan.missing).toEqual([0x1f600]);
  });

  it('names Fontsource slice files', () => {
    expect(sliceFile('noto-sans-sc', '[42]')).toBe('noto-sans-sc-42-wght-normal.woff2');
  });
});

describe('subsetSlice', () => {
  it('cuts a real slice down to a few characters at the display weight', async () => {
    const require = createRequire(import.meta.url);
    const dir = path.dirname(require.resolve('@fontsource-variable/noto-sans-sc/package.json'));
    const slices = JSON.parse(fs.readFileSync(path.join(dir, 'unicode.json'), 'utf8')) as Record<string, string>;
    const { bySlice } = planSlices(cjkCharacters(['竹林']), slices);
    const [slice, codePoints] = [...bySlice][0]!;
    const source = fs.readFileSync(path.join(dir, 'files', sliceFile('noto-sans-sc', slice)));
    const out = await subsetSlice(source, codePoints);
    expect(out.subarray(0, 4).toString('latin1')).toBe('wOF2');
    expect(out.length).toBeLessThan(source.length / 4);
  });
});

describe('fontFaceCss', () => {
  it('declares one swap face per file with its exact range', () => {
    const css = fontFaceCss('Noto Sans SC', [{ url: './zh-Hans/a.woff2', codePoints: [0x7af9, 0x6797] }]);
    expect(css).toContain("font-family:'Noto Sans SC'");
    expect(css).toContain('font-display:swap');
    expect(css).toContain("src:url(./zh-Hans/a.woff2) format('woff2')");
    expect(css).toContain('unicode-range:U+6797,U+7af9');
  });
});
