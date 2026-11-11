'use client';

import { languageAttributes } from '@/ui/prompt-detail/language';

import { useLocale, useTranslations } from 'next-intl';
import { localeByCode, type LocaleEntry } from '@/config';
import type { NoResultHelp } from '@/modules/search/types';
import { paths, withBasePath } from '@/modules/url';
import { Button } from '@/ui/primitives/Button';
import type { SearchError } from './use-search';
import styles from './NoResults.module.css';

/** The interface language's name for a locale, e.g. "英语" for en in Chinese (§11.8.6). */
function languageName(uiLocale: string, code: string): string {
  try {
    return new Intl.DisplayNames([uiLocale], { type: 'language' }).of(code) ?? code;
  } catch {
    return localeByCode(code)?.nativeName ?? code;
  }
}

/**
 * Nothing found (§11.8.6): says so with the query, keeps it in the field, and offers ways on:
 * fewer words, close labels from the terms, and the number of results in other languages'
 * content, which the visitor opens deliberately; results from another language are never mixed
 * in. A link to the whole list is always there (§11.8.7: an empty state gives a next step).
 */
export function NoResults({
  locale,
  query,
  help,
  onQuery,
  compact,
}: {
  locale: LocaleEntry;
  query: string;
  help: NoResultHelp | null;
  onQuery: (query: string) => void;
  compact?: boolean;
}) {
  const t = useTranslations('search.noResults');
  const ui = useLocale();
  const Title = compact ? 'p' : 'h2';
  return (
    <div className={compact ? `${styles.help} ${styles.compact}` : styles.help} data-no-results="">
      <Title className={styles.title}>{t('title', { query })}</Title>
      {help && help.broader.length > 0 && (
        <Suggestions label={t('broader')}>
          {help.broader.map((b) => (
            <li key={b.word}>
              <button type="button" className={styles.suggestion} onClick={() => onQuery(b.word)}>
                {t('suggestion', { label: b.word, count: b.total })}
              </button>
            </li>
          ))}
        </Suggestions>
      )}
      {help && help.terms.length > 0 && (
        <Suggestions label={t('terms')}>
          {help.terms.map((term) => (
            <li key={term.label}>
              <button type="button" className={styles.suggestion} onClick={() => onQuery(term.label)}>
                <span {...languageAttributes(term.labelLocale)}>
                  {t('suggestion', { label: term.label, count: term.total })}
                </span>
              </button>
            </li>
          ))}
        </Suggestions>
      )}
      {help && help.otherLocales.length > 0 && (
        <Suggestions label={t('otherLocales')}>
          {help.otherLocales.map((o) => {
            const target = localeByCode(o.locale);
            if (!target) return null;
            return (
              <li key={o.locale}>
                <a
                  className={styles.suggestion}
                  href={withBasePath(paths.search(target.pathPrefix, query))}
                  hrefLang={target.htmlLang}
                >
                  {t('otherLocale', { count: o.total, language: languageName(ui, target.htmlLang) })}
                </a>
              </li>
            );
          })}
        </Suggestions>
      )}
      <p className={styles.browse}>
        <a href={withBasePath(paths.prompts(locale.pathPrefix))}>{t('browse')}</a>
      </p>
    </div>
  );
}

function Suggestions({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.group}>
      <p className={styles.label}>{label}</p>
      <ul className={styles.list}>{children}</ul>
    </div>
  );
}

/** The index could not load (§13.3): retry, or reload when the site was updated meanwhile. */
export function SearchFailure({ error, onRetry }: { error: SearchError; onRetry: () => void }) {
  const t = useTranslations('search.error');
  const stale = error === 'stale';
  return (
    <div className={styles.failure} role="alert">
      <p>{stale ? t('stale') : t('body')}</p>
      <Button variant="secondary" onPress={stale ? () => window.location.reload() : onRetry}>
        {stale ? t('reload') : t('retry')}
      </Button>
    </div>
  );
}
