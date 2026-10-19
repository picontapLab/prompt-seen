import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { builtLocales, config, defaultLocale } from '@/config';
import { listEntries } from '@/modules/content';
import { feedBand } from '@/modules/feed';
import { getImage } from '@/modules/media';
import { pageMetadata } from '@/modules/seo';
import { absoluteUrl, paths } from '@/modules/url';
import { FrameNumber } from '@/ui/brand/FrameNumber';
import { LanguageChooser, type LanguageRow } from '@/ui/pages/LanguageChooser';
import styles from '@/ui/pages/Pages.module.css';
import { cardsFor } from '@/ui/pages/works';

// Language entry at the base path, also the x-default of every home page (design doc §8.2):
// what the site is, every built language in its own name and words, and a strip of recent
// works. Answers 200 and never redirects by Accept-Language or IP; the browser's language is
// only marked as a suggestion after hydration.

const STRIP = 5;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: defaultLocale.code, namespace: 'common.languageEntry' });
  const metadata = pageMetadata({
    path: paths.languageEntry(),
    locale: defaultLocale,
    title: config.siteName,
    description: t('description'),
    alternates: [],
  });
  // hreflang: every language home, and this page as the x-default (§8.2).
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      languages: {
        ...Object.fromEntries(builtLocales.map((l) => [l.htmlLang, absoluteUrl(paths.home(l.pathPrefix))])),
        'x-default': absoluteUrl(paths.languageEntry()),
      },
    },
  };
}

/** Works for the strip: the list's showcase, then the newest works that are not extreme shapes. */
function stripWorks() {
  const code = defaultLocale.code;
  const band = feedBand(code);
  const ids = [...(band ? [band.lead.id, ...band.works.map((w) => w.id)] : [])];
  for (const p of listEntries({ locale: code, kind: 'prompt' })) {
    if (ids.length >= STRIP) break;
    if (!p.cover.extreme && !ids.includes(p.id)) ids.push(p.id);
  }
  return cardsFor(code, ids.slice(0, STRIP));
}

export default async function LanguageEntry() {
  setRequestLocale(defaultLocale.code); // pages do not inherit the layout's locale
  const t = await getTranslations('common.languageEntry');
  const rows: LanguageRow[] = await Promise.all(
    builtLocales.map(async (l) => {
      const p = await getTranslations({ locale: l.code, namespace: 'pages.entry' });
      return {
        code: l.code,
        htmlLang: l.htmlLang,
        dir: l.direction,
        nativeName: l.nativeName,
        href: paths.home(l.pathPrefix),
        tagline: p('enter'),
        suggested: p('suggested'),
        continueLabel: p('continue', { language: l.nativeName }),
      };
    }),
  );
  const works = stripWorks();

  return (
    <div className="container" data-page="language-entry">
      <div className={styles.entry}>
        <div className={styles.entryText}>
          <h1 className={styles.entryTitle}>{config.siteName}</h1>
          <p className={styles.lead}>{t('description')}</p>
          <h2 className={styles.sectionTitle}>{t('title')}</h2>
          <LanguageChooser rows={rows} />
        </div>
        {works.length > 0 && (
          // A contact sheet of recent works at their own ratios (§11.1.9): decoration only, the
          // languages are the way in.
          <div className={styles.sheet} aria-hidden="true">
            {works.map((w, i) => {
              const img = getImage(w.cover, 'card');
              return (
                <figure
                  key={w.id}
                  className={styles.sheetItem}
                  style={{ '--r': w.cover.width / w.cover.height } as CSSProperties}
                >
                  <span className={styles.sheetFrame} style={{ background: w.cover.placeholder }}>
                    <img
                      src={img.src}
                      srcSet={img.srcSet}
                      sizes="(min-width: 1024px) 20vw, 40vw"
                      width={img.width}
                      height={img.height}
                      alt=""
                      loading={i < 2 ? undefined : 'lazy'}
                      decoding="async"
                    />
                  </span>
                  <figcaption>
                    <FrameNumber n={Number(w.frameNumber)} />
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
