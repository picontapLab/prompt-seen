import type { PromptDetail, TemplateDetail } from '../../src/modules/content/types';
import { popularUseCases, searchDocuments, suggestTerms } from '../../src/modules/search/documents';
import { createIndex } from '../../src/modules/search/engine';
import { searchIndexFile } from '../../src/modules/search/files';
import { SEARCH_KINDS, type SearchIndexFile, type SearchKind } from '../../src/modules/search/types';
import { pageSections } from '../../src/ui/navigation/sections';
import { defineEmitter } from './_types';

// Search (design doc §13): one MiniSearch index per built locale with the documents of that
// locale only, the popular use cases for the empty panel and the terms offered when nothing is
// found. The Worker loads a locale's file when search is first used (§13.3), never with a page.
// Production builds contain published versions only; preview builds also drafts, like their pages.

export default defineEmitter({
  name: 'search',
  description: 'public/generated/{locale}/search/index.json: per-locale search index',
  run({ config, locales, content, write }) {
    const details = new Map(content.details.map((d) => [`${d.locale}/${d.kind}/${d.key}`, d.model]));
    const sections = pageSections();
    for (const locale of locales) {
      const index = content.locales.get(locale.code);
      if (!index) continue;
      const documents = searchDocuments({
        index,
        prompt: (id) => (details.get(`${locale.code}/prompt/${id}`) as PromptDetail | undefined) ?? null,
        template: (id) => (details.get(`${locale.code}/template/${id}`) as TemplateDetail | undefined) ?? null,
        pages: { collections: sections.collections, topics: sections.topics },
      });
      const counts = Object.fromEntries(
        SEARCH_KINDS.map((k) => [k, documents.filter((d) => d.kind === k).length]),
      ) as Record<SearchKind, number>;
      const file: SearchIndexFile = {
        buildId: config.buildId,
        locale: locale.code,
        counts,
        popular: popularUseCases(index),
        terms: suggestTerms(index),
        index: createIndex(documents, locale.code).toJSON(),
      };
      write('public', searchIndexFile(locale.code), `${JSON.stringify(file)}\n`);
    }
  },
});
