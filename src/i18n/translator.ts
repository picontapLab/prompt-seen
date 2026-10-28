import format, { type CompiledMessage } from 'icu-minify/format';
import { compileMessages, readCatalog } from './catalog';
import { formatLocale } from './format-locale';

// A message formatter outside React rendering (Node only): route handlers that write text files
// and scripts such as content:export (design doc §9.10.4). Same catalogs, ICU formatting and
// formatting locale as the pages, so a document says exactly what its page says.
//
// It formats precompiled messages with icu-minify itself rather than through use-intl: the app's
// bundles alias use-intl's formatter to the format-only one (next.config.ts) and scripts run
// unbundled, so going through use-intl would format differently in the two.

const formatters = {
  getDateTimeFormat: (...args: ConstructorParameters<typeof Intl.DateTimeFormat>) => new Intl.DateTimeFormat(...args),
  getNumberFormat: (...args: ConstructorParameters<typeof Intl.NumberFormat>) => new Intl.NumberFormat(...args),
  getPluralRules: (...args: ConstructorParameters<typeof Intl.PluralRules>) => new Intl.PluralRules(...args),
};

/** Formats `namespace.key` messages of one locale; reads every namespace of the catalog. */
export function catalogTranslator(root: string, code: string) {
  const messages = compileMessages(readCatalog(root, code));
  const locale = formatLocale(code);
  return (key: string, values?: Record<string, string | number>): string => {
    const message = key
      .split('.')
      .reduce<unknown>(
        (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
        messages,
      );
    if (typeof message !== 'string' && !Array.isArray(message)) {
      // As use-intl does: report it and show the key, so one missing message does not fail a build.
      console.error(`${code}: no message at ${key}`);
      return key;
    }
    return String(format(message as CompiledMessage, locale, values, { formatters, timeZone: 'UTC' }));
  };
}
