import { flipTransform, type Box } from './logic';

// The shared image of the detail popup (design doc §11.3.2, §12.6): a copy of the picture flies
// between the card and the popup's image stage. Only the image moves; text, labels and buttons
// keep their size. The copy lives in the dialog (the browser's top layer, above the scrim) and
// uses the file that is already loaded, so nothing waits for the network.
//
// Implemented with the Web Animations API rather than Motion's layoutId: the two ends sit in
// different trees (the list, and a native modal <dialog> in the top layer), and one transform
// on one element needs no measuring layout tree (§12.2 permits the platform for simple motion).

export type Flight = { animation: Animation; done: Promise<void> };

const box = (r: DOMRect): Box => ({ left: r.left, top: r.top, width: r.width, height: r.height });

/**
 * Flies an image with `src` from the box `from` to the element `to`, inside `layer`. While it
 * flies, `hide` (if given) is invisible, so the real picture appears where the copy lands.
 * Cancelling the animation ends the flight at once and cleans up.
 */
export function fly(opts: {
  src: string;
  from: Box;
  to: Box;
  layer: HTMLElement;
  hide?: HTMLElement | null;
  duration: number;
  easing: string;
  radius?: string;
}): Flight {
  const { src, from, to, layer, hide } = opts;
  const ghost = document.createElement('img');
  ghost.src = src;
  ghost.alt = '';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.dataset.popupFlight = '';
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${to.left}px`,
    top: `${to.top}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
    margin: '0',
    maxWidth: 'none',
    objectFit: 'fill',
    transformOrigin: '0 0',
    pointerEvents: 'none',
    zIndex: '10',
    borderRadius: opts.radius ?? '',
  } satisfies Partial<CSSStyleDeclaration>);
  layer.append(ghost);
  if (hide) hide.style.visibility = 'hidden';

  const animation = ghost.animate([{ transform: flipTransform(from, to) }, { transform: 'none' }], {
    duration: opts.duration,
    easing: opts.easing,
    fill: 'forwards',
  });
  const cleanup = () => {
    ghost.remove();
    if (hide) hide.style.visibility = '';
  };
  const done = animation.finished.then(cleanup, cleanup);
  return { animation, done };
}

export const rectOf = (el: Element): Box => box(el.getBoundingClientRect());
