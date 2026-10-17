import { paths } from '@/modules/url';

// Top-level sections in the header and links in the footer (design doc §11.8, §15.5.2).
//
// An entry shows only once its page exists, so the shell never links to a 404. The step that
// builds a page sets `available: true` here in the same PR; this registry is the one part of
// the shell other steps edit (docs/engineering-conventions.md, "Extension points").

export type Section = {
  /** Message key under shell.nav. */
  key: 'prompts' | 'templates' | 'collections';
  href: (locale: string) => string;
  available: boolean;
};

export const headerSections: readonly Section[] = [
  { key: 'prompts', href: paths.prompts, available: true }, // step 3a
  { key: 'templates', href: paths.templates, available: false }, // step 3c
  { key: 'collections', href: (locale) => `/${locale}/collections/`, available: false }, // step 3e: paths.collections
];

/**
 * Pages that content links to but that are not header sections: breadcrumbs and taxonomy links
 * point at them only once they exist. The step that builds them sets the flag in its PR.
 */
export const linkedPages = {
  /** Category, style and use-case topic pages (§9.1). */
  topics: false, // step 3e
} as const;
