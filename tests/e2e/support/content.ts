import fs from 'node:fs';
import path from 'node:path';
import type { LocaleIndex, PromptDetail, TemplateDetail } from '../../../src/modules/content/types';
import { ROOT } from './artifact';

// The content model of the build under test (.generated/content/, written by content:build in
// the same `npm run build`), so tests pick real entries and compare pages with their data.

const dir = path.join(ROOT, '.generated/content');
const read = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as T;

export const localeIndex = (code: string) => read<LocaleIndex>(`${code}/index.json`);
export const promptDetail = (code: string, id: string) => read<PromptDetail>(`${code}/prompt/${id}.json`);
export const templateDetail = (code: string, id: string) => read<TemplateDetail>(`${code}/template/${id}.json`);

/** An annotated prompt of the locale when there is one (the richest page), else the first. */
export function samplePrompt(code: string): PromptDetail {
  const index = localeIndex(code);
  const summary = index.prompts.find((p) => p.annotated) ?? index.prompts[0];
  if (!summary) throw new Error(`no prompt is visible in ${code}`);
  return promptDetail(code, summary.id);
}

export function sampleTemplate(code: string): TemplateDetail | null {
  const summary = localeIndex(code).templates[0];
  return summary ? templateDetail(code, summary.id) : null;
}
