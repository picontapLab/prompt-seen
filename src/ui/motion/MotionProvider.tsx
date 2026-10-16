'use client';

import { LazyMotion, MotionConfig } from 'motion/react';
import { duration, ease } from '@/styles/tokens/motion';

const loadFeatures = () => import('./features').then((m) => m.default);

/**
 * Motion context for an area that animates with Motion (design doc §12.2). Mount it around that
 * area only, never at the root: simple feedback is CSS, and the Motion features download when
 * the area renders. Use the light `m.*` components inside (`strict` rejects `motion.*`).
 * `reducedMotion="user"` follows the OS; pass "always" to force it (Storybook, tests).
 */
export function MotionProvider({
  children,
  reducedMotion = 'user',
}: {
  children: React.ReactNode;
  reducedMotion?: 'user' | 'always';
}) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig
        reducedMotion={reducedMotion}
        transition={{ duration: duration.content / 1000, ease: [...ease.enter] }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
