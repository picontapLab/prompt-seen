import type { Metadata } from 'next';
import Link from 'next/link';
import { getMessages, getTranslations } from 'next-intl/server';
import { builtLocales, defaultLocale } from '@/config';
import { pickNamespaces } from '@/i18n/catalog';
import { CLIENT_COMMON_NAMESPACES } from '@/i18n/client-messages';
import { absoluteUrl, paths } from '@/modules/url';
import { RootDocument } from '@/ui/navigation/RootDocument';
import { Shell } from '@/ui/navigation/Shell';

// Exported as 404.html: used for addresses outside any built locale. Renders a full document
// because the root layout is a pass-through (see layout.tsx).
// Next.js adds <meta name="robots" content="noindex"> to not-found output itself.
export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl('/')),
};

export default async function RootNotFound() {
  // Explicit locale, never setRequestLocale: React renders this not-found element inside every
  // page's tree, where setting the request locale would switch those pages to English.
  const t = await getTranslations({ locale: defaultLocale.code, namespace: 'common.errors' });
  const messages = pickNamespaces(await getMessages({ locale: defaultLocale.code }), CLIENT_COMMON_NAMESPACES);
  return (
    <RootDocument locale={defaultLocale} messages={messages}>
      <Shell locale={defaultLocale} minimal>
        <div className="container" data-error="404" data-locale="root">
          <h1>{t('notFound.title')}</h1>
          <p>{t('notFound.body')}</p>
          <h2>{t('chooseLanguage')}</h2>
          {/* Styled by step 3e; rows tall enough for 24 px targets (WCAG 2.5.8). */}
          <ul style={{ lineHeight: 2 }}>
            {builtLocales.map((l) => (
              <li key={l.code}>
                <Link href={paths.home(l.pathPrefix)} hrefLang={l.htmlLang} lang={l.htmlLang} dir={l.direction}>
                  {l.nativeName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Shell>
    </RootDocument>
  );
}
