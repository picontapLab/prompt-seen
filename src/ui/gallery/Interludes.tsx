import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, type CSSProperties } from 'react';
import { promptJsonFile } from '@/modules/feed/files';
import type { FeedTemplate, Interlude } from '@/modules/feed/types';
import { getImage } from '@/modules/media';
import { GifBadge } from '@/ui/media/GifBadge';
import { paths, withBasePath } from '@/modules/url';
import { CopyButton } from '@/ui/feedback/CopyButton';
import { textDirection } from '@/ui/prompt-detail/language';
import { FeatureShowcase } from '@/ui/showcase/FeatureShowcase';
import styles from './Gallery.module.css';

// Editorial interludes between justified rows (design doc §11.8.2 编辑节奏): full-width articles
// of the feed that break its rhythm. They render on the server for the first page and in the
// browser for later batches, from the same data.

type Position = {
  posinset?: number;
  setsize?: number;
  locale: string;
  /** Page of the newest-first list, and a stable key (see Card). */
  page?: number;
  dataKey?: string;
};

const placement = ({ page, dataKey }: Position) => ({ 'data-feed-page': page, 'data-key': dataKey });

type Of<T extends Interlude['t']> = Extract<Interlude, { t: T }>;

/**
 * Feature row: one work large at its original ratio with its prompt quote and annotations. Works
 * wider than 2:1 or taller than 1:2 always appear here instead of in the rows (§11.1.4).
 */
export function FeatureRow({ block, posinset, setsize, locale, ...rest }: { block: Of<'feature'> } & Position) {
  const t = useTranslations('feed');
  const d = useTranslations('detail');
  const s = block.showcase;
  return (
    <article
      className={`${styles.interlude} ${styles.feature}`}
      aria-label={t('interlude.feature', { title: s.title })}
      aria-posinset={posinset}
      aria-setsize={setsize}
      {...placement({ locale, ...rest })}
      data-interlude="feature"
      data-reason={block.reason}
      data-entry={block.card.id}
    >
      <FeatureShowcase
        showcase={s}
        size="row"
        headingLevel="h2"
        sizes="(min-width: 1024px) 56vw, 100vw"
        actions={
          <>
            <CopyButton
              text={s.prompt}
              labels={{
                copy: d('copy.label'),
                done: d('copy.done'),
                failed: d('copy.failed'),
                failedHint: d('copy.failedHint'),
              }}
            />
            <a
              href={withBasePath(s.path)}
              className={styles.more}
              data-prefetch={withBasePath(paths.generated(promptJsonFile(locale, block.card.slug)))}
            >
              {t('interlude.open')}
              <ArrowRight aria-hidden="true" className={styles.arrow} />
            </a>
          </>
        }
      />
    </article>
  );
}

/**
 * Template cards (§11.8.1, §11.8.2): each template's opening with its placeholders in their
 * variable colours, so "fill in the blanks" is clear before opening it. The list's template strip
 * and the home page show the same cards.
 */
export function TemplateCards({ items }: { items: readonly FeedTemplate[] }) {
  const t = useTranslations('feed');
  return (
    <ul className={styles.templates}>
      {items.map((tpl) => (
        <li key={tpl.id}>
          <a href={withBasePath(tpl.path)} className={styles.template}>
            <span className={styles.templateTitle}>{tpl.title}</span>
            <span className={styles.templateMeta}>{t('interlude.fields', { count: tpl.fieldCount })}</span>
            <span className={styles.excerpt} lang={tpl.promptLanguage} dir={textDirection(tpl.promptLanguage)}>
              {tpl.excerpt.map((part, i) =>
                typeof part === 'string' ? (
                  part
                ) : (
                  <span
                    key={i}
                    className={styles.variable}
                    style={{ '--_v': part.c } as CSSProperties}
                    data-var={part.c}
                  >
                    {part.v}
                  </span>
                ),
              )}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Template strip: two or three templates with their opening and coloured variables (§11.8.1, §11.8.2). */
export function TemplateStrip({ block, posinset, setsize, ...rest }: { block: Of<'templates'> } & Position) {
  const t = useTranslations('feed');
  const id = useId();
  return (
    <article
      className={`${styles.interlude} ${styles.strip}`}
      aria-labelledby={id}
      aria-posinset={posinset}
      aria-setsize={setsize}
      {...placement(rest as Position)}
      data-interlude="templates"
    >
      <h2 id={id} className={styles.eyebrow}>
        {t('interlude.templates')}
      </h2>
      <TemplateCards items={block.items} />
    </article>
  );
}

/** Collection banner: cover at its original ratio, title and introduction (§11.8.2 专题横幅). */
export function CollectionBanner({ block, posinset, setsize, ...rest }: { block: Of<'collection'> } & Position) {
  const t = useTranslations('feed');
  const id = useId();
  const c = block.item;
  const img = getImage(c.cover, 'card');
  return (
    <article
      className={`${styles.interlude} ${styles.banner}`}
      aria-labelledby={id}
      aria-posinset={posinset}
      aria-setsize={setsize}
      {...placement(rest as Position)}
      data-interlude="collection"
    >
      <span
        className={styles.bannerFrame}
        style={{ '--w': c.cover.width, '--h': c.cover.height, background: img.placeholder } as CSSProperties}
      >
        <img
          src={img.src}
          srcSet={img.srcSet}
          sizes="(min-width: 768px) 40vw, 100vw"
          width={img.width}
          height={img.height}
          alt={img.alt}
          loading="lazy"
          decoding="async"
        />
      </span>
      <div className={styles.bannerText}>
        <span className={styles.eyebrow}>
          {t('interlude.collection', { count: c.itemCount })} <GifBadge image={c.cover} />
        </span>
        <h2 id={id} className={styles.bannerTitle}>
          {c.title}
        </h2>
        <p className={styles.bannerIntro}>{c.description}</p>
        <a href={withBasePath(c.path)} className={styles.more}>
          {t('interlude.openCollection')}
          <ArrowRight aria-hidden="true" className={styles.arrow} />
        </a>
      </div>
    </article>
  );
}

export function InterludeView({ block, ...position }: { block: Interlude } & Position) {
  if (block.t === 'feature') return <FeatureRow block={block} {...position} />;
  if (block.t === 'templates') return <TemplateStrip block={block} {...position} />;
  return <CollectionBanner block={block} {...position} />;
}
