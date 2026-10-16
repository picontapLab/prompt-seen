import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { builtLocales, config, defaultLocale } from '@/config';
import { absoluteUrl, paths } from '@/modules/url';

// Language entry at the base path, also the x-default (design doc §8.2). Placeholder until
// step 3e: no automatic redirect by Accept-Language or IP, ever.
export const metadata: Metadata = {
  title: config.siteName,
  alternates: {
    canonical: absoluteUrl(paths.languageEntry()),
    languages: {
      ...Object.fromEntries(builtLocales.map((l) => [l.htmlLang, absoluteUrl(paths.home(l.pathPrefix))])),
      'x-default': absoluteUrl(paths.languageEntry()),
    },
  },
};

export default async function LanguageEntry() {
  setRequestLocale(defaultLocale.code); // pages do not inherit the layout's locale
  const t = await getTranslations('common.languageEntry');
  return (
    <div className="container" data-page="language-entry">
      <h1>{config.siteName}</h1>
      <p>{t('description')}</p>
      <h2>{t('title')}</h2>
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
  );
}
