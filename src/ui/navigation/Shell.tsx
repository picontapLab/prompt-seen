import { Heart } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { builtLocales, config, type LocaleEntry } from '@/config';
import { ClientMessages } from '@/i18n/client-messages';
import { paths } from '@/modules/url';
import { Wordmark } from '@/ui/brand/Wordmark';
import { FavoritesFeedback } from '@/ui/favorites/FavoritesFeedback';
import { FavoritesLink } from '@/ui/favorites/FavoritesLink';
import { ImageFade } from '@/ui/motion/ImageFade';
import { SearchLauncher } from '@/ui/search/SearchLauncher';
import { KeyboardShortcuts } from '@/ui/shortcuts/KeyboardShortcuts';
import { LanguageSwitch } from './LanguageSwitch';
import { MobileMenu } from './MobileMenu';
import { footerPages } from './footer-pages';
import { headerSections } from './sections';
import styles from './Shell.module.css';
import { ThemeChooser, ThemeToggle } from './ThemeSwitch';

/**
 * The page shell (§15.5.2): skip link, header, the single <main> landmark and footer.
 * `shell.header` in site.yaml picks the implementation: `default` is the darkroom header and
 * footer; `host` is for a host site that wraps these pages in its own header and footer, and
 * keeps only what this site must provide itself (language, theme) without its brand. Pages
 * render inside <main>; they never import the header, footer or brand assets themselves.
 *
 * `minimal` is for the unknown-address 404: no sections
 * and no language switch, since those pages are themselves the way into a language.
 */
export async function Shell({
  locale,
  minimal,
  children,
}: {
  locale: LocaleEntry;
  minimal?: boolean;
  children: React.ReactNode;
}) {
  const t = await getTranslations({ locale: locale.code, namespace: 'shell' });
  const host = config.shell.header === 'host';
  const sections = minimal
    ? []
    : headerSections
        .filter((s) => s.available)
        .map((s) => ({ key: s.key, href: s.href(locale.pathPrefix), label: t(`nav.${s.key}`) }));
  const f = await getTranslations({ locale: locale.code, namespace: 'favorites' });
  // Saved works (§11.5, step 4c): in the header from 1024 px, in the menu below 768 px and in
  // the footer at every width, so the header never overflows.
  const saved = minimal ? null : { key: 'favorites', href: paths.favorites(locale.pathPrefix), label: f('link') };
  const homeHref = minimal ? paths.siteRoot() : paths.home(locale.pathPrefix);
  const pages = minimal ? [] : footerPages(locale.code);

  return (
    <>
      <a href="#main" className={styles.skip}>
        {t('skipToContent')}
      </a>
      <header className={styles.header} data-shell={host ? 'host' : 'default'}>
        <div className={`container ${styles.bar}`}>
          {!host && (
            <Link href={homeHref} className={styles.home} aria-label={t('home', { siteName: config.siteName })}>
              <Wordmark siteName={config.siteName} />
            </Link>
          )}
          {sections.length > 0 && (
            <nav aria-label={t('nav.label')} className={styles.nav}>
              <ul>
                {sections.map((s) => (
                  <li key={s.key}>
                    <Link href={s.href}>{s.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div className={styles.tools}>
            {!minimal && (
              // Search on every page in a locale (§11.8.6); step 3d.
              <ClientMessages namespaces={['search']} locale={locale.code}>
                <SearchLauncher />
              </ClientMessages>
            )}
            {!minimal && (
              // Works saved on this device (§11.5), and the toasts saving shows; step 4c.
              <ClientMessages namespaces={['favorites']} locale={locale.code}>
                <FavoritesLink locale={locale.pathPrefix} />
                <FavoritesFeedback locale={locale.pathPrefix} />
              </ClientMessages>
            )}
            {!minimal && (
              <div className={styles.wide}>
                <LanguageSwitch />
              </div>
            )}
            <ThemeToggle />
            {!minimal && (
              <div className={styles.narrow}>
                <MobileMenu links={saved ? [...sections, saved] : sections} />
              </div>
            )}
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      {/* Later images fade in over their colour (§11.9 主色占位); step 6. */}
      <ImageFade />
      <footer className={styles.footer}>
        <div className={`container ${styles.footerGrid}`}>
          {!host && (
            <div className={styles.footerBrand}>
              <Wordmark siteName={config.siteName} size="sm" />
              <p>{t('footer.tagline')}</p>
            </div>
          )}
          <nav aria-labelledby="footer-languages" className={styles.footerBlock}>
            <h2 id="footer-languages" className={styles.footerLabel}>
              {t('footer.languages')}
            </h2>
            <ul className={styles.languages}>
              {builtLocales.map((l) => (
                <li key={l.code}>
                  <Link
                    href={paths.home(l.pathPrefix)}
                    hrefLang={l.htmlLang}
                    lang={l.htmlLang}
                    dir={l.direction}
                    aria-current={!minimal && l.code === locale.code ? 'page' : undefined}
                    prefetch={false}
                  >
                    {l.nativeName}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.footerBlock}>
            <h2 className={styles.footerLabel} aria-hidden="true">
              {t('footer.theme')}
            </h2>
            <ThemeChooser labelHidden />
            {saved && (
              <Link href={saved.href} prefetch={false} className={styles.footerLink} data-footer-favorites="">
                <Heart aria-hidden="true" />
                {saved.label}
              </Link>
            )}
            {!minimal && (
              // The shortcut list and its single-key switch (§11.10, WCAG 2.1.4); step 4c. Not on
              // pages outside a locale, which have no shortcuts to act on.
              <ClientMessages namespaces={['shortcuts']} locale={locale.code}>
                <KeyboardShortcuts />
              </ClientMessages>
            )}
          </div>
          {pages.length > 0 && (
            // About and license (§9.8, §11.8.1 页脚), only those this locale has; a full-width row.
            <nav aria-label={config.siteName} className={styles.footerPages}>
              <ul className={styles.languages}>
                {pages.map((p) => (
                  <li key={p.path}>
                    <Link href={p.path} prefetch={false}>
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <p className={styles.licence}>{t('footer.licence')}</p>
        </div>
      </footer>
    </>
  );
}
