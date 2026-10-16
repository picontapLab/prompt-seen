import path from 'node:path';
import type { ResolvedConfig } from '../../../src/config/schema';
import { contentDir } from '../../../src/config/load';
import type { createUrlModule } from '../../../src/modules/url/create';
import { buildIndex, type BuiltContent } from './build-index';
import { Findings } from './findings';
import { readContent, type Content } from './read';
import { validateContent } from './validate';

// One entry point for content:validate and content:build: read, validate and (when there are
// no blocking findings) build the index for this configuration.

export type LoadResult = {
  findings: Findings;
  content: Content;
  /** Null when there are errors or publish errors. */
  built: BuiltContent | null;
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

export function loadContent({ root, config, url, dir, mediaRoot }: LoadOptions): LoadResult {
  const findings = new Findings(root);
  const content = readContent(dir ?? contentDir(root), config.locales, findings);
  validateContent(content, config, findings, { mediaRoot: mediaRoot ?? path.join(root, 'public') });
  const built = findings.blocking ? null : buildIndex(content, config, url);
  return { findings, content, built };
}
