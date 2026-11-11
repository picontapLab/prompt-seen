'use client';

import { useId } from 'react';
import { useAnnotations } from './AnnotationProvider';
import styles from './Annotation.module.css';

/**
 * The notes of every annotation as text, in letter order (design doc §11.1.9: the boxes are a
 * visual aid, the explanation is always readable). Each note is the accessible description of
 * its phrase; the current one is highlighted. `promptLanguage` marks the quoted phrases, which
 * keep the prompt's language on pages in other languages.
 */
export function AnnotationNotes({
  heading,
  promptLanguage,
  visuallyHidden,
}: {
  heading: string;
  promptLanguage: string;
  /** Kept for assistive technology only, where a one-line caption shows the current note. */
  visuallyHidden?: boolean;
}) {
  const state = useAnnotations();
  const headingId = useId();
  if (!state || state.annotations.length === 0) return null;
  const { annotations, current, noteId } = state;

  return (
    <section className={visuallyHidden ? 'visually-hidden' : styles.notes} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.notesHeading}>
        {heading}
      </h2>
      <ol>
        {annotations.map((a) => (
          <li key={a.letter} id={noteId(a.letter)} data-current={current === a.letter || undefined}>
            <span className={styles.letter} data-solid={current === a.letter ? '' : undefined} aria-hidden="true">
              {a.letter}
            </span>
            <span>
              <q className={styles.quoted} lang={promptLanguage}>
                {a.phrase}
              </q>{' '}
              <span lang={a.noteLocale ?? undefined} dir="auto">
                {a.note}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** One line under a showcase image with the current note (§11.8.1); visual only. */
export function AnnotationCaption({ hint }: { hint?: string }) {
  const state = useAnnotations();
  if (!state || state.annotations.length === 0) return null;
  const a = state.annotations.find((x) => x.letter === state.current);
  return (
    <p className={styles.caption} aria-hidden="true" data-empty={a ? undefined : ''}>
      {a ? (
        <>
          <span className={styles.letter} data-solid="">
            {a.letter}
          </span>
          <span>
            <span lang={a.noteLocale ?? undefined} dir="auto">
              {a.note}
            </span>
          </span>
        </>
      ) : (
        hint && <span className={styles.hint}>{hint}</span>
      )}
    </p>
  );
}
