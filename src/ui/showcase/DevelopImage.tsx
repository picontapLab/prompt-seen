'use client';

import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import styles from './DevelopImage.module.css';

export type DevelopImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'className'> & {
  /** A small file of the same image (the thumbnail), shown blurred while the sharp one loads. */
  preview?: string;
};

type Phase = 'static' | 'pending' | 'developing' | 'settled';

/**
 * "Develop" (design doc §11.1.8, §11.1.9, §12.1 首屏显影): the frame's dominant colour, then a
 * blurred preview, then the sharp image fading in over it, like a print in developer. It is
 * progressive loading, not a reveal: without JavaScript, or when the file has already loaded, the
 * image shows as soon as it paints, and nothing waits for the animation. Only an image still
 * loading when the component mounts (a slow first visit, or the next work on show) develops.
 * Reduced motion shows the end state at once (`--duration-develop: 0ms`).
 *
 * The parent is the frame: positioned, sized to the image, with the colour as its background.
 */
export function DevelopImage({ preview, src, ...img }: DevelopImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [phase, setPhase] = useState<Phase>('static');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already painted (cached, or loaded before hydration): the preview has served its purpose.
    if (el.complete && el.naturalWidth > 0) {
      setPhase('settled');
      return;
    }
    setPhase('pending');
    const loaded = () =>
      setPhase(getComputedStyle(el).getPropertyValue('--duration-develop').trim() === '0ms' ? 'settled' : 'developing');
    const failed = () => setPhase('static');
    el.addEventListener('load', loaded, { once: true });
    el.addEventListener('error', failed, { once: true });
    return () => {
      el.removeEventListener('load', loaded);
      el.removeEventListener('error', failed);
    };
  }, [src]);

  // The animation's end settles it; a timer does too, for pages that render no frames meanwhile
  // (a hidden tab), so the preview never outlives the developed image.
  useEffect(() => {
    if (phase !== 'developing' || !ref.current) return;
    const ms = parseFloat(getComputedStyle(ref.current).animationDuration) * 1000 || 0;
    const timer = window.setTimeout(() => setPhase('settled'), ms + 250);
    return () => window.clearTimeout(timer);
  }, [phase]);

  return (
    <>
      {preview && phase !== 'settled' && (
        <span className={styles.preview} aria-hidden="true">
          <img src={preview} alt="" decoding="async" />
        </span>
      )}
      <img
        ref={ref}
        src={src}
        {...img}
        alt={img.alt}
        className={styles.image}
        data-develop={phase === 'pending' || phase === 'developing' ? phase : undefined}
        onAnimationEnd={() => setPhase('settled')}
      />
    </>
  );
}
