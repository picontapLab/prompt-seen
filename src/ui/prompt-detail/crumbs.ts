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
