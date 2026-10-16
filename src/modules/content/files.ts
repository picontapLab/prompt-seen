import type { EntryKind } from './types';

// Where content:build writes the content model and where the reader finds it (design doc §4.1:
// .generated/ holds build-only data that is never published). Shared by the emitter and the
// reader so the two cannot drift.

/** Relative to the repository root. */
export const CONTENT_INDEX_DIR = '.generated/content';

export const manifestFile = () => 'manifest.json';
export const localeIndexFile = (locale: string) => `${locale}/index.json`;
/** `key` is an ID for prompts, templates and collections, a slug for pages, `{taxonomy}/{id}` for topics. */
export const detailFile = (locale: string, kind: EntryKind, key: string) => `${locale}/${kind}/${key}.json`;
