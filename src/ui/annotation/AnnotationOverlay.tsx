'use client';

import type { CSSProperties } from 'react';
import { CropMarks } from '@/ui/brand/CropMarks';
import { useAnnotations } from './AnnotationProvider';
import styles from './Annotation.module.css';

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

/**
 * Annotation boxes over an image (design doc §11.1.9). Place it inside the positioned box that
 * holds the image at its original ratio. The current annotation gets a solid frame, crop marks
 * and a leader line to a solid letter in the margin beside the image; the others are dashed
 * with an outlined letter at their corner, and boxes overlapping the current one step aside.
 * Where the image has no margin (phones), only the current box shows, its letter at the corner.
 * Coordinates are the image's own, so the overlay never mirrors in right-to-left pages. The
 * overlay is decorative: every note is readable as text next to the prompt.
 */
export function AnnotationOverlay() {
  const state = useAnnotations();
  if (!state || state.annotations.length === 0) return null;
  const { annotations, placements, current, boxId } = state;
  const hidden = new Set(current ? (placements.get(current)?.hides ?? []) : []);

  return (
    <div className={styles.overlay} aria-hidden="true" data-has-current={current ? '' : undefined}>
      {annotations.map((a) => {
        const p = placements.get(a.letter)!;
        const isCurrent = current === a.letter;
        const box: CSSProperties = {
          left: pct(a.region.x),
          top: pct(a.region.y),
          width: pct(a.region.w),
          height: pct(a.region.h),
        };
        return (
          <div
            key={a.letter}
            id={boxId(a.letter)}
            className={styles.box}
            style={box}
            data-state={isCurrent ? 'current' : hidden.has(a.letter) ? 'hidden' : 'other'}
            data-corner={p.cornerBelow ? 'below' : 'above'}
          >
            <span className={styles.cornerTag}>{a.letter}</span>
            {isCurrent && <CropMarks size={14} offset={6} />}
          </div>
        );
      })}
      {current &&
        (() => {
          const a = annotations.find((x) => x.letter === current)!;
          const p = placements.get(current)!;
          const leader: CSSProperties =
            p.side === 'left'
              ? {
                  top: pct(p.centerY),
                  left: 'calc(-1 * var(--_lane))',
                  width: `calc(${pct(a.region.x)} + var(--_lane))`,
                }
              : {
                  top: pct(p.centerY),
                  left: pct(a.region.x + a.region.w),
                  width: `calc(${pct(1 - a.region.x - a.region.w)} + var(--_lane))`,
                };
          return (
            <>
              <span className={styles.leader} style={leader} />
              <span className={styles.sideTag} data-side={p.side} style={{ top: pct(p.centerY) }}>
                {a.letter}
              </span>
            </>
          );
        })()}
    </div>
  );
}
