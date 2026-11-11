import { config } from '@/config';

const RTL = new Set(['ar', 'fa', 'he', 'ur']);

export const languageAttributes = (locale?: string | null) =>
  locale
    ? { lang: config.locales.find((entry) => entry.code === locale)?.htmlLang ?? locale, dir: textDirection(locale) }
    : {};

/** Writing direction of a language tag, for text in a language other than the page's (§8.6). */
export const textDirection = (lang: string): 'rtl' | 'ltr' =>
  config.locales.find((locale) => locale.code === lang)?.direction ?? (RTL.has(lang.split('-')[0]!) ? 'rtl' : 'ltr');

/** The name of a prompt's language in the page language, e.g. "English" or "英语" (§11.8.3). */
export function languageName(language: string, pageLang: string): string {
  try {
    return new Intl.DisplayNames([pageLang], { type: 'language' }).of(language) ?? language;
  } catch {
    return language;
  }
}
