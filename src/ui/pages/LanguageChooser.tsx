'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { preferencesStore } from '@/state/preferences/store';
import { suggestLanguage } from './language-match';
import styles from './Pages.module.css';

const noChange = () => () => {};
const browserLanguages = () => (navigator.languages?.length ? navigator.languages : [navigator.language]).join(',');

export type LanguageRow = {
  code: string;
  htmlLang: string;
  dir: 'ltr' | 'rtl';
  nativeName: string;
  /** Internal path of that language's home. */
  href: string;
  /** In that language: what the site is, the suggestion badge and "Continue in …". */
  tagline: string;
  suggested: string;
  continueLabel: string;
};

/**
 * The languages of the entry page (design doc §8.2), each in its own name and words. The first
 * output is the same for every visitor; after hydration the browser's language is marked as
 * suggested and a language chosen before is offered as "Continue in …". Nothing redirects:
 * crawlers and visitors see every language. Choosing one remembers it on this device.
 */
export function LanguageChooser({ rows }: { rows: readonly LanguageRow[] }) {
  // Server and hydration snapshots are empty, so every visitor gets the same first output.
  const languages = useSyncExternalStore(noChange, browserLanguages, () => '');
  const chosen = useSyncExternalStore(
    preferencesStore.subscribe,
    () => preferencesStore.get().language,
    () => null,
  );
  const suggested = languages ? suggestLanguage(languages.split(','), rows) : null;
  const stored = rows.some((r) => r.code === chosen) ? chosen : null;

  const remember = (code: string) => preferencesStore.set({ language: code });
  const again = rows.find((r) => r.code === stored);

  return (
    <>
      {again && (
        <p className={styles.continue} lang={again.htmlLang} dir={again.dir}>
          <Link
            href={again.href}
            className={styles.primary}
            onClick={() => remember(again.code)}
            data-continue={again.code}
          >
            {again.continueLabel}
          </Link>
        </p>
      )}
      <ul className={styles.languages}>
        {rows.map((row) => (
          <li key={row.code} data-suggested={row.code === suggested ? '' : undefined} lang={row.htmlLang} dir={row.dir}>
            <Link
              href={row.href}
              hrefLang={row.htmlLang}
              className={styles.languageLink}
              onClick={() => remember(row.code)}
            >
              <span className={styles.languageName}>{row.nativeName}</span>
              <span className={styles.languageTagline}>{row.tagline}</span>
              {row.code === suggested && <span className={styles.badge}>{row.suggested}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
