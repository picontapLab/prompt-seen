import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, localeByCode } from '@/config';
import { compileMessages, readCatalog } from './catalog';
import { formatLocale } from './format-locale';

// next-intl is used for ICU message formatting only (§11.11). Routing, locale prefixes and
// hreflang come from the locale registry and the url module, not next-intl's middleware,
// which static export cannot run. Layouts call setRequestLocale() with the registry code.
export default getRequestConfig(async ({ locale: explicit, requestLocale }) => {
  // An explicit locale (getMessages({ locale }) in not-found and shared components) must not
  // read the request locale: outside setRequestLocale that falls back to headers(), which static
  // export forbids.
  const requested = explicit ?? (await requestLocale);
  const locale = (requested && localeByCode(requested)?.code) || defaultLocale.code;
  return {
    // Formatting tag with a fixed numbering system; messages are looked up by registry code.
    locale: formatLocale(locale),
    // Precompiled (catalog.ts): server components, client islands and the browser all use
    // use-intl's format-only formatter (next.config.ts).
    messages: compileMessages(readCatalog(process.cwd(), locale)),
    // Pages are pre-rendered: dates are absolute and must not depend on the build machine (§11.9).
    timeZone: 'UTC',
  };
});
