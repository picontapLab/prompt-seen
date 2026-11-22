import type { Annotation } from '@/modules/content/types';

// Placement rules for prompt annotations (design doc §11.1.9). Pure functions on the build's
// annotation data, shared by the server render and the browser, so the first HTML already has
// the final layout. Regions are relative to the image (0–1) in physical image coordinates: they
// never mirror in right-to-left pages (§8.6).

type Region = Annotation['region'];

export type AnnotationPlacement = {
  letter: string;
  /** Side margin that holds this annotation's solid label while it is current. */
  side: 'left' | 'right';
  /** Vertical centre of the region (0–1): where the leader line meets the label. */
  centerY: number;
  /** Corner label of a non-current box sits below the box when the box touches the top. */
  cornerBelow: boolean;
  /** Letters of other boxes hidden while this one is current, because they overlap it. */
  hides: string[];
};

const overlaps = (a: Region, b: Region) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** True when the horizontal band at `y`, from x0 to x1, crosses `box`. */
const crosses = (y: number, x0: number, x1: number, box: Region) =>
  y > box.y && y < box.y + box.h && x0 < box.x + box.w && box.x < x1;

/**
 * Picks each label's side: the leader runs horizontally from the box to the image edge and
 * must not cross another box; between two clear sides, the nearer edge wins (§11.1.9).
 */
export function placeAnnotations(annotations: readonly Annotation[]): AnnotationPlacement[] {
  return annotations.map((a) => {
    const r = a.region;
    const centerY = r.y + r.h / 2;
    const others = annotations.filter((o) => o.letter !== a.letter);
    const leftClear = !others.some((o) => crosses(centerY, 0, r.x, o.region));
    const rightClear = !others.some((o) => crosses(centerY, r.x + r.w, 1, o.region));
    const nearer = r.x <= 1 - (r.x + r.w) ? 'left' : 'right';
    const side = leftClear && rightClear ? nearer : leftClear ? 'left' : rightClear ? 'right' : nearer;
    return {
      letter: a.letter,
      side,
      centerY,
      cornerBelow: r.y < 0.08,
      hides: others.filter((o) => overlaps(r, o.region)).map((o) => o.letter),
    };
  });
}

export type TextPiece = { text: string; annotation: Annotation | null };

/**
 * The prompt text cut into plain runs and annotated phrases, in order. Offsets come from the
 * build, which checked that each phrase appears verbatim (§5.2); a phrase that overlaps an
 * earlier one is left as plain text rather than nesting.
 */
export function splitPrompt(text: string, annotations: readonly Annotation[]): TextPiece[] {
  const pieces: TextPiece[] = [];
  let at = 0;
  for (const a of [...annotations].sort((p, q) => p.start - q.start)) {
    if (a.start < at || a.end > text.length || text.slice(a.start, a.end) !== a.phrase) continue;
    if (a.start > at) pieces.push({ text: text.slice(at, a.start), annotation: null });
    pieces.push({ text: a.phrase, annotation: a });
    at = a.end;
  }
  if (at < text.length) pieces.push({ text: text.slice(at), annotation: null });
  return pieces;
}

const SENTENCE_END = /[.!?。！？](?=\s|$)|[。！？]/g;

/** Characters about twice as wide as a Latin letter: CJK ideographs, kana, Hangul, full-width forms. */
const WIDE = /[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Hangul}\u3000-\u303f\uff01-\uff60\uffe0-\uffe6]/u;

/**
 * Display width of a text in Latin letter widths, wide characters counting 2. It sizes quotes and
 * one-line copy by the room they take rather than by their length, so a Chinese quote gets about
 * as many lines as a Latin one of the same width (docs/home-ux-optimization-spec.md H-1).
 */
export function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += WIDE.test(ch) ? 2 : 1;
  return width;
}

export type PromptExcerpt = {
  text: string;
  /** Text follows the excerpt. */
  truncated: boolean;
  /** Sentences without annotations were left out before the excerpt (`dropLeading`). */
  truncatedStart: boolean;
  /** The annotations inside the excerpt, their offsets into its text. */
  annotations: Annotation[];
};

/**
 * A prompt's annotated sentences for a showcase quote (§11.8.1): whole sentences up to the one
 * holding the last annotation, at least the first sentence, and the full text when it fits
 * `maxWidth` (display width, see `displayWidth`). Annotations past the cut are dropped. With
 * `dropLeading`, a quote that would still be too wide starts at the sentence holding the first
 * annotation instead of the prompt's opening (H-1); annotations are never dropped for it.
 */
export function promptExcerpt(
  text: string,
  annotations: readonly Annotation[],
  maxWidth = 320,
  { dropLeading = false }: { dropLeading?: boolean } = {},
): PromptExcerpt {
  const whole = { text, truncated: false, truncatedStart: false, annotations: [...annotations] };
  if (displayWidth(text) <= maxWidth) return whole;
  const width = (from: number, to: number) => displayWidth(text.slice(from, to));
  const ends: number[] = [];
  for (const m of text.matchAll(SENTENCE_END)) ends.push(m.index + m[0].length);
  const firstPhrase = annotations.reduce((min, a) => Math.min(min, a.start), text.length);
  const lastPhrase = annotations.reduce((max, a) => Math.max(max, a.end), 0);
  // The sentence that holds the last phrase, or the first sentence; when that sentence runs past
  // the budget but the phrase does not, the cut follows the phrase (or the first sentence).
  const cutFrom = (from: number) => {
    const firstEnd = ends.find((e) => e > from);
    const cut = ends.find((e) => e > from && e >= lastPhrase) ?? text.length;
    return width(from, cut) > maxWidth && width(from, lastPhrase) <= maxWidth
      ? Math.max(lastPhrase, firstEnd ?? cut)
      : cut;
  };
  let start = 0;
  let cut = cutFrom(0);
  if (dropLeading && annotations.length && width(0, cut) > maxWidth) {
    const boundary = ends.filter((e) => e <= firstPhrase).at(-1);
    if (boundary !== undefined) {
      start = boundary + /^\s*/.exec(text.slice(boundary))![0].length;
      cut = cutFrom(start);
    }
  }
  if (start === 0 && cut >= text.length) return whole;
  const kept = annotations.filter((a) => a.start >= start && a.end <= cut);
  return {
    text: text.slice(start, cut).trimEnd(),
    truncated: cut < text.length,
    truncatedStart: start > 0,
    annotations: start ? kept.map((a) => ({ ...a, start: a.start - start, end: a.end - start })) : kept,
  };
}
