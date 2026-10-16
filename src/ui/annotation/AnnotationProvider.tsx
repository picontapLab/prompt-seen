'use client';

import { createContext, useContext, useId, useMemo, useState, type ReactNode } from 'react';
import type { Annotation } from '@/modules/content/types';
import { placeAnnotations, type AnnotationPlacement } from './layout';

// Shared state of one set of prompt annotations (design doc §11.1.9): which phrase is current,
// so the phrase in the text, its box on the image and its note light up together. The text and
// the image usually sit in different columns, hence a context rather than props. Several sets
// can share a page (list showcase, feature rows): ids are scoped per provider.

export type CurrentSource = 'pointer' | 'focus' | 'press';

type AnnotationState = {
  annotations: readonly Annotation[];
  placements: ReadonlyMap<string, AnnotationPlacement>;
  current: string | null;
  source: CurrentSource | null;
  setCurrent: (letter: string | null, source?: CurrentSource) => void;
  /** Id of the note element that describes a phrase (aria-describedby). */
  noteId: (letter: string) => string;
  /** Id of a box on the image, to scroll it into view after a tap (§11.8.1). */
  boxId: (letter: string) => string;
  /** Id of the image stage that holds the boxes. */
  stageId: string;
};

const Context = createContext<AnnotationState | null>(null);

export function AnnotationProvider({
  annotations,
  defaultCurrent = null,
  children,
}: {
  annotations: readonly Annotation[];
  /** Letter that starts out current, e.g. to open a showcase on its first phrase. */
  defaultCurrent?: string | null;
  children: ReactNode;
}) {
  const id = useId();
  const [current, setCurrentLetter] = useState<string | null>(defaultCurrent);
  const [source, setSource] = useState<CurrentSource | null>(defaultCurrent ? 'press' : null);
  const value = useMemo<AnnotationState>(
    () => ({
      annotations,
      placements: new Map(placeAnnotations(annotations).map((p) => [p.letter, p])),
      current,
      source,
      setCurrent: (letter, from) => {
        setCurrentLetter(letter);
        setSource(letter ? (from ?? 'press') : null);
      },
      noteId: (letter) => `${id}-note-${letter}`,
      boxId: (letter) => `${id}-box-${letter}`,
      stageId: `${id}-stage`,
    }),
    [annotations, current, source, id],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** The surrounding annotation state, or null outside a provider (then nothing is interactive). */
export function useAnnotations(): AnnotationState | null {
  return useContext(Context);
}
