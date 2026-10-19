import type { PromptDetail } from '@/modules/content/types';
import { paths } from '@/modules/url';
import type { Crumb } from '@/ui/navigation/Breadcrumb';
import { headerSections, linkedPages } from '@/ui/navigation/sections';

// Breadcrumb items of the detail pages (design doc §9.2, §9.6). The visible breadcrumb and its
// BreadcrumbList structured data are built from the same items, so they cannot drift apart.
// No 'use client' here: the detail bodies, the pages and the popup of step 4a all call it.

/** Message keys under `detail.breadcrumb`. */
export type CrumbLabel = 'home' | 'prompts' | 'templates';
type Label = (key: CrumbLabel) => string;

const sectionPath = (key: 'prompts' | 'templates', prefix: string) =>
  headerSections.find((s) => s.key === key)?.available ? paths[key](prefix) : null;

/** Home › Prompts › {category}. A crumb links only to a page this build has. */
export function promptCrumbs(detail: Pick<PromptDetail, 'taxonomy'>, prefix: string, label: Label): Crumb[] {
  const category = detail.taxonomy.category;
  return [
    { label: label('home'), href: paths.home(prefix) },
    { label: label('prompts'), href: sectionPath('prompts', prefix) },
    { label: category.label, href: linkedPages.topics ? category.path : null },
  ];
}

/** Home › Templates. */
export function templateCrumbs(prefix: string, label: Label): Crumb[] {
  return [
    { label: label('home'), href: paths.home(prefix) },
    { label: label('templates'), href: sectionPath('templates', prefix) },
  ];
}

// Pages of step 3e (design doc §9.1, §11.8.5). Labels come from the `pages.breadcrumb` messages.
type PageLabel = (key: 'home' | 'prompts' | 'collections') => string;

/** Home › Prompts › {topic}: a category, style or use-case topic sits under the list it filters. */
export function topicCrumbs(topic: { title: string }, prefix: string, label: PageLabel): Crumb[] {
  return [
    { label: label('home'), href: paths.home(prefix) },
    { label: label('prompts'), href: sectionPath('prompts', prefix) },
    { label: topic.title, href: null },
  ];
}

/** Home › Collections › {collection}, or Home › Collections on the index itself. */
export function collectionCrumbs(collection: { title: string } | null, prefix: string, label: PageLabel): Crumb[] {
  const index = headerSections.find((s) => s.key === 'collections')?.available ? paths.collections(prefix) : null;
  return [
    { label: label('home'), href: paths.home(prefix) },
    { label: label('collections'), href: collection ? index : null },
    ...(collection ? [{ label: collection.title, href: null }] : []),
  ];
}

/** Home › {page}: about, license. */
export function pageCrumbs(page: { title: string }, prefix: string, label: PageLabel): Crumb[] {
  return [
    { label: label('home'), href: paths.home(prefix) },
    { label: page.title, href: null },
  ];
}
