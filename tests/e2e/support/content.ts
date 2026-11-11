import fs from 'node:fs';
import path from 'node:path';
import type { ContentManifest, LocaleIndex, PromptDetail, TemplateDetail } from '../../../src/modules/content/types';
import { feedBandFile, feedIndexFile, feedPageFile } from '../../../src/modules/feed/files';
import type { FeedIndex, FeedPage, FeedBand } from '../../../src/modules/feed/types';
import { ROOT } from './artifact';

// The content model of the build under test (.generated/content/, written by content:build in
// the same `npm run build`), so tests pick real entries and compare pages with their data.

const dir = path.join(ROOT, '.generated/content');
const read = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as T;

export const localeIndex = (code: string) => read<LocaleIndex>(`${code}/index.json`);
export const manifest = () => read<ContentManifest>('manifest.json');
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

// The list's data as the build wrote it (public/generated/{locale}/feed/, design doc §3.5).
const feedDir = path.join(ROOT, 'public/generated');
const readFeed = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(feedDir, file), 'utf8')) as T;
export const feedIndex = (code: string) => readFeed<FeedIndex>(feedIndexFile(code));
export const feedPage = (code: string, n: number) => readFeed<FeedPage>(feedPageFile(code, n));
export const hasBand = (code: string) => fs.existsSync(path.join(ROOT, '.generated', feedBandFile(code)));

/** Prompt IDs of a page in order: cards, and feature rows of extreme works (§11.1.4). */
export const pagePromptIds = (page: FeedPage) =>
  page.blocks.flatMap((b) =>
    b.t === 'cards' ? b.items.map((c) => c.id) : b.t === 'feature' && b.reason === 'extreme' ? [b.card.id] : [],
  );

export function listIsIndexable(code: string, n: number): boolean {
  const page = feedPage(code, n);
  const entries = page.blocks.flatMap((block): { localization: { indexable: boolean } }[] =>
    block.t === 'cards' || block.t === 'templates' ? block.items : block.t === 'feature' ? [block.card] : [block.item],
  );
  if (n === 1 && hasBand(code)) {
    const band = JSON.parse(fs.readFileSync(path.join(ROOT, '.generated', feedBandFile(code)), 'utf8')) as FeedBand;
    entries.push(band.lead, ...band.works);
  }
  return entries.length > 0 && entries.every((entry) => entry.localization.indexable);
}
