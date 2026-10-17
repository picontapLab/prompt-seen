import { createTranslator } from 'next-intl';
import { readCatalog } from './catalog';
import { formatLocale } from './format-locale';

// A message formatter outside React rendering (Node only): route handlers that write text files
// and scripts such as content:export (design doc §9.10.4). Same catalogs, ICU formatting and
// formatting locale as the pages, so a document says exactly what its page says.

/** Formats `namespace.key` messages of one locale; reads every namespace of the catalog. */
export function catalogTranslator(root: string, code: string) {
  const t = createTranslator({ locale: formatLocale(code), messages: readCatalog(root, code), timeZone: 'UTC' });
  return (key: string, values?: Record<string, string | number>): string =>
    (t as unknown as (k: string, v?: Record<string, string | number>) => string)(key, values);
}
