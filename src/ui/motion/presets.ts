// Shared Motion presets built from the motion tokens (§12.4). Feature code picks one of these
// instead of writing its own curves and delays (§12.2). Each preset names its purpose:
// feedback, continuity or hierarchy.
import type { Transition, Variants } from 'motion/react';
import { distance, duration, ease, layoutSpring, stagger } from '@/styles/tokens/motion';

const s = (ms: number) => ms / 1000;

export const transitions = {
  /** Feedback: buttons, copy, save. */
  feedback: { duration: s(duration.feedback), ease: [...ease.enter] },
  /** Continuity: result changes, short entrances. */
  content: { duration: s(duration.content), ease: [...ease.enter] },
  /** Hierarchy: detail layers entering, images expanding. */
  expand: { duration: s(duration.expand), ease: [...ease.enter] },
  /** Explicit close; must stay interruptible (§11.3.1). */
  exit: { duration: s(duration.exit), ease: [...ease.exit] },
  /** Shared layout: critically damped spring, no overshoot. */
  layout: layoutSpring,
} satisfies Record<string, Transition>;

/** Secondary content appearing: short rise and fade. Under reduced motion Motion drops the rise. */
export const reveal: Variants = {
  hidden: { opacity: 0, y: distance.reveal },
  shown: { opacity: 1, y: 0, transition: transitions.content },
  exit: { opacity: 0, transition: transitions.exit },
};

/** Plain fade, the reduced-motion stand-in for any movement (§12.7). */
export const fade: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: transitions.content },
  exit: { opacity: 0, transition: transitions.exit },
};

/**
 * Steps across a reading-direction axis, e.g. next/previous in the detail popup: content moves
 * 24px along the reading direction (§12.1), mirrored for RTL by the caller's `direction`.
 */
export const step = (direction: 1 | -1, rtl: boolean): Variants => {
  const x = 24 * direction * (rtl ? -1 : 1);
  return {
    hidden: { opacity: 0, x },
    shown: { opacity: 1, x: 0, transition: transitions.content },
    exit: { opacity: 0, x: -x, transition: transitions.exit },
  };
};

/** Delay for the n-th of a few new items, capped (§12.4 stagger-step, stagger-max-delay). */
export const staggerDelay = (index: number) => s(Math.min(index * stagger.step, stagger.maxDelay));
