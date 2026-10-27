import 'server-only';
import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { config, type LocaleEntry } from '@/config';
import { ClientMessages } from '@/i18n/client-messages';
import { getDetailModel, localeIndex } from '@/modules/content';
import { feedIndex } from '@/modules/feed';
import { EMPTY_QUERY, formatQuery } from '@/modules/feed/query';
import type { FeedCard } from '@/modules/feed/types';
import { composeHome, type HomeModel } from '@/modules/home/compose';
import { getImage } from '@/modules/media';
import { paths, withBasePath } from '@/modules/url';
import { popupLocale } from '@/ui/detail-popup/logic';
import { PopupHost, PopupWorks } from '@/ui/detail-popup/PopupHost';
import { TemplateCards } from '@/ui/gallery/Interludes';
import { pageSections } from '@/ui/navigation/sections';
import { Cover, WorkRows } from '@/ui/pages/PageParts';
import pages from '@/ui/pages/Pages.module.css';
import { cardsFor } from '@/ui/pages/works';
import styles from './Home.module.css';
import { HomeHero } from './HomeHero';

// The home page of a locale (design doc §11.8.1): the first screen with a work on show, then
// use cases, the newest works, templates and collections. Rendered at build time; the works on
// show and their order come from `home.featured` in site.yaml.

/** Use cases linked from the first screen, beside the search field (§11.8.1: 3–5). */
const FIRST_SCREEN_USES = 4;

/** The home model of a locale, from the content model, the list's featured order and site.yaml. */
export function homeModel(locale: LocaleEntry): HomeModel {
  const index = localeIndex(locale.code);
  return composeHome({
    // The build date, as for the list's showcase band: works scheduled later wait.
    today: new Date().toISOString().slice(0, 10),
    prompts: index.prompts,
    promptDetail: (id) => getDetailModel('prompt', id, locale.code),
    featuredOrder: feedIndex(locale.code).featured,
    templates: index.templates,
    templateDetail: (id) => getDetailModel('template', id, locale.code),
    collections: index.collections,
    collectionsLinked: pageSections().collections,
    terms: index.terms,
    settings: config.home,
    useCaseList: (id) => paths.promptsFiltered(locale.pathPrefix, formatQuery({ ...EMPTY_QUERY, use: [id] })),
  });
}

export async function HomeBody({ locale, model }: { locale: LocaleEntry; model: HomeModel }) {
  const t = await getTranslations({ locale: locale.code, namespace: 'home' });
  const prefix = locale.pathPrefix;
  const sections = pageSections();
  const onShow = cardsFor(
    locale.code,
    model.onShow.map((s) => s.id),
  );
  const more = cardsFor(locale.code, model.more);
  const latest = cardsFor(locale.code, model.latest);
  // Previous / next in the popup follow the page: the works on show, the row under them, the newest.
  const works = [...new Map<string, FeedCard>([...onShow, ...more, ...latest].map((c) => [c.id, c])).values()];

  // Below the quote on the first screen: what the site is for, a search field and common uses.
  const footer = (
    <div className={styles.find}>
      {/* A plain form: it works before hydration and on every host (§11.8.6 ?q=). */}
      <form role="search" action={withBasePath(paths.search(prefix))} method="get" className={styles.search}>
        <label htmlFor="home-search" className="visually-hidden">
          {t('search.label')}
        </label>
        <Search aria-hidden="true" className={styles.searchIcon} />
        <input
          id="home-search"
          name="q"
          type="search"
          className={styles.searchInput}
          placeholder={t('search.placeholder', { count: model.total })}
          enterKeyHint="search"
          autoComplete="off"
        />
        <button type="submit" className={styles.searchSubmit}>
          {t('search.submit')}
        </button>
      </form>
      {model.useCases.length > 0 && (
        <nav className={styles.uses} aria-label={t('uses')}>
          <span className={styles.usesLabel}>{t('uses')}</span>
          <ul>
            {model.useCases.slice(0, FIRST_SCREEN_USES).map((u) => (
              <li key={u.id}>
                <Link href={u.href} prefetch={false}>
                  {u.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );

  return (
    <ClientMessages locale={locale.code} namespaces={['detail', 'popup', 'home', 'favorites', 'shortcuts']}>
      <PopupHost locale={popupLocale(locale)} siteName={config.siteName}>
        <PopupWorks items={works} />
        <div className={`container ${styles.home}`} data-page="home" data-locale={locale.code}>
          {model.onShow.length > 0 ? (
            <HomeHero works={model.onShow} locale={locale.code} siteName={config.siteName} footer={footer} />
          ) : (
            <section className={styles.hero} aria-labelledby="home-title">
              <h1 id="home-title" className={styles.title}>
                {t('hero.title')}
              </h1>
              {footer}
            </section>
          )}

          {more.length > 0 && (
            <section className={styles.more} aria-labelledby="home-more">
              <div className={pages.sectionHead}>
                <h2 id="home-more" className={pages.sectionTitle}>
                  {t('more.title')}
                </h2>
                {sections.prompts && (
                  <Link href={paths.prompts(prefix)} prefetch={false} className={styles.all}>
                    {t('more.all', { count: model.total })}
                    <ArrowRight aria-hidden="true" className={styles.arrow} />
                  </Link>
                )}
              </div>
              <WorkRows cards={more} locale={locale.code} label={t('more.title')} />
            </section>
          )}

          {model.useCases.length > 0 && (
            <section className={pages.section} aria-labelledby="home-uses">
              <h2 id="home-uses" className={pages.sectionTitle}>
                {t('useCases.title')}
              </h2>
              <ul className={styles.tiles}>
                {model.useCases.map((u) => {
                  const img = getImage(u.cover, 'card');
                  return (
                    <li key={u.id} style={{ '--r': u.cover.width / u.cover.height } as CSSProperties}>
                      <Link href={u.href} prefetch={false} className={styles.tile} data-use-case={u.id}>
                        <span
                          className={styles.tileFrame}
                          style={
                            {
                              '--w': u.cover.width,
                              '--h': u.cover.height,
                              background: img.placeholder,
                            } as CSSProperties
                          }
                        >
                          <img
                            src={img.src}
                            srcSet={img.srcSet}
                            sizes="(min-width: 1024px) 16vw, 40vw"
                            width={img.width}
                            height={img.height}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                        <span className={styles.tileName}>{u.label}</span>
                        <span className={pages.count}>{t('useCases.count', { count: u.count })}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {latest.length > 0 && (
            <section className={pages.section} aria-labelledby="home-latest">
              <div className={pages.sectionHead}>
                <h2 id="home-latest" className={pages.sectionTitle}>
                  {t('latest.title')}
                </h2>
                {sections.prompts && (
                  <Link href={paths.prompts(prefix)} prefetch={false} className={styles.all}>
                    {t('latest.all')}
                    <ArrowRight aria-hidden="true" className={styles.arrow} />
                  </Link>
                )}
              </div>
              <WorkRows cards={latest} locale={locale.code} label={t('latest.title')} />
            </section>
          )}

          {model.templates.length > 0 && (
            <section className={pages.section} aria-labelledby="home-templates">
              <div className={pages.sectionHead}>
                <h2 id="home-templates" className={pages.sectionTitle}>
                  {t('templates.title')}
                </h2>
                {sections.templates && (
                  <Link href={paths.templates(prefix)} prefetch={false} className={styles.all}>
                    {t('templates.all')}
                    <ArrowRight aria-hidden="true" className={styles.arrow} />
                  </Link>
                )}
              </div>
              <p className={styles.sectionIntro}>{t('templates.intro')}</p>
              <TemplateCards items={model.templates} />
            </section>
          )}

          {model.collections.length > 0 && (
            <section className={pages.section} aria-labelledby="home-collections">
              <div className={pages.sectionHead}>
                <h2 id="home-collections" className={pages.sectionTitle}>
                  {t('collections.title')}
                </h2>
                <Link href={paths.collections(prefix)} prefetch={false} className={styles.all}>
                  {t('collections.all')}
                  <ArrowRight aria-hidden="true" className={styles.arrow} />
                </Link>
              </div>
              <ul className={styles.collections}>
                {model.collections.map((c) => (
                  <li key={c.id} data-entry={c.id}>
                    <Link href={c.path} prefetch={false} className={styles.collection}>
                      <Cover image={c.cover} sizes="(min-width: 768px) 45vw, 100vw" />
                      <span className={pages.count}>{t('collections.count', { count: c.itemCount })}</span>
                      <span className={styles.collectionTitle}>{c.title}</span>
                    </Link>
                    <p className={styles.collectionIntro}>{c.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </PopupHost>
    </ClientMessages>
  );
}
