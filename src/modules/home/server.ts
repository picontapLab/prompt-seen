import 'server-only';
import { config, type LocaleEntry } from '@/config';
import { getDetailModel, localeIndex } from '@/modules/content';
import { feedIndex } from '@/modules/feed';
import { EMPTY_QUERY, formatQuery } from '@/modules/feed/query';
import { paths } from '@/modules/url';
import { pageSections } from '@/ui/navigation/sections';
import { composeHome, type HomeModel } from './compose';

/** The home model of a locale, from the content model, the list's featured order and site.yaml. */
export function homeModel(locale: LocaleEntry): HomeModel {
  const index = localeIndex(locale.code);
  return composeHome({
    locale: locale.code,
    // The build date, as for the list's showcase band: works scheduled later wait.
    today: new Date().toISOString().slice(0, 10),
    prompts: index.prompts,
    promptDetail: (id) => getDetailModel('prompt', id, locale.code),
    featuredOrder: feedIndex(locale.code).featured,
    templates: index.templates,
    templateDetail: (id) => getDetailModel('template', id, locale.code),
    collections: index.collections,
    collectionsLinked: pageSections().collections,
    terms: index.terms,
    settings: config.home,
    useCaseList: (id) => paths.promptsFiltered(locale.pathPrefix, formatQuery({ ...EMPTY_QUERY, use: [id] })),
  });
}

/** Index only the actual home selection; unrelated library fallback does not disqualify it. */
export function homeIndexable(locale: LocaleEntry): boolean {
  if (!locale.enabled || config.buildMode !== 'production') return false;
  const model = homeModel(locale);
  const index = localeIndex(locale.code);
  const ids = new Set([
    ...model.onShow.map((work) => work.id),
    ...model.more,
    ...model.latest,
    ...model.useCases.map((use) => use.work),
  ]);
  return (
    index.prompts.filter((prompt) => ids.has(prompt.id)).every((prompt) => prompt.localization.indexable) &&
    model.templates.every((template) => template.localization.indexable) &&
    model.collections.every((collection) => collection.localization.indexable)
  );
}
