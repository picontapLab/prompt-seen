import type { ImageRef, LocaleIndex, PromptDetail, TemplateDetail, Term } from '@/modules/content/types';
import type { PopularTerm, SearchDocument, SearchThumb, SuggestTerm } from './types';

// Build time: the search documents of one locale (design doc §13.1), from the same content model
// the pages render. Only kinds whose pages exist in this build are included, so a result never
// links to a 404 (engineering conventions, "Links point only at pages that exist").

export type DocumentSources = {
  index: LocaleIndex;
  prompt: (id: string) => PromptDetail | null;
  template: (id: string) => TemplateDetail | null;
  /** Which kinds of page exist in this build (`pageSections()`). */
  pages: { collections: boolean; topics: boolean };
};

const thumbOf = (image: ImageRef | null): SearchThumb | null => {
  const v = image?.variants.thumbnail ?? image?.variants.card;
  return image && v
    ? { key: v.key, width: v.width, height: v.height, placeholder: image.placeholder, mimeType: image.mimeType }
    : null;
};

/** Every word that finds a term: its label, its aliases and its labels in other languages. */
const termWords = (term: Term) => [term.label, ...term.aliases];

export function searchDocuments({ index, prompt, template, pages }: DocumentSources): SearchDocument[] {
  const terms = new Map(index.terms.map((t) => [`${t.kind}:${t.id}`, t]));
  const term = (kind: Term['kind'], id: string) => terms.get(`${kind}:${id}`) ?? null;
  const collect = (refs: (Term | null)[]) => {
    const found = refs.filter((t): t is Term => t !== null);
    return { tags: [...new Set(found.map((t) => t.label))], words: [...new Set(found.flatMap(termWords))].join(' \n') };
  };

  const docs: SearchDocument[] = [];

  for (const p of index.prompts) {
    const detail = prompt(p.id);
    const { tags, words } = collect([
      term('category', p.categoryId),
      ...p.styleIds.map((id) => term('style', id)),
      ...p.useCaseIds.map((id) => term('useCase', id)),
    ]);
    docs.push({
      id: `prompt:${p.id}`,
      kind: 'prompt',
      hasGifOutput: p.hasGifOutput,
      title: p.title,
      description: p.description,
      path: p.path,
      frame: p.frameNumber,
      thumb: thumbOf(p.cover),
      tags,
      terms: [p.id, p.frameNumber, words, p.hasGifOutput || p.cover.mimeType === 'image/gif' ? 'GIF' : ''].join(' \n'),
      model: [p.model.displayName, p.model.providerModelId].filter(Boolean).join(' \n'),
      body: detail?.prompt.text ?? p.promptOpening,
    });
  }

  for (const t of index.templates) {
    const detail = template(t.id);
    const { tags, words } = collect([
      ...(detail?.taxonomy.category ? [term('category', detail.taxonomy.category.id)] : []),
      ...(detail?.taxonomy.styles ?? []).map((s) => term('style', s.id)),
      ...(detail?.taxonomy.useCases ?? []).map((u) => term('useCase', u.id)),
    ]);
    docs.push({
      id: `template:${t.id}`,
      kind: 'template',
      hasGifOutput: t.hasGifOutput,
      title: t.title,
      description: t.description,
      path: t.path,
      frame: null,
      thumb: thumbOf(t.cover),
      tags,
      terms: [
        t.id,
        words,
        t.hasGifOutput || t.cover?.mimeType === 'image/gif' ? 'GIF' : '',
        ...(detail?.version.fields.map((f) => f.label) ?? []),
      ].join(' \n'),
      model: '',
      body: detail?.version.body.replace(/\{\{\s*\w+\s*\}\}/g, ' ') ?? t.bodyExcerpt,
    });
  }

  if (pages.collections)
    for (const c of index.collections)
      docs.push({
        id: `collection:${c.id}`,
        kind: 'collection',
        title: c.title,
        description: c.description,
        path: c.path,
        frame: null,
        thumb: thumbOf(c.cover),
        tags: [],
        terms: c.id,
        model: '',
        body: '',
      });

  if (pages.topics)
    for (const t of index.topics) {
      const ref = term(t.taxonomy, t.id);
      docs.push({
        id: `topic:${t.taxonomy}:${t.id}`,
        kind: 'topic',
        title: t.title,
        description: t.description,
        path: t.path,
        frame: null,
        thumb: thumbOf(t.cover),
        tags: [],
        terms: ref ? termWords(ref).join(' \n') : '',
        model: '',
        body: '',
      });
    }

  return docs;
}

/** Use cases with the most prompts, for the empty panel (§11.8.6 "热门用途"). */
export function popularUseCases(index: LocaleIndex, limit = 6): PopularTerm[] {
  return index.terms
    .filter((t) => t.kind === 'useCase' && t.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, index.locale))
    .slice(0, limit)
    .map((t) => ({ id: t.id, label: t.label, count: t.count }));
}

/** Terms with prompts, offered as close labels when a query finds nothing. */
export function suggestTerms(index: LocaleIndex): SuggestTerm[] {
  return index.terms
    .filter((t) => t.count > 0)
    .map((t) => ({ kind: t.kind, id: t.id, label: t.label, words: t.aliases }));
}
