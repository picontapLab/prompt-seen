import type { PopularTerm, SearchHit, SearchResults } from '@/modules/search/types';

// What the quick search panel lists (design doc §11.8.6), as sections of a React Aria ListBox.
// Sections and items share one collection, so their keys must differ: a section whose key equals
// one of its items' points at itself, and rendering it never ends (the tab runs out of memory).
// Section keys therefore live under `section:`; item keys are `kind:id`, `all`, `recent:…`,
// `clear-recent` and `popular:…`.

export type PanelItem =
  | { id: string; type: 'hit'; hit: SearchHit }
  | { id: string; type: 'all'; total: number }
  | { id: string; type: 'recent'; query: string }
  | { id: 'clear-recent'; type: 'clear' }
  | { id: string; type: 'popular'; label: string; href: string };

export type PanelSection = { key: string; title: string; items: PanelItem[] };

export type PanelInput = {
  /** The field's text, trimmed. */
  query: string;
  /** Results to show for it (an older query's stay until the current one is answered). */
  results: SearchResults | null;
  recent: readonly string[];
  popular: readonly PopularTerm[] | null;
  /** Section titles: a group's kind, `recent` or `popular`. */
  title: (section: SearchResults['groups'][number]['kind'] | 'recent' | 'popular') => string;
  /** The list address filtered to a popular use. */
  popularHref: (id: string) => string;
};

/**
 * Result groups and the "see all" item while there is a query; recent searches and popular
 * uses while the field is empty.
 */
export function panelSections({ query, results, recent, popular, title, popularHref }: PanelInput): PanelSection[] {
  const sections: PanelSection[] = [];
  if (query && results) {
    for (const g of results.groups)
      sections.push({
        key: `section:${g.kind}`,
        title: title(g.kind),
        items: g.hits.map((hit) => ({ id: hit.id, type: 'hit', hit })),
      });
    if (results.total > 0)
      sections.push({ key: 'section:all', title: '', items: [{ id: 'all', type: 'all', total: results.total }] });
  } else if (!query) {
    if (recent.length)
      sections.push({
        key: 'section:recent',
        title: title('recent'),
        items: [
          ...recent.map((q): PanelItem => ({ id: `recent:${q}`, type: 'recent', query: q })),
          { id: 'clear-recent', type: 'clear' },
        ],
      });
    if (popular?.length)
      sections.push({
        key: 'section:popular',
        title: title('popular'),
        items: popular.map((p) => ({
          id: `popular:${p.id}`,
          type: 'popular',
          label: p.label,
          href: popularHref(p.id),
        })),
      });
  }
  return sections;
}
