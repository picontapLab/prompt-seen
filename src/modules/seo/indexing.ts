import type { LocaleEntry } from '@/config/schema';
import type { LocalizationState } from '@/modules/content/types';

// What search engines and AI tools are given (design doc §8.4, §9.3, §9.10.4). Pure, so the
// sitemaps, the Markdown versions, llms.txt and `content:export` apply the same rule.

/**
 * Which kinds of page this build has. Routes pass the shell's flags (src/ui/navigation/sections.ts),
 * so machine-readable outputs never point at a page that does not exist yet.
 */
export type PageSections = {
  /** The Prompt list and its pages (step 3a). */
  prompts: boolean;
  /** The template list (step 3c). Template detail pages always exist. */
  templates: boolean;
  /** Collection pages (step 3e). */
  collections: boolean;
  /** Category, style and use-case topic pages (step 3e). */
  topics: boolean;
  /** About and license pages (step 3e). */
  pages: boolean;
};

/**
 * True when a version may be indexed and gets machine-readable twins (sitemap entry, index.md,
 * llms.txt, exports). In preview builds `published` alone is not enough: a preview-only locale's
 * versions pass the content rules, but the locale itself is not public (§8.2).
 */
export function isIndexable(locale: Pick<LocaleEntry, 'enabled'>, localization: LocalizationState): boolean {
  return locale.enabled && localization.indexable;
}

export function isAggregateIndexable(
  locale: Pick<LocaleEntry, 'enabled'>,
  items: readonly { localization: LocalizationState }[],
): boolean {
  return locale.enabled && items.length > 0 && items.every((item) => item.localization.indexable);
}
