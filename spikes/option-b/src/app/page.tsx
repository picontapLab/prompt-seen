import type { Metadata } from 'next';
import Link from 'next/link';
import { LOCALES, listPath } from '@/lib/site.mjs';

// Language entry at {BASE_PATH}/ (design doc §8.2), also the x-default.
export const metadata: Metadata = {
  alternates: {
    canonical: '/',
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l.htmlLang, listPath(l.prefix)])),
      'x-default': '/',
    },
  },
};

export default function LanguageEntry() {
  return (
    <main data-page="root">
      <h1>Prompt Seen</h1>
      <ul>
        {LOCALES.map((l) => (
          <li key={l.prefix}>
            <Link href={listPath(l.prefix)} hrefLang={l.htmlLang}>
              {l.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
