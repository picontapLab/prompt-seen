import { describe, expect, it } from 'vitest';
import { GITHUB_MARK_PATH } from '@/ui/brand/github-mark';
import { createTail, GREETING_SWINGS, skinTail, TAIL_LINKS, type Tail } from './cat-tail';

const FRAME = 1 / 60;

/** A small seeded generator, so a failure here can be reproduced. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

type Point = { x: number; y: number };

/** Runs the tail for `seconds`, handing each frame's links to `visit`. */
function run(tail: Tail, seconds: number, visit?: (links: readonly number[], time: number) => void) {
  for (let frame = 0; frame < seconds / FRAME; frame++) {
    tail.step(FRAME);
    visit?.(tail.links(), frame * FRAME);
  }
}

/** Every number of the tail's closing run in the official mark, as absolute cubic end points. */
function officialTailEnds(): Point[] {
  const tail = GITHUB_MARK_PATH.slice(GITHUB_MARK_PATH.indexOf('a2.9'));
  const curves = tail.slice(tail.indexOf('c') + 1);
  const numbers = (curves.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  let at = { x: 9.125 - 1.078, y: 20.63 + 0.224 };
  const ends = [at];
  for (let i = 0; i + 5 < numbers.length; i += 6) {
    at = { x: at.x + numbers[i + 4]!, y: at.y + numbers[i + 5]! };
    ends.push(at);
  }
  return ends;
}

/** Local maxima of a sampled signal, as their sample indexes. */
const peaks = (signal: readonly number[]) =>
  signal.flatMap((v, i) =>
    i > 0 && i < signal.length - 1 && v > signal[i - 1]! && v >= signal[i + 1]! && v > 0.02 ? [i] : [],
  );

describe('at rest', () => {
  it('draws the official mark exactly', () => {
    expect(createTail(seeded(1)).path()).toBe(GITHUB_MARK_PATH);
  });

  it('skins to the official outline when no link is bent', () => {
    const rest = skinTail(new Array<number>(TAIL_LINKS).fill(0));
    for (const end of officialTailEnds()) {
      const nearest = Math.min(...rest.map((p) => Math.hypot(p.x - end.x, p.y - end.y)));
      expect(nearest).toBeLessThan(0.002);
    }
  });

  it('asks for no frames until it is told to wag', () => {
    expect(createTail(seeded(1)).step(FRAME)).toBe(false);
  });
});

describe('a wag', () => {
  it('leaves the base first and reaches the tip later', () => {
    const tail = createTail(seeded(2));
    tail.wag(GREETING_SWINGS);
    const base: number[] = [];
    const tip: number[] = [];
    run(tail, 2.5, (links) => {
      base.push(links[0]!);
      tip.push(links[TAIL_LINKS - 1]!);
    });
    const firstBase = peaks(base.map(Math.abs))[0]!;
    const firstTip = peaks(tip.map(Math.abs))[0]!;
    expect(firstTip - firstBase).toBeGreaterThan(2);
  });

  it('swings the tip further than the base', () => {
    const tail = createTail(seeded(3));
    tail.wag(GREETING_SWINGS);
    let base = 0;
    let tip = 0;
    run(tail, 2.5, (links) => {
      base = Math.max(base, Math.abs(links[0]!));
      tip = Math.max(tip, Math.abs(links[TAIL_LINKS - 1]!));
    });
    expect(tip).toBeGreaterThan(base * 1.2);
  });

  it('bends along its length, with base and tip moving opposite ways at some moment', () => {
    const tail = createTail(seeded(4));
    tail.hold(true);
    let opposed = 0;
    run(tail, 4, (links) => {
      if (links[0]! * links[TAIL_LINKS - 1]! < -0.005) opposed++;
    });
    expect(opposed).toBeGreaterThan(10);
  });

  it('does not repeat one fixed rhythm', () => {
    const tail = createTail(seeded(5));
    tail.hold(true);
    const base: number[] = [];
    run(tail, 8, (links) => base.push(links[0]!));
    const beats = peaks(base);
    const gaps = beats.slice(1).map((b, i) => b - beats[i]!);
    expect(gaps.length).toBeGreaterThan(3);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(3);
  });

  it('keeps a held wag at a cat tempo of about one swing cycle a second', () => {
    const tail = createTail(seeded(6));
    tail.hold(true);
    const base: number[] = [];
    run(tail, 10, (links) => base.push(links[0]!));
    const cycles = peaks(base).length / 10;
    expect(cycles).toBeGreaterThan(0.7);
    expect(cycles).toBeLessThan(2);
  });

  it('comes to rest on the exact mark soon after the last swing', () => {
    const tail = createTail(seeded(7));
    tail.wag(GREETING_SWINGS);
    let frames = 0;
    while (tail.step(FRAME)) frames++;
    expect(frames * FRAME).toBeLessThan(5); // WCAG 2.2.2: automatic motion stops within 5 s.
    expect(tail.path()).toBe(GITHUB_MARK_PATH);
  });

  it('winds down after a hold ends', () => {
    const tail = createTail(seeded(8));
    tail.hold(true);
    run(tail, 3);
    tail.hold(false);
    let frames = 0;
    while (tail.step(FRAME) && frames < 600) frames++;
    expect(frames).toBeLessThan(300);
    expect(tail.path()).toBe(GITHUB_MARK_PATH);
  });

  it('survives a long stall between frames', () => {
    const tail = createTail(seeded(9));
    tail.hold(true);
    run(tail, 1);
    tail.step(30);
    expect(tail.links().every((link) => Number.isFinite(link) && Math.abs(link) < 2)).toBe(true);
  });
});

describe('inside the mark', () => {
  // The disc of the mark, and the cat's cheek and neck the tail must not run into.
  const DISC = { x: 12, y: 12.5, r: 11.5 };
  const NECK: readonly Point[] = [
    { x: 10.226, y: 17.284 },
    { x: 7.6, y: 15.9 },
    { x: 5.8, y: 14 },
    { x: 5.172, y: 12.03 },
  ];

  it('never reaches the rim of the disc or the head, whatever the seed', () => {
    let rim = Infinity;
    let neck = Infinity;
    for (let seed = 10; seed < 30; seed++) {
      const tail = createTail(seeded(seed));
      tail.hold(true);
      run(tail, 6, (links) => {
        for (const p of skinTail(links)) {
          rim = Math.min(rim, DISC.r - Math.hypot(p.x - DISC.x, p.y - DISC.y));
          // The tail joins the body at the neck's first point; only its free length counts.
          if (p.x < 8.5) for (const n of NECK) neck = Math.min(neck, Math.hypot(p.x - n.x, p.y - n.y));
        }
      });
    }
    expect(rim).toBeGreaterThan(0.5);
    expect(neck).toBeGreaterThan(0.4);
  });

  it('keeps the root of the tail joined to the body', () => {
    const tail = createTail(seeded(31));
    tail.hold(true);
    const rest = skinTail(new Array<number>(TAIL_LINKS).fill(0));
    run(tail, 3, (links) => {
      const bent = skinTail(links);
      expect(bent[0]).toEqual(rest[0]);
      expect(bent.at(-1)).toEqual(rest.at(-1));
    });
  });
});
