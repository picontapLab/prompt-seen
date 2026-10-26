import 'server-only';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { builtLocales, type LocaleEntry } from '@/config';
import { getDetailModel, listEntries } from '@/modules/content';
import type { TemplateSummary } from '@/modules/content/types';
import { templateExcerpt } from '@/modules/feed/compose';
import { getImage } from '@/modules/media';
import { collectionStructuredData, pageMetadata } from '@/modules/seo';
import { paths } from '@/modules/url';
import { ExpandableIntro } from '@/ui/gallery/ExpandableIntro';
import { FavoriteButton } from '@/ui/favorites/FavoriteButton';
import { textDirection } from '@/ui/prompt-detail/language';
import styles from './TemplateList.module.css';

const templatesOf = (code: string): TemplateSummary[] => listEntries({ locale: code, kind: 'template' });

/** Metadata of /{locale}/templates/ (§9.3): hreflang for the locales that have templates too. */
export async function templateListMetadata(locale: LocaleEntry) {
  const t = await getTranslations({ locale: locale.code, namespace: 'templates.list' });
  return pageMetadata({
    path: paths.templates(locale.pathPrefix),
    locale,
    title: t('documentTitle'),
    description: t('description'),
    alternates: builtLocales
      .filter((l) => templatesOf(l.code).length > 0)
      .map((l) => ({ locale: l.code, path: paths.templates(l.pathPrefix) })),
  });
}

/** CollectionPage with the templates as an ItemList, in the order the page shows them (§9.6). */
export async function templateListStructuredData(locale: LocaleEntry) {
  const t = await getTranslations({ locale: locale.code, namespace: 'templates.list' });
  return collectionStructuredData({
    path: paths.templates(locale.pathPrefix),
    locale,
    name: t('title'),
    description: t('description'),
    items: templatesOf(locale.code).map((x) => ({ path: x.path, name: x.title })),
  });
}

/**
 * The template list at /{locale}/templates/ (design doc §9.1, §11.8): each template with the
 * image of its default sample at its own ratio, what it is for, and the opening of its prompt
 * with every blank in its field's variable colour, so "fill in the blanks" reads before opening
 * one (§11.8.1 模板). Image and title are the card's one link (§11.7), stretched over the card.
 */
export async function TemplateList({ locale }: { locale: LocaleEntry }) {
  const t = await getTranslations({ locale: locale.code, namespace: 'templates.list' });
  const d = await getTranslations({ locale: locale.code, namespace: 'detail.template' });
  const f = await getTranslations({ locale: locale.code, namespace: 'favorites' });
  const templates = templatesOf(locale.code);

  return (
    <div className="container" data-page="template-list">
      <header className={styles.head}>
        <div className={styles.titles}>
          <h1 className={styles.title}>{t('title')}</h1>
          <ExpandableIntro text={t('intro')} more={t('introMore')} less={t('introLess')} />
        </div>
        <p className={styles.meta}>{t('count', { count: templates.length })}</p>
      </header>

      {templates.length === 0 ? (
        <p className={styles.empty}>{t('empty')}</p>
      ) : (
        <ul className={styles.list}>
          {templates.map((template) => {
            const fields = getDetailModel('template', template.id, locale.code)?.version.fields ?? [];
            const excerpt = templateExcerpt(
              template.bodyExcerpt,
              fields.map((f) => f.name),
            );
            const img = template.cover && getImage(template.cover, 'card');
            return (
              <li key={template.id}>
                <article className={styles.card} data-entry={template.id}>
                  <Link href={template.path} prefetch={false} className={styles.link}>
                    {img && (
                      <span
                        className={styles.frame}
                        style={{ '--w': img.width, '--h': img.height, background: img.placeholder } as CSSProperties}
                      >
                        <img
                          src={img.src}
                          srcSet={img.srcSet}
                          sizes="(min-width: 768px) 30vw, 90vw"
                          width={img.width}
                          height={img.height}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      </span>
                    )}
                    <h2 className={styles.cardTitle}>{template.title}</h2>
                  </Link>
                  <p className={styles.cardMeta}>
                    {[
                      d('version', { version: template.currentVersion }),
                      t('fields', { count: template.fieldCount }),
                    ].join(' · ')}
                  </p>
                  <p className={styles.description}>{template.description}</p>
                  <p
                    className={styles.excerpt}
                    lang={template.promptLanguage}
                    dir={textDirection(template.promptLanguage)}
                  >
                    {excerpt.map((part, i) =>
                      typeof part === 'string' ? (
                        part
                      ) : (
                        <span key={i} className={styles.variable} data-var={part.c}>
                          {part.v}
                        </span>
                      ),
                    )}
                  </p>
                  {/* Above the stretched link, in the card's top-end corner (§11.5, §11.8.2). */}
                  <div className={styles.actions}>
                    <FavoriteButton
                      id={template.id}
                      kind="template"
                      title={template.title}
                      labels={{ save: f('save'), saved: f('saved') }}
                    />
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
