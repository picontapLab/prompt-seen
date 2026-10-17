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

/**
 * The opening of a prompt for a showcase quote (§11.8.1: "the first few sentences, with its
 * annotated phrases"): whole sentences up to the one holding the last annotation, at least the
 * first sentence, and the full text when it is short. Annotations past the cut are dropped.
 */
export function promptExcerpt(
  text: string,
  annotations: readonly Annotation[],
  maxChars = 320,
): { text: string; truncated: boolean; annotations: Annotation[] } {
  if (text.length <= maxChars) return { text, truncated: false, annotations: [...annotations] };
  const ends: number[] = [];
  for (const m of text.matchAll(SENTENCE_END)) ends.push(m.index + m[0].length);
  const lastPhrase = annotations.reduce((max, a) => Math.max(max, a.end), 0);
  // The sentence that holds the last phrase, or the first sentence; never past maxChars unless
  // the annotations themselves reach further.
  let cut = ends.find((e) => e >= lastPhrase) ?? text.length;
  if (cut > maxChars && lastPhrase <= maxChars) {
    cut = ends.filter((e) => e >= lastPhrase && e <= maxChars).at(-1) ?? Math.max(lastPhrase, ends[0] ?? cut);
  }
  if (cut >= text.length) return { text, truncated: false, annotations: [...annotations] };
  return {
    text: text.slice(0, cut).trimEnd(),
    truncated: true,
    annotations: annotations.filter((a) => a.end <= cut),
  };
}
