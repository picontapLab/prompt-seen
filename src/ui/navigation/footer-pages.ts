import 'server-only';
import { localeIndex } from '@/modules/content';
import { linkedPages } from './sections';

const ORDER = ['about', 'license'];

/**
 * Content pages linked from the footer (§9.8, §11.8.1 页脚): about and license, in this order,
 * when the locale has them, so a missing translation never becomes a link to a 404.
 */
export function footerPages(locale: string): { path: string; title: string }[] {
  if (!linkedPages.pages) return [];
  return localeIndex(locale)
    .pages.filter((p) => ORDER.includes(p.slug))
    .sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug))
    .map((p) => ({ path: p.path, title: p.title }));
}
