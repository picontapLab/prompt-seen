'use client';

import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { config, localeByCode } from '@/config';
import { registryCode } from '@/i18n/format-locale';
import { preloadIndex } from '@/modules/search/client';
import { paths, withBasePath } from '@/modules/url';
import { preferencesStore } from '@/state/preferences/store';
import { isEditable } from '@/ui/shortcuts/keys';
import buttonStyles from '@/ui/primitives/Button.module.css';
import { focusPageSearch } from './page-focus';
import styles from './SearchLauncher.module.css';
import { indexSource } from './use-search';

const load = () => import('./QuickSearch');
const QuickSearch = lazy(() => load().then((m) => ({ default: m.QuickSearch })));

const noSubscription = () => () => {};
/** The platform's modifier for the tooltip; the server and hydration use Ctrl+K. */
const modifierKey = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl+K');

/**
 * The header's way into search (§11.8.6, §11.10). Before hydration and without JavaScript it is
 * a plain link to the search page (§3.4); afterwards a primary click opens the quick panel, and
 * `/` (outside text fields, and only while single-key shortcuts are on) or ⌘K / Ctrl+K open it
 * from anywhere. On the search page the same keys move focus to that page's field instead. The
 * panel's code and the index load on intent: resting the pointer on the button, or opening it.
 */
export function SearchLauncher() {
  const t = useTranslations('search');
  const locale = localeByCode(registryCode(useLocale()))!;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modKey = useSyncExternalStore(noSubscription, modifierKey, () => 'Ctrl+K');

  const show = () => {
    if (focusPageSearch()) return;
    setMounted(true);
    setOpen(true);
  };

  useEffect(() => {
    // The panel's code (not the index) loads once the page is idle, so `/` followed at once by
    // typing reaches a ready field; it is not part of the first load (§16.4).
    const idle = window.requestIdleCallback?.(() => void load(), { timeout: 5000 }) ?? window.setTimeout(load, 3000);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  useEffect(() => {
    // Only state setters and module functions: the listener never goes stale.
    const openSearch = () => {
      if (focusPageSearch()) return;
      setMounted(true);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.keyCode === 229 || e.repeat) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      } else if (
        e.key === '/' &&
        !mod &&
        !e.altKey &&
        !isEditable(e.target) &&
        preferencesStore.get().singleKeyShortcuts
      ) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <a
        href={withBasePath(paths.search(locale.pathPrefix))}
        className={`${buttonStyles.button} ${buttonStyles.ghost} ${buttonStyles.link} ${styles.launcher}`}
        aria-keyshortcuts="/ Control+K Meta+K"
        title={t('tooltip', { key: `/ · ${modKey}` })}
        data-search-launcher=""
        onPointerEnter={() => {
          void load();
          preloadIndex(config.buildId, indexSource(locale));
        }}
        onFocus={() => void load()}
        onClick={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          show();
        }}
      >
        <span className={buttonStyles.content}>
          <Search aria-hidden="true" />
          <span className={styles.label}>{t('open')}</span>
          <kbd className={styles.key} aria-hidden="true">
            /
          </kbd>
        </span>
      </a>
      {mounted && (
        <Suspense>
          <QuickSearch locale={locale} isOpen={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
