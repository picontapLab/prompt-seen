import { useLayoutEffect, useRef, type ReactNode } from 'react';
import styles from './preview.module.css';

/** Interaction states a primitive styles through React Aria data attributes (§11.1.7). */
export type ForcedState = 'hovered' | 'pressed' | 'focus-visible' | 'focused' | 'focus-within';

/**
 * Shows a state that normally needs a pointer or keyboard, by setting the data attribute React
 * Aria would set. The attribute stays until the element is really interacted with.
 */
export function Forced({
  states,
  target = '[data-rac]',
  children,
}: {
  states: ForcedState[];
  target?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // Collections (tags, lists) render their items a frame later: apply again after it.
    const apply = () => {
      const el = ref.current?.querySelector(target);
      states.forEach((s) => el?.setAttribute(`data-${s}`, 'true'));
    };
    apply();
    const frame = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(frame);
  });
  return (
    <div ref={ref} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}

/** A labelled grid of state samples. */
export function StateGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function StateCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>
      <div>{children}</div>
    </div>
  );
}
