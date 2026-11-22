import type { ResolvedConfig } from '../../../src/config/schema';
import type { Findings } from './findings';
import type { Content } from './read';

// The home first screen's works on show in site.yaml (`home.featured`, design doc §11.8.1):
// every ID must exist, and only annotated prompts can be on show, since the first screen shows
// what each phrase does (§5.2). Called by validateContent.

const FILE = 'content/site.yaml';

/** The first screen quotes 3–5 lettered phrases (§11.8.1). */
export const MIN_FEATURED_ANNOTATIONS = 3;
/** A region over half the picture frames nearly all of it and shows no place for its phrase. */
export const MAX_REGION_AREA = 0.5;

const percent = (share: number) => `${Math.round(share * 100)}%`;

export function validateHomeSettings(content: Content, config: ResolvedConfig, findings: Findings): void {
  const seen = new Set<string>();
  config.home.featured.forEach((item, i) => {
    const field = `home.featured.${i}.prompt`;
    const prompt = content.prompts.get(item.prompt);
    if (!prompt) {
      findings.error(FILE, `prompt ${item.prompt} does not exist`, {
        field,
        fix: 'use the ID of an existing prompt, e.g. "p_045"',
      });
      return;
    }
    const annotations = prompt.data.annotations;
    if (annotations.length === 0)
      findings.error(FILE, `the featured work ${item.prompt} has no annotations`, {
        field,
        fix: 'feature an annotated prompt (annotations in its entry.yaml); the first screen shows what each phrase does',
      });
    if (seen.has(item.prompt))
      findings.warning(FILE, `${item.prompt} is featured more than once; only its first entry counts`, { field });
    else if (annotations.length > 0) {
      // Warnings, not errors, until the editors have annotated the works on show
      // (docs/home-ux-optimization-spec.md C-1).
      if (annotations.length < MIN_FEATURED_ANNOTATIONS)
        findings.warning(
          FILE,
          `the featured work ${item.prompt} has ${annotations.length} annotation(s); the first screen shows 3–5`,
          {
            field,
            fix: `annotate at least ${MIN_FEATURED_ANNOTATIONS} phrases in its entry.yaml, each confirmed by its test record`,
          },
        );
      const wide = annotations.filter((a) => a.region.w * a.region.h > MAX_REGION_AREA);
      if (wide.length)
        findings.warning(
          FILE,
          `the featured work ${item.prompt} frames most of its picture: ${wide
            .map((a) => `"${a.phrase}" covers ${percent(a.region.w * a.region.h)}`)
            .join(', ')}`,
          {
            field,
            fix: `narrow each region to what its phrase changes, at most ${percent(MAX_REGION_AREA)} of the picture`,
          },
        );
    }
    seen.add(item.prompt);
  });
}
