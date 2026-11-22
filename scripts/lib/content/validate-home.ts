import type { ResolvedConfig } from '../../../src/config/schema';
import { featuredOrder } from '../../../src/modules/home/featured';
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

/** The work on show and the row under it: the first screen a visitor compares at a glance. */
export const FIRST_SCREEN_WORKS = 7;
/** More works of one category than this among them read as one kind of picture (C-2). */
export const MAX_FIRST_SCREEN_SAME_CATEGORY = 3;

const percent = (share: number) => `${Math.round(share * 100)}%`;

export function validateHomeSettings(
  content: Content,
  config: ResolvedConfig,
  findings: Findings,
  /** The build date, as `composeHome` uses it: works scheduled later are not on show yet. */
  today = new Date().toISOString().slice(0, 10),
): void {
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

  // The first works in the order they are shown today, among those that can be on show
  // (docs/home-ux-optimization-spec.md C-2): one category filling them makes the first screen
  // and the row under it look alike. A warning, since the remedy is editorial.
  const shown = featuredOrder(config.home.featured, today)
    .filter((id) => content.prompts.get(id)?.data.annotations.length)
    .slice(0, FIRST_SCREEN_WORKS);
  const byCategory = new Map<string, string[]>();
  for (const id of shown) {
    const category = content.prompts.get(id)!.data.categoryId;
    byCategory.set(category, [...(byCategory.get(category) ?? []), id]);
  }
  for (const [category, ids] of byCategory)
    if (ids.length > MAX_FIRST_SCREEN_SAME_CATEGORY)
      findings.warning(
        FILE,
        `${ids.length} of the first ${shown.length} works on show are in the category "${category}" (${ids.join(', ')})`,
        {
          field: 'home.featured',
          fix: `feature works of other categories near the top, at most ${MAX_FIRST_SCREEN_SAME_CATEGORY} of one category among the first ${FIRST_SCREEN_WORKS}`,
        },
      );
}
