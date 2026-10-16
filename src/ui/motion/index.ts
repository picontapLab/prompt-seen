// Motion base (design doc §12.2, §12.4): the provider for areas that animate with Motion, and
// presets built from src/styles/tokens/motion.*. CSS transitions use the same tokens directly.
export { MotionProvider } from './MotionProvider';
export { fade, reveal, staggerDelay, step, transitions } from './presets';
export { useReducedMotion } from 'motion/react';
export * as tokens from '@/styles/tokens/motion';
