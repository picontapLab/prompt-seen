// The contrast pairs of design doc §11.1.9 and their evaluation. scripts/tokens-check.ts prints
// the result; CI fails when any pair is below its threshold.
import { composite, contrastRatio, parseColor, type Rgba } from './contrast';
import { themeTokens } from './parse';

/** WCAG 2.2 AA: 4.5:1 for text (1.4.3), 3:1 for control borders and graphics (1.4.11). */
export const TEXT = 4.5;
export const GRAPHIC = 3;

export type Pair = {
  /** Token whose colour is drawn on the background. */
  fg: string;
  bg: string;
  min: number;
  use: string;
  /** Background token composited under a translucent bg, when bg itself is translucent. */
  over?: string;
};

const onSurfaces = (fg: string, min: number, use: string): Pair[] =>
  ['canvas', 'surface-raised', 'surface-sunken'].map((bg) => ({ fg, bg, min, use }));

/**
 * The 22 pairs checked in each theme; 44 in all (§11.1.9). Text and links are checked on the
 * three surfaces they appear on; the film edge keeps its own colours in both themes.
 */
export const REQUIRED_PAIRS: readonly Pair[] = [
  ...onSurfaces('text-primary', TEXT, 'titles and body text'),
  ...onSurfaces('text-secondary', TEXT, 'captions and help'),
  ...onSurfaces('accent', TEXT, 'links and focus ring'),
  ...onSurfaces('border-control', GRAPHIC, 'control borders'),
  ...onSurfaces('mark', TEXT, 'frame numbers and outlined letter labels'),
  { fg: 'on-accent', bg: 'accent', min: TEXT, use: 'primary button' },
  { fg: 'danger', bg: 'danger-subtle', min: TEXT, use: 'error message' },
  { fg: 'success', bg: 'success-subtle', min: TEXT, use: 'success message' },
  { fg: 'mark-text', bg: 'mark', min: TEXT, use: 'solid letter label' },
  { fg: 'text-primary', bg: 'mark-soft', min: TEXT, use: 'highlighted annotated phrase' },
  { fg: 'film-mark', bg: 'film', min: TEXT, use: 'frame number on the film edge' },
  { fg: 'film-print', bg: 'film', min: TEXT, use: 'film edge print' },
];

/**
 * Further pairs the components rely on (§11.1.1 rules that §11.1.9 keeps). Not part of the 44,
 * but a failure blocks the build all the same.
 */
export const SUPPLEMENTARY_PAIRS: readonly Pair[] = [
  { fg: 'on-accent', bg: 'accent-hover', min: TEXT, use: 'primary button, hovered' },
  { fg: 'text-primary', bg: 'accent-subtle', min: TEXT, use: 'selected chip, current item' },
  { fg: 'text-secondary', bg: 'accent-subtle', min: TEXT, use: 'count in a selected chip' },
  ...onSurfaces('danger', TEXT, 'field error under a control'),
  ...[1, 2, 3, 4, 5, 6].map((n) => ({
    fg: `var-${n}-fg`,
    bg: `var-${n}-bg`,
    min: TEXT,
    use: `template variable ${n}`,
  })),
  // Annotation boxes on artwork: amber with a dark outline, checked against the worst case, a
  // white area of the image (§11.1.9: amber directly on white is only 1.76:1).
  { fg: 'overlay-outline', bg: '#ffffff', min: GRAPHIC, use: 'annotation outline on a white image area' },
  { fg: 'film-mark', bg: 'overlay-outline', over: '#ffffff', min: GRAPHIC, use: 'annotation line against its outline' },
];

export type Theme = 'light' | 'dark';

export type Result = Pair & { theme: Theme; ratio: number; pass: boolean };

export type CheckReport = {
  required: Result[];
  supplementary: Result[];
  /** Problems with the token file itself, e.g. the two dark blocks disagree. */
  problems: string[];
  ok: boolean;
};

export function checkTokens(colorCss: string): CheckReport {
  const problems: string[] = [];
  const themes = themeTokens(colorCss);

  for (const [name, value] of themes.dark) {
    if (themes.darkSystem.get(name) !== value)
      problems.push(
        `${name}: the system-dark block has ${themes.darkSystem.get(name) ?? 'no value'}, the explicit dark block ${value}`,
      );
  }
  for (const name of themes.darkSystem.keys()) {
    if (!themes.dark.has(name)) problems.push(`${name}: missing from the explicit dark block`);
  }
  for (const name of themes.light.keys()) {
    if (!themes.dark.has(name)) problems.push(`${name}: defined for the light theme but not the dark theme`);
  }

  const evaluate = (pairs: readonly Pair[]): Result[] =>
    (['dark', 'light'] as const).flatMap((theme) =>
      pairs.map((pair) => {
        const tokens = themes[theme];
        const resolve = (ref: string): Rgba => {
          if (!ref.startsWith('#') && !tokens.has(`--${ref}`))
            throw new Error(`token --${ref} is not defined (${theme})`);
          return parseColor(ref.startsWith('#') ? ref : tokens.get(`--${ref}`)!);
        };
        let bg = resolve(pair.bg);
        if (bg.a !== 1) {
          if (!pair.over) throw new Error(`--${pair.bg} is translucent; give the pair an "over" backdrop`);
          bg = composite(bg, resolve(pair.over));
        }
        const ratio = contrastRatio(resolve(pair.fg), bg);
        return { ...pair, theme, ratio, pass: ratio >= pair.min };
      }),
    );

  const required = evaluate(REQUIRED_PAIRS);
  const supplementary = evaluate(SUPPLEMENTARY_PAIRS);
  const ok = problems.length === 0 && [...required, ...supplementary].every((r) => r.pass);
  return { required, supplementary, problems, ok };
}
