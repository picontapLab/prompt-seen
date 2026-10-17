'use client';

import { useMemo, useRef } from 'react';
import { splitPrompt } from './layout';
import { useAnnotations } from './AnnotationProvider';
import styles from './Annotation.module.css';

/**
 * Prompt text with its annotated phrases (design doc §11.1.9, §11.8.1). Each phrase is a button
 * in reading order: hovering with a mouse, focusing or pressing it makes it current; Esc clears
 * it. Its note is its accessible description, so the box on the image stays a visual aid. The
 * letter after each phrase is CSS generated content: it is not part of the text, so selecting
 * and copying the prompt by hand gives the prompt alone (§11.8.3).
 */
export function AnnotatedText({ text }: { text: string }) {
  const state = useAnnotations();
  const annotations = state?.annotations;
  const pieces = useMemo(() => splitPrompt(text, annotations ?? []), [text, annotations]);
  const pointer = useRef<string>('mouse');

  if (!state) return <>{text}</>;
  const { current, source, setCurrent, noteId, boxId, stageId } = state;

  function revealBox(letter: string) {
    // After a tap the box may be off screen (the image sits above the text on phones): bring
    // the image into view, without moving when any part of the box is already visible.
    const box = document.getElementById(boxId(letter));
    const stage = document.getElementById(stageId);
    if (!box || !stage) return;
    const r = box.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    stage.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }

  return (
    <>
      {pieces.map((piece, i) => {
        const a = piece.annotation;
        if (!a) return <span key={i}>{piece.text}</span>;
        const isCurrent = current === a.letter;
        return (
          <button
            key={i}
            type="button"
            className={styles.phrase}
            data-letter={a.letter}
            data-current={isCurrent || undefined}
            aria-pressed={isCurrent}
            aria-describedby={noteId(a.letter)}
            onPointerDown={(e) => {
              pointer.current = e.pointerType;
            }}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') setCurrent(a.letter, 'pointer');
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === 'mouse' && source === 'pointer' && isCurrent) setCurrent(null);
            }}
            onFocus={(e) => {
              if (e.currentTarget.matches(':focus-visible')) setCurrent(a.letter, 'focus');
            }}
            onBlur={() => {
              if (source === 'focus' && isCurrent) setCurrent(null);
            }}
            onClick={() => {
              // A mouse click on a hovered phrase keeps it; a tap or Enter toggles it.
              if (pointer.current === 'mouse' && source === 'pointer') return setCurrent(a.letter, 'press');
              const next = isCurrent && source === 'press' ? null : a.letter;
              setCurrent(next, 'press');
              if (next && pointer.current !== 'mouse') revealBox(next);
              pointer.current = 'mouse';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && current) {
                e.stopPropagation();
                setCurrent(null);
              }
            }}
          >
            {piece.text}
          </button>
        );
      })}
    </>
  );
}
