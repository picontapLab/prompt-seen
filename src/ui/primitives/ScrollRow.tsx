'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { IconButton } from './Button';
import { cx } from './cx';
import styles from './ScrollRow.module.css';

export type ScrollRowProps = Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'> & {
  children: ReactNode;
  /** Names of the two buttons (`primitives.scrollRow`). */
  labels: { previous: string; next: string };
  /** The element that scrolls: a list of items or a group of controls. */
  as?: 'div' | 'ul';
  /** The wrapper, which places the buttons. */
  className?: string;
  /** The scrolling element itself; it keeps the role and name passed in. */
  scrollerClassName?: string;
};

type Edges = { before: boolean; after: boolean };

/**
 * A row that scrolls sideways (design doc §11.9 横向滚动): items snap to the start, the edge with
 * more content fades, and visible previous / next buttons scroll by most of a view, so a pointer
 * without a sideways wheel reaches everything too. Keyboard users reach items by Tab, which
 * scrolls them into view, so the buttons stay out of the tab order. Before hydration, and while
 * everything fits, it is a plain row: no fade, no buttons. Directions follow the page (RTL).
 */
export function ScrollRow({
  children,
  labels,
  as: Tag = 'div',
  className,
  scrollerClassName,
  ...props
}: ScrollRowProps) {
  const ref = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState<Edges>({ before: false, after: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // scrollLeft is 0 at the start and negative towards the end in right-to-left rows.
      const offset = Math.abs(el.scrollLeft);
      const next = { before: offset > 1, after: offset + el.clientWidth < el.scrollWidth - 1 };
      setEdges((prev) => (prev.before === next.before && prev.after === next.after ? prev : next));
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    for (const child of el.children) resize.observe(child);
    return () => {
      el.removeEventListener('scroll', measure);
      resize.disconnect();
    };
  }, [children]);

  const scroll = (towardsEnd: boolean) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = Math.max(el.clientWidth * 0.8, 1) * (towardsEnd ? 1 : -1) * (rtl ? -1 : 1);
    el.scrollBy({ left: step, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div
      className={cx(styles.root, className)}
      data-more-before={edges.before || undefined}
      data-more-after={edges.after || undefined}
    >
      <Tag ref={ref as never} className={cx(styles.scroller, scrollerClassName)} {...props}>
        {children}
      </Tag>
      {edges.before && (
        <IconButton
          className={cx(styles.button, styles.before)}
          icon={<ChevronLeft className={styles.icon} aria-hidden="true" />}
          label={labels.previous}
          tooltip={false}
          excludeFromTabOrder
          data-scroll-button=""
          onPress={() => scroll(false)}
        />
      )}
      {edges.after && (
        <IconButton
          className={cx(styles.button, styles.after)}
          icon={<ChevronRight className={styles.icon} aria-hidden="true" />}
          label={labels.next}
          tooltip={false}
          excludeFromTabOrder
          data-scroll-button=""
          onPress={() => scroll(true)}
        />
      )}
    </div>
  );
}
