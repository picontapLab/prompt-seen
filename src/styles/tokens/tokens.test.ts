import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCssBlocks, themeTokens } from '../../../scripts/lib/tokens/parse';
import { breakpoints } from './breakpoints';
import * as motion from './motion';
import { themeColor } from './theme-color';

// The CSS files in this directory are the source of the token values (design doc §4.1). The few
// values code needs are mirrored in TypeScript; these tests keep the mirrors honest.

const dir = path.dirname(new URL(import.meta.url).pathname);
const read = (file: string) => fs.readFileSync(path.join(dir, file), 'utf8');

describe('motion tokens', () => {
  const root = parseCssBlocks(read('motion.css')).find((b) => b.path.join(' ') === '@layer tokens :root')!;
  const ms = (name: string) => Number(/^(\d+)ms$/.exec(root.declarations.get(name) ?? '')?.[1]);

  it('mirrors motion.css in motion.ts', () => {
    for (const [key, value] of Object.entries(motion.duration)) expect(ms(`--duration-${key}`), key).toBe(value);
    for (const [key, points] of Object.entries(motion.ease))
      expect(root.declarations.get(`--ease-${key}`)).toBe(`cubic-bezier(${points.join(', ')})`);
    expect(root.declarations.get('--distance-reveal')).toBe(`${motion.distance.reveal}px`);
    expect(root.declarations.get('--distance-hover')).toBe(`${motion.distance.hover}px`);
    expect(root.declarations.get('--scale-press')).toBe(String(motion.scalePress));
    expect(ms('--stagger-step')).toBe(motion.stagger.step);
    expect(ms('--stagger-max-delay')).toBe(motion.stagger.maxDelay);
  });

  it('declares the same reduced-motion overrides for the media query and data-motion', () => {
    const blocks = parseCssBlocks(read('motion.css'));
    const media = blocks.find((b) => b.path.some((p) => p.includes('prefers-reduced-motion')))!;
    const attribute = blocks.find((b) => b.path.at(-1) === ":where([data-motion='reduce'])")!;
    expect(Object.fromEntries(attribute.declarations)).toEqual(Object.fromEntries(media.declarations));
  });

  it('uses a critically damped layout spring (§12.4)', () => {
    const { stiffness, damping, mass } = motion.layoutSpring;
    expect(damping / (2 * Math.sqrt(stiffness * mass))).toBeCloseTo(1, 5);
  });
});

describe('theme colour', () => {
  it('is the canvas of each theme', () => {
    const themes = themeTokens(read('color.css'));
    expect(themes.light.get('--canvas')).toBe(themeColor.light);
    expect(themes.dark.get('--canvas')).toBe(themeColor.dark);
  });
});

describe('breakpoints', () => {
  const cssFiles = (d: string): string[] =>
    fs
      .readdirSync(d, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory() ? cssFiles(path.join(d, e.name)) : e.name.endsWith('.css') ? [path.join(d, e.name)] : [],
      );

  it('are the only widths used in media queries under src/', () => {
    const allowed = new Set(
      Object.values(breakpoints).flatMap((px) => [`min-width: ${px}px`, `max-width: ${px - 0.02}px`]),
    );
    const src = path.resolve(dir, '../..');
    const offenders = cssFiles(src).flatMap((file) =>
      [...fs.readFileSync(file, 'utf8').matchAll(/\((min|max)-width:\s*([\d.]+)px\)/g)]
        .map((m) => `${m[1]}-width: ${m[2]}px`)
        .filter((q) => !allowed.has(q))
        .map((q) => `${path.relative(src, file)}: ${q}`),
    );
    expect(offenders).toEqual([]);
  });
});
