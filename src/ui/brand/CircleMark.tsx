import styles from './CircleMark.module.css';

/**
 * The circled mark of a saved work (design doc §11.1.8 圈选记号, §11.1.9): a hand-drawn ellipse
 * in safelight amber around the frame number, two slightly offset strokes. It renders with the
 * frame number on the server and shows only while a save button inside the same
 * `[data-save-scope]` is pressed, so the label needs no client state. The strokes draw in when the
 * visitor saves (`data-saved="new"`); a work already saved shows the mark at once, and so does
 * reduced motion. Decorative: the save button carries the state for assistive technology.
 */
export function CircleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `${styles.mark} ${className}` : styles.mark}
      aria-hidden="true"
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
      data-circle-mark=""
    >
      <ellipse
        cx="50"
        cy="30"
        rx="47"
        ry="27"
        pathLength="1"
        vectorEffect="non-scaling-stroke"
        transform="rotate(-6 50 30)"
      />
      <ellipse
        cx="51"
        cy="31"
        rx="45"
        ry="26"
        pathLength="1"
        vectorEffect="non-scaling-stroke"
        transform="rotate(-3 50 30)"
      />
    </svg>
  );
}
