'use client';

import { ChevronUp } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { cx } from './cx';
import styles from './BottomSheet.module.css';

export type BottomSheetProps = {
  /** Names the region for assistive technology. */
  label: string;
  /** Visible name of the handle in each position, e.g. "Show the full prompt" / "Hide the prompt". */
  expandLabel: string;
  collapseLabel: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** How much of the content shows while collapsed, as a CSS length (below the handle). */
  peek: string;
  /**
   * From this width up the sheet is an ordinary block in the page and its handle is hidden, so a
   * single element can be a docked sheet on phones and, say, a sticky column on desktop (§11.2).
   */
  staticFrom?: 'lg';
  children: ReactNode;
  className?: string;
  id?: string;
};

/** Pixels a press may move and still count as a tap on the handle. */
const TAP_SLOP = 6;
/** Release speed (px/ms) that settles the sheet in the direction of the swipe. */
const FLING = 0.5;

/**
 * BottomSheet (design doc §11.1.7): a non-modal panel docked to the bottom of the viewport. It
 * peeks while collapsed and opens to about 85% of the height; the page behind stays usable, so
 * the user can collapse it and keep working. It follows a drag on its handle and settles by
 * speed and distance; the handle is also a button, so a tap, Enter or Space toggles it, and Esc
 * collapses it from anywhere inside. Moving focus into a part that is off screen opens it.
 * During a drag the position is written to the element directly, not through React state
 * (§11.6.1: high-frequency values stay out of renders).
 */
export function BottomSheet({
  label,
  expandLabel,
  collapseLabel,
  expanded,
  onExpandedChange,
  peek,
  staticFrom,
  children,
  className,
  id,
}: BottomSheetProps) {
  const bodyId = useId();
  const sheet = useRef<HTMLElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ y: number; t: number; from: number; max: number; moved: boolean } | null>(null);

  /** Offset of the collapsed sheet: its height less the handle and the peek. */
  function collapsedOffset(el: HTMLElement) {
    const handle = el.querySelector<HTMLElement>(`.${styles.handle}`)?.offsetHeight ?? 0;
    return Math.max(el.offsetHeight - handle - (probe.current?.offsetHeight ?? 0), 0);
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    const el = sheet.current;
    if (!el || event.button !== 0) return;
    // A drag that ended outside the handle fires no click to consume its marker.
    delete el.dataset.dragged;
    const max = collapsedOffset(el);
    drag.current = { y: event.clientY, t: event.timeStamp, from: expanded ? 0 : max, max, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    const el = sheet.current;
    if (!d || !el) return;
    const dy = event.clientY - d.y;
    if (!d.moved && Math.abs(dy) < TAP_SLOP) return;
    d.moved = true;
    el.dataset.dragging = '';
    el.style.transform = `translateY(${Math.min(Math.max(d.from + dy, 0), d.max)}px)`;
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    const el = sheet.current;
    drag.current = null;
    if (!d || !el || !d.moved) return; // a tap: the click handler toggles
    const dy = event.clientY - d.y;
    const speed = dy / Math.max(event.timeStamp - d.t, 1);
    const at = Math.min(Math.max(d.from + dy, 0), d.max);
    const open = speed < -FLING ? true : speed > FLING ? false : at < d.max / 2;
    delete el.dataset.dragging;
    el.style.transform = '';
    // The click that follows a drag must not toggle the sheet back.
    el.dataset.dragged = '';
    onExpandedChange(open);
  }

  function onClick() {
    const el = sheet.current;
    if (el && 'dragged' in el.dataset) {
      delete el.dataset.dragged;
      return;
    }
    onExpandedChange(!expanded);
  }

  // Esc collapses the open sheet wherever focus is: Safari does not focus a button on click, so
  // after tapping the handle focus is still on the page. A dialog or menu that handles Esc
  // marks the event, and the sheet leaves it alone.
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const el = sheet.current;
      if (!el || getComputedStyle(el).position !== 'fixed') return;
      const inside = el.contains(document.activeElement);
      onExpandedChange(false);
      if (inside) el.querySelector<HTMLElement>(`.${styles.handle}`)?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [expanded, onExpandedChange]);

  function onFocus(event: FocusEvent<HTMLElement>) {
    if (expanded || event.target.classList.contains(styles.handle!)) return;
    const el = sheet.current;
    if (!el || getComputedStyle(el).position !== 'fixed') return;
    if (event.target.getBoundingClientRect().bottom > window.innerHeight) onExpandedChange(true);
  }

  return (
    <section
      ref={sheet}
      id={id}
      aria-label={label}
      className={cx(styles.sheet, className)}
      data-expanded={expanded || undefined}
      data-static-from={staticFrom}
      style={{ '--peek': peek } as CSSProperties}
      onFocus={onFocus}
    >
      <span ref={probe} className={styles.probe} aria-hidden="true" />
      <button
        type="button"
        className={styles.handle}
        aria-expanded={expanded}
        aria-controls={bodyId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          const el = sheet.current;
          if (el) {
            delete el.dataset.dragging;
            el.style.transform = '';
          }
        }}
        onClick={onClick}
      >
        <span className={styles.grip} aria-hidden="true" />
        <span className={styles.handleLabel}>{expanded ? collapseLabel : expandLabel}</span>
        <ChevronUp aria-hidden="true" className={styles.chevron} />
      </button>
      <div id={bodyId} className={styles.body} data-sheet-body="">
        {children}
      </div>
    </section>
  );
}
