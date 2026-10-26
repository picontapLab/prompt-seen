import { useEffect, useEffectEvent, type RefObject } from 'react';
import { duration, ease } from '@/styles/tokens/motion';
import { classifySwipe, EDGE_GUARD_PX, type SwipeResult } from './logic';

// One-finger swipes in the mobile popup (design doc §11.3, §12.1): sideways switches works, down
// closes. The panel follows the finger; a swipe that does not count springs back. Touch events,
// not pointer events: the popup must keep native vertical scrolling, so the swipe claims a
// gesture (preventDefault on a non-passive touchmove) only once it is clearly sideways, or
// downwards with the popup scrolled to the top. Never from within 20 px of the screen edge
// (system back gesture), with two fingers, while the page is pinch-zoomed, or on controls that
// use horizontal drags themselves (sliders, rows that scroll sideways).

const AXIS_LOCK_PX = 10;
const css = (e: readonly number[]) => `cubic-bezier(${e.join(', ')})`;

function scrollsSideways(target: Element, boundary: Element): boolean {
  for (let el: Element | null = target; el && el !== boundary; el = el.parentElement) {
    if (el.matches('input, textarea, select, [role="slider"], [data-swipe-ignore]')) return true;
    if (el.scrollWidth > el.clientWidth + 1) {
      const x = getComputedStyle(el).overflowX;
      if (x === 'auto' || x === 'scroll') return true;
    }
  }
  return false;
}

export function useSwipe(
  scroller: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
  opts: { enabled: boolean; rtl: boolean; reducedMotion: () => boolean },
  onSwipe: (result: Exclude<SwipeResult, null>) => void,
): void {
  const fire = useEffectEvent(onSwipe);
  const reduced = useEffectEvent(opts.reducedMotion);
  const { enabled, rtl } = opts;

  useEffect(() => {
    const root = scroller.current;
    if (!enabled || !root) return;
    let start: { x: number; y: number; t: number; atTop: boolean } | null = null;
    let axis: 'x' | 'y' | null = null;
    let dx = 0;
    let dy = 0;

    const follow = (x: number, y: number) => {
      const el = panel.current;
      if (el) el.style.transform = x || y ? `translate(${x}px, ${y}px)` : '';
    };
    const settleBack = () => {
      const el = panel.current;
      if (!el || (!dx && !dy)) return follow(0, 0);
      const from = el.style.transform;
      follow(0, 0);
      if (!reduced())
        el.animate([{ transform: from }, { transform: 'none' }], {
          duration: duration.content,
          easing: css(ease.enter),
        });
    };
    const reset = () => {
      start = null;
      axis = null;
      dx = dy = 0;
    };

    const onStart = (e: TouchEvent) => {
      reset();
      if (e.touches.length !== 1) return follow(0, 0);
      const touch = e.touches[0]!;
      const zoomed = (window.visualViewport?.scale ?? 1) > 1.01;
      const nearEdge = touch.clientX < EDGE_GUARD_PX || touch.clientX > window.innerWidth - EDGE_GUARD_PX;
      if (zoomed || nearEdge || scrollsSideways(e.target as Element, root)) return;
      start = { x: touch.clientX, y: touch.clientY, t: e.timeStamp, atTop: root.scrollTop <= 0 };
    };

    const onMove = (e: TouchEvent) => {
      if (!start) return;
      if (e.touches.length !== 1) {
        follow(0, 0);
        return reset();
      }
      const touch = e.touches[0]!;
      dx = touch.clientX - start.x;
      dy = touch.clientY - start.y;
      if (!axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) return;
        if (Math.abs(dx) > Math.abs(dy)) axis = 'x';
        else if (dy > 0 && start.atTop && root.scrollTop <= 0) axis = 'y';
        else return reset(); // an ordinary scroll: leave it to the browser
      }
      e.preventDefault();
      if (!reduced()) follow(axis === 'x' ? dx * 0.6 : 0, axis === 'y' ? Math.max(0, dy) : 0);
    };

    const onEnd = (e: TouchEvent) => {
      if (!start || !axis) return reset();
      const result = classifySwipe({
        dx: axis === 'x' ? dx : 0,
        dy: axis === 'y' ? dy : 0,
        dt: e.timeStamp - start.t,
        width: window.innerWidth,
        rtl,
        atTop: start.atTop,
      });
      if (result === 'close') {
        fire('close'); // the panel stays where the finger left it until the popup closes
      } else {
        settleBack();
        if (result) fire(result);
      }
      reset();
    };

    const onCancel = () => {
      settleBack();
      reset();
    };

    root.addEventListener('touchstart', onStart, { passive: true });
    root.addEventListener('touchmove', onMove, { passive: false });
    root.addEventListener('touchend', onEnd);
    root.addEventListener('touchcancel', onCancel);
    return () => {
      root.removeEventListener('touchstart', onStart);
      root.removeEventListener('touchmove', onMove);
      root.removeEventListener('touchend', onEnd);
      root.removeEventListener('touchcancel', onCancel);
      follow(0, 0);
    };
  }, [enabled, rtl, scroller, panel]);
}
