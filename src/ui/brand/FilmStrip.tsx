import type { ReactNode } from 'react';
import styles from './FilmStrip.module.css';

export type FilmStripProps = {
  /** The frame: usually the image stage. */
  children: ReactNode;
  /** Edge print beside the frame, read upwards at the start side, e.g. "27 ▸ 27A" (film-mark). */
  startPrint?: string;
  /** Edge print at the end side, e.g. "PROMPT SEEN 400" (film-print). */
  endPrint?: string;
  className?: string;
};

/**
 * Film edge (§11.1.9): `film` rows above and below the frame with 14 × 9 px sprocket holes, evenly
 * spaced at any width, and optional vertical edge print. Stays dark in both themes, like black
 * film borders printed on photo paper. Decorative: the holes and print are hidden from assistive
 * technology; the frame itself is not.
 */
export function FilmStrip({ children, startPrint, endPrint, className }: FilmStripProps) {
  return (
    <div className={[styles.strip, className].filter(Boolean).join(' ')}>
      <div className={styles.holes} aria-hidden="true" />
      <div className={styles.row}>
        {startPrint && (
          <span className={`${styles.print} ${styles.start}`} aria-hidden="true">
            {startPrint}
          </span>
        )}
        <div className={styles.frame}>{children}</div>
        {endPrint && (
          <span className={`${styles.print} ${styles.end}`} aria-hidden="true">
            {endPrint}
          </span>
        )}
      </div>
      <div className={styles.holes} aria-hidden="true" />
    </div>
  );
}
