import type { ImageRef, TemplateSample } from '@/modules/content/types';
import { renderTemplate, type FieldValues, type TemplateVersionSpec } from '@/modules/template';
import { matchingExample } from '@/modules/template/examples';
import { sampleValues } from './values';

// What the example stage of a template shows (design doc §11.8.4). Pure helpers without a 'use
// client' directive, shared by the server render, the browser and the unit tests.

type Frame = Pick<ImageRef, 'width' | 'height' | 'animation'>;

/**
 * single: the result alone (templates that generate from text).
 * compare: one input and the result in the same frame, laid over each other with a divider.
 * inputs: the inputs beside the result (another ratio, several inputs, or an animated result).
 */
export type StageMode = 'single' | 'compare' | 'inputs';

/** Ratios within 2% of each other count as the same frame: an edit, not a new composition. */
const SAME_FRAME = 0.02;

export function stageMode(output: Frame, references: readonly Frame[]): StageMode {
  if (references.length === 0) return 'single';
  const [input] = references;
  if (references.length > 1 || !input || output.animation || input.animation) return 'inputs';
  const a = input.width / input.height;
  const b = output.width / output.height;
  return Math.abs(a - b) / b <= SAME_FRAME ? 'compare' : 'inputs';
}

type RecordedRun = {
  id: string;
  prompt: string;
  promptLanguage?: string | null;
  template: { id: string; version: string; values: FieldValues } | null;
};

/**
 * The recorded run of each sample, in sample order; null where a sample was never run. A sample
 * that names its runs (`exampleIds`) is matched among those only. The match is exact, values and
 * prompt, so an image is only ever shown as the result of the recipe that made it (§5.5).
 */
export function sampleRuns<T extends RecordedRun>(
  runs: readonly T[],
  samples: readonly TemplateSample[],
  spec: TemplateVersionSpec,
  template: { id: string; version: string; language: string },
): (T | null)[] {
  return samples.map((sample, index) => {
    const values = sampleValues(spec.fields, samples, index);
    const eligible = sample.exampleIds ? runs.filter((run) => sample.exampleIds!.includes(run.id)) : runs;
    return matchingExample(
      eligible,
      template.id,
      template.version,
      values,
      renderTemplate(spec, values).text,
      template.language,
    );
  });
}

/** Position of the compare divider from a pointer's x within the frame, as a whole percentage. */
export function dividerPosition(clientX: number, frame: { left: number; width: number }, rtl: boolean): number {
  if (frame.width <= 0) return 50;
  const share = ((clientX - frame.left) / frame.width) * 100;
  return Math.round(Math.min(Math.max(rtl ? 100 - share : share, 0), 100));
}
