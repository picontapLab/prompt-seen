import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { builtLocales, config, type LocaleEntry } from '@/config';
import { paths } from '@/modules/url';
import { Wordmark } from '@/ui/brand/Wordmark';
import { LanguageSwitch } from './LanguageSwitch';
import { MobileMenu } from './MobileMenu';
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
 * `minimal` is for pages outside a locale (language entry, unknown-address 404): no sections
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
  const homeHref = minimal ? paths.languageEntry() : paths.home(locale.pathPrefix);

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
              <div className={styles.wide}>
                <LanguageSwitch />
              </div>
            )}
            <ThemeToggle />
            {!minimal && (
              <div className={styles.narrow}>
                <MobileMenu links={sections} />
              </div>
            )}
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
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
          </div>
          <p className={styles.licence}>{t('footer.licence')}</p>
        </div>
      </footer>
    </>
  );
}
