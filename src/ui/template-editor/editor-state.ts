import type { FieldError, FieldValues } from '@/modules/template';
import { sameValues } from './values';

// Editor state (design doc §11.4, §11.6.1): the values the controls show and what the form says
// about them. The rendered prompt is not state: it is computed from the values with the shared
// pure renderer on every render, so the preview, copy and download cannot disagree (§6.3, §11.6.4).

/** Why the values are what they are, shown above the form until the next change (§11.8.4). */
export type Notice =
  | { kind: 'restored' }
  | { kind: 'shared' }
  /** A shared link for another template version: its values are not applied. */
  | { kind: 'mismatch'; version: string };

export type EditorState = {
  values: FieldValues;
  /** The sample the values came from; "another sample" moves on from it (§11.4). */
  sample: number;
  /** Fields left at least once: their missing values count as errors to show. */
  touched: readonly string[];
  /** After a blocked copy every error shows, so the count matches what the form says. */
  reveal: boolean;
  /** Per field, how often its value changed: restarts the preview highlight (§11.8.4 局部反馈). */
  pulses: Readonly<Record<string, number>>;
  notice: Notice | null;
};

export type EditorAction =
  | { type: 'edit'; field: string; value: string | string[] }
  | { type: 'touch'; field: string }
  | { type: 'reveal' }
  /** Values from a sample, a reset, a draft, a shared link or an undo. */
  | { type: 'load'; values: FieldValues; sample?: number; notice?: Notice | null };

export function initialEditorState(values: FieldValues): EditorState {
  return { values, sample: 0, touched: [], reveal: false, pulses: {}, notice: null };
}

function pulse(pulses: Readonly<Record<string, number>>, from: FieldValues, to: FieldValues) {
  const next = { ...pulses };
  for (const key of Object.keys(to))
    if (!sameValues({ v: from[key] ?? '' }, { v: to[key] ?? '' })) next[key] = (next[key] ?? 0) + 1;
  return next;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'edit': {
      if (sameValues({ v: state.values[action.field] ?? '' }, { v: action.value })) return state;
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        pulses: { ...state.pulses, [action.field]: (state.pulses[action.field] ?? 0) + 1 },
        notice: state.notice?.kind === 'mismatch' ? state.notice : null,
      };
    }
    case 'touch':
      return state.touched.includes(action.field) ? state : { ...state, touched: [...state.touched, action.field] };
    case 'reveal':
      return state.reveal ? state : { ...state, reveal: true };
    case 'load':
      return {
        values: action.values,
        sample: action.sample ?? state.sample,
        touched: [],
        reveal: false,
        pulses: pulse(state.pulses, state.values, action.values),
        notice: action.notice ?? null,
      };
  }
}

/** Errors about limits show as soon as they happen; a missing value only once the field was left (§11.4, §11.7). */
const SHOW_AT_ONCE = new Set<FieldError['code']>([
  'too-long',
  'too-many',
  'item-too-long',
  'invalid-option',
  'wrong-type',
]);

export function visibleErrors(state: EditorState, errors: readonly FieldError[]): FieldError[] {
  return errors.filter((e) => state.reveal || state.touched.includes(e.field) || SHOW_AT_ONCE.has(e.code));
}
