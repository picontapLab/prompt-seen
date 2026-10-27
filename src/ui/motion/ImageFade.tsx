'use client';

import { useEffect } from 'react';
import { duration, ease } from '@/styles/tokens/motion';

/**
 * Lazily loaded images fade in over their frame's dominant colour once they arrive (design doc
 * §11.9 主色占位, §12.1): the frame shows `placeholder.color` until the picture is in, which then
 * takes `--duration-image`. Only images that load after the page has taken over and are lazy, so
 * the first screen and the main image are never held back (§12.3, LCP), and each image once,
 * so a larger `srcset` candidate after a resize does not fade again. Reduced motion shows them
 * at once (§12.7). Mounted once by the shell; renders nothing.
 */
export function ImageFade() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const faded = new WeakSet<HTMLImageElement>();
    const onLoad = (event: Event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || img.loading !== 'lazy' || faded.has(img)) return;
      faded.add(img);
      if (reduce.matches || img.closest('[data-motion="reduce"]')) return;
      img.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: duration.image,
        easing: `cubic-bezier(${ease.enter.join(', ')})`,
      });
    };
    // `load` does not bubble; capturing on the document sees every image, appended ones too.
    document.addEventListener('load', onLoad, true);
    return () => document.removeEventListener('load', onLoad, true);
  }, []);
  return null;
}
