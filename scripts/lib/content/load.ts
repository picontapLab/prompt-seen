import path from 'node:path';
import type { ResolvedConfig } from '../../../src/config/schema';
import { contentDir } from '../../../src/config/load';
import type { createUrlModule } from '../../../src/modules/url/create';
import { buildIndex, type BuiltContent } from './build-index';
import { Findings } from './findings';
import { readContent, type Content } from './read';
import { validateContent } from './validate';
import { analyzeLocale, type LocaleReport } from '../localization/check';

// One entry point for content:validate and content:build: read, validate and (when there are
// no blocking findings) build the index for this configuration.

export type LoadResult = {
  findings: Findings;
  content: Content;
  /** Null when there are errors or publish errors. */
  built: BuiltContent | null;
  localization: LocaleReport[];
};

export type LoadOptions = {
  root: string;
  config: ResolvedConfig;
  url: ReturnType<typeof createUrlModule>;
  /** Defaults to CONTENT_DIR or content/. */
  dir?: string;
  /** Local media driver storage; defaults to public/ (§10.1). */
  mediaRoot?: string;
};

/** Preparation validates content contracts without asserting locale release completeness. */
export function readValidatedContent({ root, config, dir, mediaRoot }: Omit<LoadOptions, 'url'>) {
  const findings = new Findings(root);
  const content = readContent(dir ?? contentDir(root), config.locales, findings);
  validateContent(content, config, findings, { mediaRoot: mediaRoot ?? path.join(root, 'public') });
  return { content, findings };
}

export function loadContent({ root, config, url, dir, mediaRoot }: LoadOptions): LoadResult {
  const { content, findings } = readValidatedContent({ root, config, dir, mediaRoot });
  const snapshot = { root, config, content, findings };
  const localization = config.locales.map((locale) => analyzeLocale(snapshot, locale.code));
  for (const report of localization) {
    if (!config.locales.some((locale) => locale.code === report.locale && locale.enabled)) continue;
    for (const finding of report.findings)
      if (finding.blockingForRelease && !findings.list.some((existing) => existing.file === finding.file && existing.field === finding.field && existing.message === finding.message)) findings.add({ ...finding, level: 'publish' });
  }
  const statuses = new Map(localization.map((report) => [report.locale, new Map(report.items.map((item) => [item.key, item.localStatus]))]));
  const built = findings.blocking ? null : buildIndex(content, config, url, statuses);
  return { findings, content, built, localization };
}
