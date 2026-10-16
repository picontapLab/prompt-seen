// Motion tokens for code (Motion presets, timers). Mirrors motion.css, the source of the values;
// tokens.test.ts fails when the two differ (design doc §12.4).

export const duration = {
  instant: 80,
  feedback: 140,
  content: 220,
  expand: 320,
  exit: 160,
  image: 160,
  develop: 500,
} as const;

/** Cubic Bézier control points, as Motion takes them. */
export const ease = {
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export const distance = {
  reveal: 8,
  hover: 2,
} as const;

export const scalePress = 0.98;

export const stagger = {
  step: 30,
  maxDelay: 120,
} as const;

/**
 * Shared-layout spring (§12.4): damping ratio 32 / (2 × √(320 × 0.8)) = 1.0, no overshoot,
 * settles within 2% in about 290 ms, in line with duration.expand.
 */
export const layoutSpring = { type: 'spring', stiffness: 320, damping: 32, mass: 0.8 } as const;
