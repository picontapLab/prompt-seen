// The tail of the GitHub mark as a small physical model, so a wag reads as a cat's and not as a
// shake. A wag starts at the base: muscles swing the first link along a minimum-jerk curve, the
// way animals move, with each swing a little different. The other links are a chain of torsional
// springs that get lighter toward the tip, so the motion travels down the tail, the tip arrives
// late and overshoots, and the tail bends in an S on every reversal. None of that is scripted; it
// comes out of the chain. The official outline is then skinned to the links, so at rest the mark
// is exact. Pure and DOM-free: RepositoryLink owns the frames.
import { GITHUB_MARK_BODY, GITHUB_MARK_PATH } from '@/ui/brand/github-mark';

type Point = { x: number; y: number };

/** Swings of the wag that greets the visitor: three there-and-backs, under 5 s (WCAG 2.2.2). */
export const GREETING_SWINGS = 6;

// The tail outline of the mark as relative cubics, root to tip and back along the upper edge. The
// first is the mark's short arc as a cubic.
const OUTLINE_START: Point = { x: 9.125, y: 20.63 };
const OUTLINE = [
  [-0.3416, 0.1428, -0.7078, 0.2189, -1.078, 0.224],
  [-1.483, 0, -2.359, -0.808, -2.987, -2.313],
  [-0.247, -0.607, -0.517, -0.966, -1.034, -1.033],
  [-0.27, -0.023, -0.359, -0.135, -0.359, -0.27],
  [0, -0.27, 0.45, -0.471, 0.898, -0.471],
  [0.652, 0, 1.213, 0.404, 1.797, 1.235],
  [0.45, 0.651, 0.921, 0.943, 1.483, 0.943],
  [0.561, 0, 0.92, -0.202, 1.437, -0.719],
  [0.382, -0.381, 0.674, -0.718, 0.944, -0.943],
] as const;
/** Each outline cubic is cut in this many, so its control points follow the bend closely. */
const SUBDIVISIONS = 3;

// The midline of that outline at equal lengths, from where the tail leaves the body to the tip.
const JOINTS: readonly Point[] = [
  { x: 9.18, y: 19.45 },
  { x: 8.19, y: 19.87 },
  { x: 7.14, y: 19.76 },
  { x: 6.21, y: 19.07 },
  { x: 5.53, y: 18.18 },
  { x: 4.83, y: 17.41 },
  { x: 3.67, y: 17.24 },
];
export const TAIL_LINKS = JOINTS.length - 1;

const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** The outline as a flat list: a start point, then three points per cubic. */
function outlinePoints(): Point[] {
  const points = [OUTLINE_START];
  let at = OUTLINE_START;
  for (const [x1, y1, x2, y2, x, y] of OUTLINE) {
    let p0 = at;
    let p1 = { x: at.x + x1, y: at.y + y1 };
    let p2 = { x: at.x + x2, y: at.y + y2 };
    const p3 = { x: at.x + x, y: at.y + y };
    for (let left = SUBDIVISIONS; left > 1; left--) {
      // De Casteljau at 1/left: the first piece is kept, the rest is cut again.
      const t = 1 / left;
      const a = lerp(p0, p1, t);
      const b = lerp(p1, p2, t);
      const c = lerp(p2, p3, t);
      const d = lerp(a, b, t);
      const e = lerp(b, c, t);
      const f = lerp(d, e, t);
      points.push(a, d, f);
      p0 = f;
      p1 = e;
      p2 = c;
    }
    points.push(p1, p2, p3);
    at = p3;
  }
  return points;
}

/** Where along the joints a point sits: 2.5 is halfway down the third link; 0 or less is body. */
function spinePosition(p: Point): number {
  let best = Infinity;
  let position = 0;
  for (let i = 0; i < TAIL_LINKS; i++) {
    const a = JOINTS[i]!;
    const b = JOINTS[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const along = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    const t = Math.min(1, Math.max(i === 0 ? -1 : 0, along));
    const distance = Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
    if (distance < best) {
      best = distance;
      position = i + t;
    }
  }
  return position;
}

const POINTS = outlinePoints();
// Both ends of the outline meet the body, so they stay exactly where the mark puts them.
const POSITIONS = POINTS.map((p, i) => (i === 0 || i === POINTS.length - 1 ? 0 : spinePosition(p)));

/**
 * The outline with each link turned by its angle from rest (radians, clockwise on screen, which
 * lifts the tip). Each point follows the two joints either side of it, blended by how close it
 * sits, so the outline bends smoothly. The body end does not move.
 */
export function skinTail(links: readonly number[]): Point[] {
  // Each joint's position and turn: the first belongs to the body, the others average their links.
  const moved: Point[] = [JOINTS[0]!];
  const turns: number[] = [0];
  for (let i = 0; i < TAIL_LINKS; i++) {
    const angle = links[i]!;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = JOINTS[i + 1]!.x - JOINTS[i]!.x;
    const dy = JOINTS[i + 1]!.y - JOINTS[i]!.y;
    moved.push({ x: moved[i]!.x + dx * cos - dy * sin, y: moved[i]!.y + dx * sin + dy * cos });
    turns.push(i + 1 < TAIL_LINKS ? (angle + links[i + 1]!) / 2 : angle);
  }
  const follow = (p: Point, joint: number): Point => {
    const cos = Math.cos(turns[joint]!);
    const sin = Math.sin(turns[joint]!);
    const dx = p.x - JOINTS[joint]!.x;
    const dy = p.y - JOINTS[joint]!.y;
    return { x: moved[joint]!.x + dx * cos - dy * sin, y: moved[joint]!.y + dx * sin + dy * cos };
  };
  return POINTS.map((p, i) => {
    const position = POSITIONS[i]!;
    if (position <= 0) return p;
    const joint = Math.min(Math.floor(position), TAIL_LINKS - 1);
    const t = position - joint;
    // The first link eases out of the body, so the outline leaves it without a corner.
    return lerp(follow(p, joint), follow(p, joint + 1), joint === 0 ? t * t * (3 - 2 * t) : t);
  });
}

const number = (n: number) => String(Math.round(n * 1000) / 1000);

function drawPath(links: readonly number[]): string {
  const [start, ...rest] = skinTail(links);
  let d = `${GITHUB_MARK_BODY}L${number(start!.x)} ${number(start!.y)}C`;
  for (const p of rest) d += `${number(p.x)} ${number(p.y)} `;
  return d;
}

// The chain, in arbitrary but consistent units: inertia and stiffness fall toward the tip.
const STEP = 1 / 240;
const LONGEST_FRAME = 0.05;
const INERTIA = [1, 0.8, 0.62, 0.46, 0.33, 0.22];
const STIFFNESS = [900, 300, 220, 160, 110, 70];
const DAMPING = [34, 7, 6, 5, 4, 3];
const AIR = 5;

// The wag. Up swings lift the tail against its weight, so they take longer and go less far than
// the fall back; the range keeps the tail clear of the head and the rim of the disc.
const LIFT = { reach: 0.3, seconds: 0.46 };
const DROP = { reach: 0.21, seconds: 0.38 };
/** A held wag sometimes rests a moment at the end of a swing. */
const DWELL = { chance: 0.22, seconds: 0.2 };
/** Below these the tail looks still, and the model stops asking for frames. */
const SETTLED_ANGLE = 0.008;
const SETTLED_SPEED = 0.05;

const minimumJerk = (t: number) => t * t * t * (10 + t * (6 * t - 15));

export type Tail = {
  /** Wags for this many swings, each smaller than the last, then settles. */
  wag(swings: number): void;
  /** Wags for as long as `on` stays true, then settles. */
  hold(on: boolean): void;
  /** Advances by `seconds`; true while the tail still needs frames. */
  step(seconds: number): boolean;
  /** The whole mark as path data for the current pose. */
  path(): string;
  /** Each link's turn from rest, base first. */
  links(): readonly number[];
};

export function createTail(random: () => number = Math.random): Tail {
  const angle = new Array<number>(TAIL_LINKS).fill(0);
  const speed = new Array<number>(TAIL_LINKS).fill(0);
  const swing = { from: 0, to: 0, seconds: 0, elapsed: 0, dwell: 0 };
  let muscle = 0;
  let swingsLeft = 0;
  let total = 0;
  let held = false;
  let lifting = true;
  let swinging = false;
  let moving = false;
  let backlog = 0;

  const vary = (spread: number) => 1 - spread + random() * spread * 2;

  function nextSwing() {
    swing.from = muscle;
    swing.elapsed = 0;
    swing.dwell = 0;
    if (!held && swingsLeft <= 0) {
      // Back to rest, and done once this one ends.
      swing.to = 0;
      swing.seconds = DROP.seconds * 1.2;
      swinging = muscle !== 0;
      return;
    }
    const { reach, seconds } = lifting ? LIFT : DROP;
    // A bout tires as it goes; a held wag stays lively.
    const energy = held ? 1 : 0.55 + (0.45 * swingsLeft) / Math.max(total, 1);
    swing.to = (lifting ? 1 : -1) * reach * energy * vary(0.14);
    swing.seconds = seconds * vary(0.18);
    if (held && random() < DWELL.chance) swing.dwell = DWELL.seconds * vary(0.5);
    lifting = !lifting;
    swingsLeft--;
    swinging = true;
  }

  function advanceMuscle() {
    if (!swinging) return;
    swing.elapsed += STEP;
    const t = Math.min(1, swing.elapsed / swing.seconds);
    muscle = swing.from + (swing.to - swing.from) * minimumJerk(t);
    if (swing.elapsed >= swing.seconds + swing.dwell) {
      if (swing.to === 0 && !held && swingsLeft <= 0) {
        muscle = 0;
        swinging = false;
      } else nextSwing();
    }
  }

  function advanceChain() {
    for (let i = 0; i < TAIL_LINKS; i++) {
      const parent = i === 0 ? muscle : angle[i - 1]!;
      const parentSpeed = i === 0 ? 0 : speed[i - 1]!;
      let torque =
        STIFFNESS[i]! * (parent - angle[i]!) + DAMPING[i]! * (parentSpeed - speed[i]!) - AIR * INERTIA[i]! * speed[i]!;
      if (i + 1 < TAIL_LINKS) {
        torque -= STIFFNESS[i + 1]! * (angle[i]! - angle[i + 1]!) + DAMPING[i + 1]! * (speed[i]! - speed[i + 1]!);
      }
      speed[i]! += (torque / INERTIA[i]!) * STEP;
    }
    for (let i = 0; i < TAIL_LINKS; i++) angle[i]! += speed[i]! * STEP;
  }

  const settled = () =>
    !swinging && angle.every((a) => Math.abs(a) < SETTLED_ANGLE) && speed.every((s) => Math.abs(s) < SETTLED_SPEED);

  function start() {
    if (!swinging) nextSwing();
    moving = true;
  }

  return {
    wag(swings) {
      if (held) return;
      swingsLeft = total = swings;
      start();
    },
    hold(on) {
      held = on;
      if (on) start();
      else swingsLeft = 0;
    },
    step(seconds) {
      if (!moving) return false;
      backlog += Math.min(seconds, LONGEST_FRAME);
      while (backlog >= STEP) {
        backlog -= STEP;
        advanceMuscle();
        advanceChain();
      }
      if (settled()) {
        angle.fill(0);
        speed.fill(0);
        moving = false;
      }
      return moving;
    },
    path: () => (moving ? drawPath(angle) : GITHUB_MARK_PATH),
    links: () => angle,
  };
}
