import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT } from '../paths';
import { checkTokens, REQUIRED_PAIRS } from './check';
import { contrastRatio, parseColor } from './contrast';
import { parseCssBlocks } from './parse';

const css = fs.readFileSync(path.join(ROOT, 'src/styles/tokens/color.css'), 'utf8');

describe('contrast', () => {
  it('follows the WCAG 2.2 formula', () => {
    expect(contrastRatio(parseColor('#000'), parseColor('#fff'))).toBeCloseTo(21, 5);
    expect(contrastRatio(parseColor('#777777'), parseColor('#ffffff'))).toBeCloseTo(4.48, 2);
  });

  it('composites translucent foregrounds over the background', () => {
    expect(contrastRatio(parseColor('rgb(0 0 0 / 0.5)'), parseColor('#ffffff'))).toBeCloseTo(3.98, 2);
  });
});

describe('tokens-check', () => {
  it('checks 44 required pairs, 22 per theme (§11.1.9)', () => {
    const report = checkTokens(css);
    expect(REQUIRED_PAIRS).toHaveLength(22);
    expect(report.required).toHaveLength(44);
  });

  it('passes for the committed tokens and matches the key results of §11.1.9', () => {
    const report = checkTokens(css);
    expect(report.problems).toEqual([]);
    expect(report.required.filter((r) => !r.pass)).toEqual([]);
    expect(report.supplementary.filter((r) => !r.pass)).toEqual([]);
    const min = (theme: string, fg: string, bg?: string) =>
      Math.min(
        ...report.required.filter((r) => r.theme === theme && r.fg === fg && (!bg || r.bg === bg)).map((r) => r.ratio),
      );
    // dark / light minimums quoted in §11.1.9
    expect(min('dark', 'text-secondary')).toBeCloseTo(6.78, 2);
    expect(min('light', 'text-secondary')).toBeCloseTo(5.68, 2);
    expect(min('dark', 'border-control')).toBeCloseTo(3.7, 2);
    expect(min('light', 'border-control')).toBeCloseTo(3.26, 2);
    expect(min('dark', 'mark')).toBeCloseTo(9.88, 2);
    expect(min('light', 'mark')).toBeCloseTo(4.55, 2);
    expect(min('dark', 'mark-text')).toBeCloseTo(10.55, 2);
    expect(min('light', 'mark-text')).toBeCloseTo(6.11, 2);
    expect(min('dark', 'text-primary', 'mark-soft')).toBeCloseTo(9.8, 2);
    expect(min('light', 'text-primary', 'mark-soft')).toBeCloseTo(13.25, 2);
    expect(Math.min(min('dark', 'film-print'), min('light', 'film-print'))).toBeCloseTo(6.86, 2);
  });

  it('fails when one value is broken', () => {
    // text-secondary of the light theme close to the canvas colour
    const broken = css.replace('--text-secondary: #57534d;', '--text-secondary: #a8a49e;');
    expect(broken).not.toBe(css);
    const report = checkTokens(broken);
    expect(report.ok).toBe(false);
    expect(report.required.filter((r) => !r.pass).map((r) => `${r.theme} ${r.fg} on ${r.bg}`)).toEqual([
      'light text-secondary on canvas',
      'light text-secondary on surface-raised',
      'light text-secondary on surface-sunken',
    ]);
  });

  it('fails when the two dark blocks drift apart', () => {
    const [head, darkExplicit] = css.split(":where([data-theme='dark']) {");
    const drifted = `${head}:where([data-theme='dark']) {${darkExplicit!.replace('--mark: #ffb547;', '--mark: #ffb548;')}`;
    expect(checkTokens(drifted).problems).toEqual([
      '--mark: the system-dark block has #ffb547, the explicit dark block #ffb548',
    ]);
  });

  it('refuses a token file whose theme blocks it cannot find', () => {
    expect(() => checkTokens(css.replace(":where([data-theme='dark']) {", ':where(.dark) {'))).toThrow(/explicit dark/);
  });
});

describe('parseCssBlocks', () => {
  it('keeps the at-rule path of nested blocks', () => {
    const blocks = parseCssBlocks('@layer a { :root { --x: 1px; } @media (y) { :root { --x: 2px; /* c; */ } } }');
    expect(blocks.map((b) => [b.path, Object.fromEntries(b.declarations)])).toEqual([
      [['@layer a', ':root'], { '--x': '1px' }],
      [['@layer a', '@media (y)', ':root'], { '--x': '2px' }],
    ]);
  });
});
