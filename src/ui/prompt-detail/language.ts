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
    const name = new Intl.DisplayNames([pageLang], { type: 'language' }).of(language) ?? language;
    // CLDR versions disagree on Spanish display-name casing (inglés/Inglés). Language
    // names are lowercase in Spanish; normalize the initial so WebKit hydrates Node's HTML.
    // Preserve internal proper-name casing, and leave unknown language tags unchanged.
    return pageLang.split('-')[0]!.toLowerCase() === 'es' && name !== language
      ? name.charAt(0).toLocaleLowerCase(pageLang) + name.slice(1)
      : name;
  } catch {
    return language;
  }
}
