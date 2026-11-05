// Search data (design doc §13): what the `search` emitter writes to
// public/generated/{locale}/search/index.json and what the Worker answers. Plain, serializable.

/** Groups in the order the panel and the search page show them (§11.8.6). */
export const SEARCH_KINDS = ['prompt', 'template', 'collection', 'topic'] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

/** A small picture beside a result: the work's thumbnail at its original ratio. */
export type SearchThumb = { key: string; width: number; height: number; placeholder: string; mimeType?: string };

/** What a result shows; stored in the index beside the terms. */
export type SearchStored = {
  hasGifOutput?: boolean;
  kind: SearchKind;
  title: string;
  description: string;
  /** Internal path of the page. */
  path: string;
  /** Four-digit frame number of a prompt (§11.1.9); null for other kinds. */
  frame: string | null;
  thumb: SearchThumb | null;
  /** Labels of the entry's terms, shown under the title. */
  tags: string[];
};

/** One indexed entry. Fields are searched in the order of §13.1: title, terms, description, body. */
export type SearchDocument = SearchStored & {
  id: string;
  /** Taxonomy labels, their aliases and labels in other languages (§13.2). */
  terms: string;
  /** Model display name and provider ID, so "gpt image" and "gpt-image-2" both match. */
  model: string;
  /** The prompt or template text; usually in the prompt's own language (§8.3). */
  body: string;
};

/** A use case suggested when the query is empty (§11.8.6 "热门用途"). */
export type PopularTerm = { id: string; label: string; count: number };

/** A taxonomy term offered when nothing is found (§11.8.6 "术语表中的相近标签"). */
export type SuggestTerm = { kind: 'category' | 'style' | 'useCase'; id: string; label: string; words: string[] };

/** public/generated/{locale}/search/index.json */
export type SearchIndexFile = {
  buildId: string;
  locale: string;
  /** Entries per kind. */
  counts: Record<SearchKind, number>;
  popular: PopularTerm[];
  terms: SuggestTerm[];
  /** MiniSearch's serialised index (`JSON.stringify(miniSearch)`), loaded with the same options. */
  index: unknown;
};

/** One result: what it shows, and the query terms it matched for highlighting. */
export type SearchHit = SearchStored & { id: string; score: number; matched: string[] };

export type SearchResults = {
  /** The query as searched (trimmed). */
  query: string;
  locale: string;
  total: number;
  groups: { kind: SearchKind; hits: SearchHit[] }[];
};

/** Suggestions when a query finds nothing (§11.8.6). */
export type NoResultHelp = {
  /** Single words of the query that find something on their own ("broader"). */
  broader: { word: string; total: number }[];
  /** Taxonomy labels close to the query. */
  terms: { label: string; total: number }[];
  /** Results of the same query in other languages, for the user to switch to. */
  otherLocales: { locale: string; total: number }[];
};

// Messages between the page and the Worker. Every request carries the build and a sequence
// number; the page applies only the answer to its latest request (§11.6.4).

export type IndexSource = { locale: string; url: string };

export type WorkerRequest =
  | { type: 'load'; seq: number; buildId: string; source: IndexSource }
  | { type: 'search'; seq: number; buildId: string; source: IndexSource; query: string; limit: number }
  | { type: 'help'; seq: number; buildId: string; source: IndexSource; others: IndexSource[]; query: string };

export type WorkerResponse =
  | { type: 'loaded'; seq: number; popular: PopularTerm[]; counts: Record<SearchKind, number> }
  | { type: 'results'; seq: number; results: SearchResults }
  | { type: 'help'; seq: number; help: NoResultHelp }
  | { type: 'error'; seq: number; error: 'network' | 'stale' | 'unknown' };
