import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { feedBandFile, feedIndexFile, feedPageFile } from './files';
import type { FeedBand, FeedIndex, FeedPage } from './types';

// The list's data for pages (design doc §3.5, §9.4). The list pages render from the very JSON
// the browser loads for later batches, so the HTML of /page/{n}/ and {n}.json always agree.
// Written by the `feed` emitter during content:build; locale arguments are registry codes.

const root = () => process.cwd();

function read<T>(dir: 'public/generated' | '.generated', file: string): T | null {
  const full = path.join(root(), dir, file);
  return fs.existsSync(full) ? (JSON.parse(fs.readFileSync(full, 'utf8')) as T) : null;
}

export function feedPage(locale: string, page: number): FeedPage {
  const data = read<FeedPage>('public/generated', feedPageFile(locale, page));
  if (!data) throw new Error(`feed page ${page} of ${locale} is missing: run \`npm run content:build\``);
  return data;
}

export function feedIndex(locale: string): FeedIndex {
  const data = read<FeedIndex>('public/generated', feedIndexFile(locale));
  if (!data) throw new Error(`the feed index of ${locale} is missing: run \`npm run content:build\``);
  return data;
}

/** The showcase band of a locale's list, or null when no configured group applies. */
export const feedBand = (locale: string): FeedBand | null => read<FeedBand>('.generated', feedBandFile(locale));

export * from './files';
export * from './types';
