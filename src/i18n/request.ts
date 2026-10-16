import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, localeByCode } from '@/config';
import { readCatalog } from './catalog';

// next-intl is used for ICU message formatting only (§11.11). Routing, locale prefixes and
// hreflang come from the locale registry and the url module, not next-intl's middleware,
// which static export cannot run. Layouts call setRequestLocale() with the registry code.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = (requested && localeByCode(requested)?.code) || defaultLocale.code;
  return {
    locale,
    messages: readCatalog(process.cwd(), locale),
    // Pages are pre-rendered: dates are absolute and must not depend on the build machine (§11.9).
    timeZone: 'UTC',
  };
});
