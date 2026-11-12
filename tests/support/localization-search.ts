import type { LocaleIndex } from '../../src/modules/content/types';

export type LocalizationSearchCase = {
  query: string;
  expectedKeys: string[];
  excludedKeys?: string[];
  topK: number;
};

/** Report keys include the taxonomy segment for topics; all four searchable kinds retain it. */
export function searchRecord(index: LocaleIndex, key: string) {
  const [kind, id, topicId] = key.split('/');
  switch (kind) {
    case 'prompt':
      return index.prompts.find((item) => item.id === id);
    case 'template':
      return index.templates.find((item) => item.id === id);
    case 'collection':
      return index.collections.find((item) => item.id === id);
    case 'topic':
      return index.topics.find((item) => item.taxonomy === id && item.id === topicId);
    default:
      throw new Error(`Unknown search acceptance key: ${key}`);
  }
}
