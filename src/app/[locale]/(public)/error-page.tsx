import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { localeByPrefix } from '@/config';
import { localeIndex, manifest } from '@/modules/content';
import type { GoneReason as Reason } from '@/modules/content/types';
import { EMPTY_QUERY, formatQuery } from '@/modules/feed/query';
import { paths, withBasePath } from '@/modules/url';
import { GoneReason } from '@/ui/pages/GoneReason';
import { WorkRows } from '@/ui/pages/PageParts';
import styles from '@/ui/pages/Pages.module.css';
import { cardsFor } from '@/ui/pages/works';

// The body of /{locale}/404/ and /{locale}/410/ (design doc §11.8.7): what happened, a search
// field, three use cases and the six newest works, so every dead end has a way on. The host
// serves these pages for any address in the locale, so every link is absolute.

const LATEST = 6;
const USE_CASES = 3;

export async function ErrorPage({ locale, kind }: { locale: string; kind: 'notFound' | 'gone' }) {
  const entry = localeByPrefix(locale)!;
  const t = await getTranslations({ locale: entry.code, namespace: 'common.errors' });
  const p = await getTranslations({ locale: entry.code, namespace: 'pages.errors' });
  const index = localeIndex(entry.code);
  const useCases = index.terms
    .filter((term) => term.kind === 'useCase' && term.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, USE_CASES);
  const latest = cardsFor(
    entry.code,
    index.prompts.slice(0, LATEST).map((x) => x.id),
  );
  const reasons: Record<string, Reason> =
    kind === 'gone'
      ? Object.fromEntries(
          manifest()
            .gone.filter((g) => g.locale === entry.code)
            .map((g) => [g.path, g.reason]),
        )
      : {};

  return (
    <div className="container" data-error={kind === 'notFound' ? '404' : '410'} data-locale={entry.code}>
      <header className={styles.errorHead}>
        <p className={styles.errorCode} aria-hidden="true">
          {kind === 'notFound' ? '404' : '410'}
        </p>
        <h1 className={styles.title}>{t(`${kind}.title`)}</h1>
        <p className={styles.lead}>{t(`${kind}.body`)}</p>
        {kind === 'gone' && (
          <GoneReason
            reasons={reasons}
            labels={{ removed: p('reasons.removed'), license: p('reasons.license'), archived: p('reasons.archived') }}
          />
        )}
        {/* A plain form: it works before hydration and on every host (§11.8.6 ?q=). */}
        <form role="search" action={withBasePath(paths.search(locale))} method="get" className={styles.searchForm}>
          <label htmlFor="error-search" className={styles.searchLabel}>
            {p('searchLabel')}
          </label>
          <div className={styles.searchRow}>
            <input id="error-search" name="q" type="search" className={styles.searchInput} enterKeyHint="search" />
            <button type="submit" className={styles.searchButton}>
              {p('searchSubmit')}
            </button>
          </div>
        </form>
      </header>

      {useCases.length > 0 && (
        <nav className={styles.section} aria-labelledby="error-uses">
          <h2 id="error-uses" className={styles.sectionTitle}>
            {p('useCases')}
          </h2>
          <ul className={styles.chips}>
            {useCases.map((term) => (
              <li key={term.id}>
                <Link
                  href={term.path ?? paths.promptsFiltered(locale, formatQuery({ ...EMPTY_QUERY, use: [term.id] }))}
                  prefetch={false}
                >
                  {term.label} <span className={styles.count}>{term.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {latest.length > 0 && (
        <section className={styles.section} aria-labelledby="error-latest">
          <h2 id="error-latest" className={styles.sectionTitle}>
            {p('latest')}
          </h2>
          <WorkRows cards={latest} locale={entry.code} label={p('latest')} />
        </section>
      )}

      <p className={styles.section}>
        <Link href={paths.home(locale)}>{t('home', { language: entry.nativeName })}</Link>
      </p>
    </div>
  );
}
