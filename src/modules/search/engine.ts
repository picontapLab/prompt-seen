import MiniSearch, { type Options, type SearchResult } from 'minisearch';
import { domainAliases } from './profiles';
import { cjkRuns, isCjkTerm, normalizeTerm, queryTerms, tokenize } from './tokenize';
import {
  SEARCH_KINDS,
  type NoResultHelp,
  type SearchDocument,
  type SearchHit,
  type SearchIndexFile,
  type SearchKind,
  type SearchResults,
  type SearchStored,
  type SuggestTerm,
} from './types';

// The search engine (design doc §13): MiniSearch with this project's tokeniser, shared by the
// emitter that builds the indexes and the Worker that queries them. Index and query must use the
// same options, so both come from `engineOptions`.

const FIELDS = ['title', 'terms', 'model', 'description', 'body', 'aliases'] as const;
const STORED: (keyof SearchStored)[] = [
  'kind',
  'contentLocale',
  'title',
  'description',
  'path',
  'frame',
  'thumb',
  'tags',
  'tagLocales',
  'hasGifOutput',
];

/**
 * Field weights in the order of §13.1: title, then category and use (terms), then description,
 * then the prompt text. The model name sits between: "named model" queries are specific.
 */
export const FIELD_BOOST: Record<(typeof FIELDS)[number], number> = {
  title: 4,
  terms: 2.5,
  model: 2,
  description: 1.5,
  body: 0.5,
  aliases: 0.1,
};

/** Whole-word matches rank above prefix and fuzzy ones. */
const WEIGHTS = { prefix: 0.5, fuzzy: 0.3 };

export function engineOptions(locale: string): Options<SearchDocument> {
  return {
    idField: 'id',
    fields: [...FIELDS],
    storeFields: STORED,
    tokenize: (text) => tokenize(text, locale),
    // Terms are already normalised by the tokeniser.
    processTerm: (term) => term,
    searchOptions: {
      tokenize: (text) => queryTerms(text, locale),
      processTerm: (term) => term,
      boost: FIELD_BOOST,
      weights: WEIGHTS,
      combineWith: 'AND',
      // The word being typed is unfinished: it matches as a prefix (search as you type).
      prefix: (_term, i, terms) => i === terms.length - 1,
      // Typing slips in longer alphabetic words; never for CJK pairs, where one character changes the word.
      fuzzy: (term) => (!isCjkTerm(term) && term.length >= 5 ? 0.2 : false),
    },
  };
}

export type Engine = { locale: string; mini: MiniSearch<SearchDocument>; file: SearchIndexFile };

/** Build time: an index of the documents of one locale. */
export function createIndex(documents: readonly SearchDocument[], locale: string): MiniSearch<SearchDocument> {
  const mini = new MiniSearch<SearchDocument>(engineOptions(locale));
  mini.addAll(
    documents.map((document) => ({
      ...document,
      aliases: domainAliases(
        [document.title, document.terms, document.description, document.body].join(' '),
        locale,
        document.kind,
      ),
    })),
  );
  return mini;
}

/** Browser: an engine from a loaded index file. */
export function loadEngine(file: SearchIndexFile): Engine {
  const mini = MiniSearch.loadJS<SearchDocument>(
    file.index as Parameters<typeof MiniSearch.loadJS>[0],
    engineOptions(file.locale),
  );
  return { locale: file.locale, mini, file };
}

function run(engine: Engine, query: string): SearchResult[] {
  return engine.mini.search(query);
}

/**
 * Terms to highlight in a hit: the document words matched (whole words, also when matched by
 * prefix or typo), and for CJK the query's own runs and pairs, so typing 墨 marks 墨 and not the
 * pair 墨梅 it matched as a prefix. The highlighter prefers a whole run (ポスター) and falls back
 * to its pairs only where the run does not occur as such.
 */
const highlightTerms = (r: SearchResult, runs: readonly string[]) => [
  ...new Set([...r.terms.filter((t) => !isCjkTerm(t)), ...runs, ...r.queryTerms.filter(isCjkTerm)]),
];

/** Results of a query, grouped by kind in panel order, each group at most `limit` long. */
export function search(engine: Engine, query: string, limit = Infinity): SearchResults {
  const q = query.trim();
  const hits = q ? run(engine, q) : [];
  const runs = cjkRuns(q, engine.locale);
  const groups = new Map<SearchKind, SearchHit[]>(SEARCH_KINDS.map((k) => [k, []]));
  for (const r of hits) {
    const group = groups.get(r.kind as SearchKind);
    if (!group || group.length >= limit) continue;
    group.push({
      id: String(r.id),
      score: r.score,
      matched: highlightTerms(r, runs),
      kind: r.kind as SearchKind,
      contentLocale: r.contentLocale as string,
      title: r.title as string,
      description: r.description as string,
      path: r.path as string,
      frame: (r.frame as string | null) ?? null,
      thumb: (r.thumb as SearchStored['thumb']) ?? null,
      tags: (r.tags as string[]) ?? [],
      tagLocales: r.tagLocales as SearchStored['tagLocales'],
      hasGifOutput: r.hasGifOutput === true,
    });
  }
  return {
    query: q,
    locale: engine.locale,
    total: hits.length,
    groups: SEARCH_KINDS.map((kind) => ({ kind, hits: groups.get(kind)! })).filter((g) => g.hits.length > 0),
  };
}

export const countHits = (engine: Engine, query: string) => (query.trim() ? run(engine, query.trim()).length : 0);

/** Edit distance, for "did you mean" labels; inputs are a few characters long. */
function distance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const row = [i];
    for (let j = 1; j <= y.length; j++)
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[y.length]!;
}

/** Terms whose label or alias is close to the query: shares a prefix, contains it, or is one or two edits away. */
function closeTerms(terms: readonly SuggestTerm[], query: string, locale: string): SuggestTerm[] {
  const q = normalizeTerm(query.trim(), locale);
  if (!q) return [];
  const scored: { term: SuggestTerm; d: number }[] = [];
  for (const term of terms) {
    let best = Infinity;
    for (const word of [term.label, ...term.words]) {
      const w = normalizeTerm(word, locale);
      if (!w) continue;
      if (w === q) best = Math.min(best, 0);
      else if (w.startsWith(q) || q.startsWith(w) || w.includes(q)) best = Math.min(best, 1);
      else if ([...q].length >= 4) {
        const d = distance(w, q);
        if (d <= ([...q].length >= 7 ? 2 : 1)) best = Math.min(best, 1 + d);
      }
    }
    if (best < Infinity) scored.push({ term, d: best });
  }
  return scored.sort((a, b) => a.d - b.d).map((s) => s.term);
}

/** Help for a query that found nothing (§11.8.6): broader words, close labels, other languages. */
export function noResultHelp(engine: Engine, others: readonly Engine[], query: string): NoResultHelp {
  const q = query.trim();
  const words = [...new Set(q.split(/\s+/).filter(Boolean))];
  const broader =
    words.length > 1 ? words.map((word) => ({ word, total: countHits(engine, word) })).filter((w) => w.total > 0) : [];
  const terms = closeTerms(engine.file.terms, q, engine.locale)
    .map((t) => ({ label: t.label, labelLocale: t.labelLocale, total: countHits(engine, t.label) }))
    .filter((t) => t.total > 0 && normalizeTerm(t.label, engine.locale) !== normalizeTerm(q, engine.locale))
    .slice(0, 3);
  const otherLocales = others.map((e) => ({ locale: e.locale, total: countHits(e, q) })).filter((o) => o.total > 0);
  return { broader, terms, otherLocales };
}
