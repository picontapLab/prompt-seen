import '@/styles/global.css';
import '@/styles/fonts';
import type { LocaleEntry } from '@/config';
import type { Messages } from '@/i18n/catalog';
import { PREFERENCES_KEY } from '@/state/preferences/store';
import { themeInitScript } from '@/state/preferences/theme';
import { ThemeProvider } from '@/state/preferences/theme-provider';
import { PrimitivesProvider } from '@/ui/primitives/PrimitivesProvider';
import { InlineScript } from './InlineScript';
import { IntlProvider } from './IntlProvider';

/**
 * The document for every page (design doc §8.6, §11.6.3): <html lang dir>, global styles and
 * fonts, the first-paint theme script, and the client context every page shares.
 *
 * suppressHydrationWarning on <html> covers that element's own attributes only, not its
 * children: the first-paint script may add data-theme there before React hydrates, and React
 * does not render that attribute. The only other exemption is the script element's own type
 * (InlineScript). Nothing else on the page is exempt from hydration checks.
 */
export function RootDocument({
  locale,
  messages,
  children,
}: {
  locale: LocaleEntry;
  /** Client message namespaces (CLIENT_COMMON_NAMESPACES) of this locale. */
  messages: Messages;
  children: React.ReactNode;
}) {
  return (
    <html lang={locale.htmlLang} dir={locale.direction} suppressHydrationWarning>
      {/* App Router layouts render <head> directly; next/head is a Pages Router API. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <InlineScript html={themeInitScript(PREFERENCES_KEY)} />
      </head>
      <body>
        <IntlProvider locale={locale.code} messages={messages}>
          <ThemeProvider>
            <PrimitivesProvider locale={locale.htmlLang}>{children}</PrimitivesProvider>
          </ThemeProvider>
        </IntlProvider>
      </body>
    </html>
  );
}
