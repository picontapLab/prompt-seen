import styles from './CropMarks.module.css';

export type CropMarksProps = {
  /**
   * always: shown (current annotation box, stories). interactive: shown while the nearest
   * `[data-crop-target]` ancestor is hovered with a fine pointer or holds keyboard focus (cards).
   */
  mode?: 'always' | 'interactive';
  /** Corner length: 14 or 16 px (§11.1.9). */
  size?: 14 | 16;
  /** How far the corners sit outside the box, in px. */
  offset?: number;
};

/**
 * Crop marks (§11.1.9): four L-shaped corners, 2 px, `film-mark` amber with a dark
 * `overlay-outline` so they read on light artwork too. They draw in from the corners in
 * duration-content; with reduced motion they simply appear. Place inside a positioned box.
 */
export function CropMarks({ mode = 'always', size = 16, offset = 8 }: CropMarksProps) {
  return (
    <span
      className={styles.marks}
      data-mode={mode}
      style={{ '--_size': `${size}px`, '--_offset': `${offset}px` } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className={styles.corner} data-corner="start-start" />
      <span className={styles.corner} data-corner="end-start" />
      <span className={styles.corner} data-corner="start-end" />
      <span className={styles.corner} data-corner="end-end" />
    </span>
  );
}
