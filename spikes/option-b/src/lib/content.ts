import prompts from '../../content/prompts.json';
import { toDetailModel } from './detail-model.mjs';
import { LOCALES, localeByPrefix } from './site.mjs';

export type PromptDetail = ReturnType<typeof toDetailModel>;
export type CardModel = { slug: string; title: string; hue: number; ratio: number };

export function getLocale(prefix: string) {
  const locale = localeByPrefix(prefix);
  if (!locale) throw new Error(`Unknown locale prefix ${prefix}`);
  return locale;
}

export function localeParams() {
  return LOCALES.map((l) => ({ locale: l.prefix }));
}

export function slugParams() {
  return prompts.map((p) => ({ slug: p.slug }));
}

export function getCards(prefix: string): CardModel[] {
  const locale = getLocale(prefix);
  return prompts.map((p) => ({
    slug: p.slug,
    title: p.locales[locale.code as 'en' | 'zh-Hans'].title,
    hue: p.hue,
    ratio: p.ratio,
  }));
}

export function getDetail(prefix: string, slug: string): PromptDetail {
  const item = prompts.find((p) => p.slug === slug);
  if (!item) throw new Error(`Unknown slug ${slug}`);
  return toDetailModel(item, getLocale(prefix));
}

export function allDetails() {
  return LOCALES.flatMap((l) => prompts.map((p) => toDetailModel(p, l)));
}
