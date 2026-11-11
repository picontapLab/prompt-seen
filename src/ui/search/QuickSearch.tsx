'use client';

import { languageAttributes } from '@/ui/prompt-detail/language';

import { CornerDownLeft, History, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type Key } from 'react';
import {
  Autocomplete,
  Dialog,
  Header,
  Input,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Modal,
  ModalOverlay,
  TextField,
} from 'react-aria-components';
import type { LocaleEntry } from '@/config';
import { EMPTY_QUERY, formatQuery } from '@/modules/feed/query';
import { paths, withBasePath } from '@/modules/url';
import { IconButton } from '@/ui/primitives/Button';
import { NoResults, SearchFailure } from './NoResults';
import { panelSections, type PanelItem } from './panel-sections';
import styles from './QuickSearch.module.css';
import { clearRecentSearches, recentSearches, rememberSearch } from './recent';
import { ResultRow } from './ResultRow';
import { useCommittedQuery, usePopular, useSearch } from './use-search';

/** Results per group in the panel; the search page shows all (§11.8.6). */
const PANEL_LIMIT = 5;

/**
 * The quick search panel (§11.8.6): opened from any page with the header button, `/` or ⌘K /
 * Ctrl+K. A React Aria Autocomplete keeps focus in the field while ↑ ↓ move through the results
 * (aria-activedescendant) and Enter opens one. Results are grouped (prompts, templates, then
 * collections and topics) with small thumbnails; the last item opens the search page with all of
 * them. An empty field shows this device's recent searches and the popular uses. The index loads
 * when the panel first opens (or when the pointer rests on the button), never with the page.
 */
export function QuickSearch({
  locale,
  isOpen,
  onOpenChange,
}: {
  locale: LocaleEntry;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('search');
  const [value, setValue] = useState('');
  const { query, inputProps } = useCommittedQuery(value);
  const search = useSearch(locale, query, { limit: PANEL_LIMIT, enabled: isOpen });
  const popular = usePopular(locale, isOpen);
  const [recent, setRecent] = useState(() => recentSearches(locale.code));

  const trimmed = value.trim();
  // Results of an older query stay visible until the current one is answered (§12.5).
  const results = trimmed ? search.results : null;
  const items = panelSections({
    query: trimmed,
    results,
    recent,
    popular,
    title: (section) =>
      section === 'recent' || section === 'popular' ? t(`panel.${section}`) : t(`groups.${section}`),
    popularHref: (id) => withBasePath(paths.prompts(locale.pathPrefix)) + formatQuery({ ...EMPTY_QUERY, use: [id] }),
  });

  const searchPage = withBasePath(paths.search(locale.pathPrefix, trimmed));
  const remember = () => {
    if (trimmed) rememberSearch(locale.code, trimmed);
  };
  const onAction = (key: Key) => {
    const item = items.flatMap((s) => s.items).find((i) => i.id === key);
    if (!item) return;
    if (item.type === 'recent') setValue(item.query);
    else if (item.type === 'clear') {
      clearRecentSearches(locale.code);
      setRecent([]);
    } else if (item.type === 'hit' || item.type === 'all') remember();
  };

  const status =
    search.status === 'error'
      ? null
      : trimmed && search.status === 'loading' && !results
        ? t('panel.loading')
        : results && trimmed
          ? t('count', { count: results.total })
          : '';
  const noResults = !!trimmed && search.status === 'success' && results?.total === 0;

  return (
    <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange} isDismissable className={styles.overlay}>
      <Modal className={styles.modal}>
        <Dialog aria-label={t('panel.label')} className={styles.dialog} data-quick-search="">
          {/* Nothing is chosen until ↑ ↓: results arrive after typing, so focusing "the first item"
              on input would pick from whichever list happened to be showing, and Enter would be a
              race between opening that and opening the search page. */}
          <Autocomplete inputValue={value} onInputChange={setValue} disableAutoFocusFirst>
            <div className={styles.bar}>
              <Search className={styles.icon} aria-hidden="true" />
              <TextField aria-label={t('panel.field')} className={styles.field} autoFocus>
                <Input
                  {...inputProps}
                  className={styles.input}
                  placeholder={t('panel.placeholder')}
                  enterKeyHint="search"
                  spellCheck={false}
                  autoComplete="off"
                  onKeyDown={(e) => {
                    // Enter with nothing chosen opens the search page with this query.
                    if (e.key !== 'Enter' || e.nativeEvent.isComposing || !trimmed) return;
                    if (e.currentTarget.getAttribute('aria-activedescendant')) return;
                    remember();
                    window.location.assign(searchPage);
                  }}
                />
              </TextField>
              <IconButton
                variant="ghost"
                tooltip={false}
                icon={<X aria-hidden="true" />}
                label={t('panel.close')}
                onPress={() => onOpenChange(false)}
              />
            </div>
            <div className={styles.results}>
              {search.status === 'error' && search.error ? (
                <SearchFailure error={search.error} onRetry={search.retry} />
              ) : noResults ? (
                <NoResults locale={locale} query={trimmed} help={search.help} onQuery={setValue} compact />
              ) : (
                items.length > 0 && (
                  <ListBox
                    aria-label={t('panel.label')}
                    className={styles.list}
                    onAction={onAction}
                    data-pending={search.status === 'loading' || undefined}
                  >
                    {items.map((section) => (
                      <ListBoxSection key={section.key} id={section.key} className={styles.section}>
                        {section.title && <Header className={styles.heading}>{section.title}</Header>}
                        {section.items.map((item) => (
                          <PanelEntry key={item.id} item={item} locale={locale} searchPage={searchPage} />
                        ))}
                      </ListBoxSection>
                    ))}
                  </ListBox>
                )
              )}
            </div>
          </Autocomplete>
          <footer className={styles.footer}>
            <span className={styles.keys} aria-hidden="true">
              {t('panel.keys')}
            </span>
            <a href={searchPage} className={styles.pageLink} onClick={remember}>
              {t('panel.openSearchPage')}
            </a>
          </footer>
          <p className="visually-hidden" role="status" aria-live="polite">
            {status}
          </p>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function PanelEntry({ item, locale, searchPage }: { item: PanelItem; locale: LocaleEntry; searchPage: string }) {
  const t = useTranslations('search');
  switch (item.type) {
    case 'hit':
      return (
        <ListBoxItem id={item.id} textValue={item.hit.title} href={withBasePath(item.hit.path)} className={styles.item}>
          <ResultRow hit={item.hit} locale={locale.code} />
        </ListBoxItem>
      );
    case 'all':
      return (
        <ListBoxItem
          id={item.id}
          textValue={t('panel.seeAll', { count: item.total })}
          href={searchPage}
          className={`${styles.item} ${styles.all}`}
        >
          <span>{t('panel.seeAll', { count: item.total })}</span>
          <CornerDownLeft className={styles.enter} aria-hidden="true" />
        </ListBoxItem>
      );
    case 'recent':
      return (
        <ListBoxItem id={item.id} textValue={item.query} className={`${styles.item} ${styles.plain}`}>
          <History aria-hidden="true" />
          <span>{item.query}</span>
        </ListBoxItem>
      );
    case 'clear':
      return (
        <ListBoxItem
          id={item.id}
          textValue={t('panel.clearRecent')}
          className={`${styles.item} ${styles.plain} ${styles.quiet}`}
        >
          <span>{t('panel.clearRecent')}</span>
        </ListBoxItem>
      );
    case 'popular':
      return (
        <ListBoxItem id={item.id} textValue={item.label} href={item.href} className={`${styles.item} ${styles.plain}`}>
          <span {...languageAttributes(item.labelLocale)}>{item.label}</span>
        </ListBoxItem>
      );
  }
}
