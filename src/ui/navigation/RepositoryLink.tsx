'use client';

import { useEffect, useRef } from 'react';
import { GITHUB_MARK_PATH } from '@/ui/brand/github-mark';
import type { Tail } from '@/ui/motion/cat-tail';
import { cx } from '@/ui/primitives/cx';
import styles from './RepositoryLink.module.css';

/** The first look at the link waits a moment, so the wag is noticed rather than missed. */
const GREETING_DELAY_MS = 900;

const load = () => import('@/ui/motion/cat-tail');
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The link to the site's source (§12.1). The mark is drawn on the server and is the whole link
 * until the tail wags, which it does once when the link first comes into view (under 5 s, WCAG
 * 2.2.2) and for as long as the pointer or keyboard focus rests on it. The tail's model loads with
 * the first wag, runs only while the tail moves, and never runs under reduced motion.
 */
export function RepositoryLink({
  href,
  label,
  labelled,
  className,
}: {
  href: string;
  label: string;
  /** Shows the name beside the mark; otherwise it is the accessible name and tooltip only. */
  labelled?: boolean;
  className?: string;
}) {
  const link = useRef<HTMLAnchorElement>(null);
  const path = useRef<SVGPathElement>(null);

  useEffect(() => {
    const anchor = link.current;
    const mark = path.current;
    if (!anchor || !mark) return;

    let tail: Promise<Tail> | null = null;
    let frame = 0;
    let timer = 0;
    let pointer = false;
    let focus = false;

    // Gives the tail its order, then draws it until it has come to rest.
    const animate = (order: (tail: Tail) => void) => {
      if (reducedMotion()) return;
      tail ??= load().then((m) => m.createTail());
      void tail.then((t) => {
        order(t);
        if (frame) return;
        let last = performance.now();
        const draw = (now: number) => {
          const moving = t.step((now - last) / 1000);
          last = now;
          mark.setAttribute('d', t.path());
          frame = moving ? requestAnimationFrame(draw) : 0;
        };
        frame = requestAnimationFrame(draw);
      });
    };
    const followAttention = () => animate((t) => t.hold(pointer || focus));

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      pointer = event.type === 'pointerenter';
      followAttention();
    };
    const onFocus = (event: FocusEvent) => {
      focus = event.type === 'focus' && anchor.matches(':focus-visible');
      followAttention();
    };
    anchor.addEventListener('pointerenter', onPointer);
    anchor.addEventListener('pointerleave', onPointer);
    anchor.addEventListener('focus', onFocus);
    anchor.addEventListener('blur', onFocus);

    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        seen.disconnect();
        timer = window.setTimeout(() => {
          void load().then(({ GREETING_SWINGS }) => animate((t) => t.wag(GREETING_SWINGS)));
        }, GREETING_DELAY_MS);
      },
      { threshold: 1 },
    );
    seen.observe(anchor);

    return () => {
      seen.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      anchor.removeEventListener('pointerenter', onPointer);
      anchor.removeEventListener('pointerleave', onPointer);
      anchor.removeEventListener('focus', onFocus);
      anchor.removeEventListener('blur', onFocus);
    };
  }, []);

  return (
    <a
      ref={link}
      href={href}
      target="_blank"
      rel="noopener"
      className={cx(styles.link, labelled && styles.labelled, className)}
      aria-label={labelled ? undefined : label}
      title={labelled ? undefined : label}
    >
      <svg className={styles.mark} viewBox="0 0 24 24" aria-hidden="true">
        <path ref={path} d={GITHUB_MARK_PATH} />
      </svg>
      {labelled && label}
    </a>
  );
}
