import type { FieldValues } from './types';

type RecordedExample = {
  prompt: string;
  promptLanguage?: string | null;
  template: { id: string; version: string; values: FieldValues } | null;
};

/** A preview is evidence only for the exact recipe that produced it. */
export function matchingExample<T extends RecordedExample>(
  runs: readonly T[],
  templateId: string,
  version: string,
  values: FieldValues,
  prompt: string | null,
  language?: string,
): T | null {
  if (prompt === null) return null;
  return (
    runs.find((run) => {
      const template = run.template;
      return (
        template?.id === templateId &&
        template.version === version &&
        run.prompt === prompt &&
        (language === undefined || run.promptLanguage === language) &&
        Object.keys(values).length === Object.keys(template.values).length &&
        Object.entries(values).every(([key, value]) => JSON.stringify(value) === JSON.stringify(template.values[key]))
      );
    }) ?? null
  );
}
