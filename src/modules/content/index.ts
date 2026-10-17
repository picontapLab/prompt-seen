import 'server-only';
import { builtLocales } from '@/config';
import { createContentReader, defaultContentDir } from './reader';

// Content for pages (design doc §7). Server-only: pages read the content model at build time
// and pass plain data to client components. Locale arguments are registry codes ("zh-Hans");
// route params carry URL prefixes, so map them with `localeByPrefix` first.
//
//   const entry = enterLocale(params.locale);
//   const prompt = findBySlug('prompt', entry.code, params.slug);
//   const model = prompt && getDetailModel('prompt', prompt.id, entry.code);

export const { manifest, localeIndex, getEntry, listEntries, getDetailModel, findBySlug } = createContentReader(
  defaultContentDir(),
);

/**
 * `generateStaticParams` for an entry route: every visible slug in every built locale, as
 * `{ locale: prefix, slug }`. Route handlers outside the [locale] layout use it as is; pages
 * under [locale] receive one locale at a time and can filter by it.
 */
export function entryParams(kind: 'prompt' | 'template' | 'collection'): { locale: string; slug: string }[] {
  return builtLocales.flatMap((l) =>
    listEntries({ locale: l.code, kind: kind as 'prompt' }).map((e) => ({ locale: l.pathPrefix, slug: e.slug })),
  );
}

export { ContentNotBuiltError, createContentReader } from './reader';
export type * from './types';
