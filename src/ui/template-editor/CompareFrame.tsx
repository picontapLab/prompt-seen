'use client';

import { ChevronsLeftRight } from 'lucide-react';
import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react';
import type { ImageRef } from '@/modules/content/types';
import { getImage } from '@/modules/media';
import { dividerPosition } from './stage';
import styles from './TemplateStage.module.css';

export type CompareFrameProps = {
  before: ImageRef;
  after: ImageRef;
  labels: {
    before: string;
    after: string;
    /** Names the divider's slider. */
    slider: string;
    /** What the slider's value means, e.g. "40% original". */
    value: (percent: number) => string;
  };
  sizes: string;
};

/** Where the divider rests: both halves in view. */
const REST = 50;
/**
 * The one-time sweep when the frame first comes into view, as divider positions over time: nearly
 * all of the input, nearly all of the result, then back to rest.
 */
const SWEEP = [REST, 88, 12, REST];
const SWEEP_MS = 1800;

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce';

/**
 * Before and after in one frame (design doc §11.8.4 案例舞台): the result fills the frame and the
 * input lies over it up to a divider, so an edit reads at the full size of the stage. Both images
 * are in the HTML with their own alt text, split in the middle before scripts run. The divider
 * follows a drag anywhere on the frame and is a slider for keyboards and assistive technology.
 * Its position is written to the element, not to React state (§11.6.1). A divider at rest can
 * hide a change that lies wholly on one side, so the first time the frame is seen it sweeps once
 * across the picture and returns; never under reduced motion, and never after it has been touched.
 */
export function CompareFrame({ before, after, labels, sizes }: CompareFrameProps) {
  const frame = useRef<HTMLDivElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const touched = useRef(false);
  const sweep = useRef<Animation | null>(null);
  const a = getImage(after, 'detail');
  const b = getImage(before, 'detail');

  function show(percent: number) {
    frame.current?.style.setProperty('--compare-pos', `${percent}%`);
    const input = range.current;
    if (!input) return;
    input.value = String(percent);
    input.setAttribute('aria-valuetext', labels.value(percent));
  }

  function take() {
    touched.current = true;
    sweep.current?.cancel();
    sweep.current = null;
  }

  function follow(event: PointerEvent<HTMLDivElement>) {
    const el = frame.current;
    if (!el) return;
    show(dividerPosition(event.clientX, el.getBoundingClientRect(), getComputedStyle(el).direction === 'rtl'));
  }

  useEffect(() => {
    const el = frame.current;
    // Without @property the position cannot be interpolated: the frame stays at rest.
    if (
      !el ||
      typeof IntersectionObserver === 'undefined' ||
      typeof CSS === 'undefined' ||
      !('registerProperty' in CSS)
    )
      return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        if (touched.current || reducedMotion()) return;
        sweep.current = el.animate({ '--compare-pos': SWEEP.map((p) => `${p}%`) } as PropertyIndexedKeyframes, {
          duration: SWEEP_MS,
          easing: 'ease-in-out',
        });
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      sweep.current?.cancel();
    };
  }, []);

  return (
    <div
      ref={frame}
      className={styles.compare}
      data-compare=""
      style={{ '--w': after.width, '--h': after.height, background: a.placeholder } as CSSProperties}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        take();
        event.currentTarget.setPointerCapture(event.pointerId);
        follow(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) follow(event);
      }}
    >
      <img
        className={styles.compareImage}
        src={a.src}
        srcSet={a.srcSet}
        sizes={sizes}
        width={a.width}
        height={a.height}
        alt={a.alt}
        lang={a.lang}
        fetchPriority="high"
        draggable={false}
        data-stage-output=""
      />
      <div className={styles.compareBefore}>
        <img
          className={styles.compareImage}
          src={b.src}
          srcSet={b.srcSet}
          sizes={sizes}
          width={b.width}
          height={b.height}
          alt={b.alt}
          lang={b.lang}
          draggable={false}
        />
      </div>
      <span className={`${styles.tag} ${styles.tagBefore}`} aria-hidden="true">
        {labels.before}
      </span>
      <span className={`${styles.tag} ${styles.tagAfter}`} aria-hidden="true">
        {labels.after}
      </span>
      <input
        ref={range}
        className={styles.compareRange}
        type="range"
        min={0}
        max={100}
        step={1}
        defaultValue={REST}
        aria-label={labels.slider}
        aria-valuetext={labels.value(REST)}
        onInput={(event) => {
          take();
          show(Number(event.currentTarget.value));
        }}
      />
      <span className={styles.divider} aria-hidden="true">
        <span className={styles.knob}>
          <ChevronsLeftRight />
        </span>
      </span>
    </div>
  );
}
