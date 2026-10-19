'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { builtLocales, defaultLocale } from '@/config';
import { parseMissingFragment, pathInLocale } from './missing';
import styles from './Pages.module.css';

function onHashChange(notify: () => void) {
  window.addEventListener('hashchange', notify);
  return () => window.removeEventListener('hashchange', notify);
}

export type MissingLabels = {
  available: string;
  /** "Go to the {language} version", one per built locale code, already formatted. */
  goTo: Record<string, string>;
};

/**
 * The language versions of the page the visitor came from (design doc §11.8.7): read from the
 * address fragment the language menu wrote, after hydration, so the first output is the same
 * for everyone. The default language's version, when there is one, is the main way on; nothing
 * redirects by itself.
 */
export function MissingTranslation({ labels }: { labels: MissingLabels }) {
  const hash = useSyncExternalStore(
    onHashChange,
    () => location.hash,
    () => '',
  );
  const info = hash ? parseMissingFragment(hash, builtLocales) : null;

  if (!info || info.have.length === 0) return null;
  const versions = builtLocales.filter((l) => info.have.includes(l.code));
  const main = versions.find((l) => l.code === defaultLocale.code) ?? versions[0]!;
  return (
    <div className={styles.missing} data-missing-from={info.from}>
      <p>
        <Link href={pathInLocale(info.from, main.pathPrefix)} className={styles.primary} data-primary="">
          {labels.goTo[main.code]}
        </Link>
      </p>
      {versions.length > 1 && (
        <>
          <p className={styles.eyebrow}>{labels.available}</p>
          <ul className={styles.languageLinks}>
            {versions.map((l) => (
              <li key={l.code}>
                <Link
                  href={pathInLocale(info.from, l.pathPrefix)}
                  hrefLang={l.htmlLang}
                  lang={l.htmlLang}
                  dir={l.direction}
                >
                  {l.nativeName}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
