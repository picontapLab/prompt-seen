import { languageAttributes } from '@/ui/prompt-detail/language';
import type { CSSProperties, ReactNode } from 'react';
import type { ImageRef, RichBlock, TocItem } from '@/modules/content/types';
import type { FeedCard } from '@/modules/feed/types';
import { getImage } from '@/modules/media';
import { Card } from '@/ui/gallery/Card';
import { GifBadge } from '@/ui/media/GifBadge';
import gallery from '@/ui/gallery/Gallery.module.css';
import { Breadcrumb, type Crumb } from '@/ui/navigation/Breadcrumb';
import { RichText } from '@/ui/rich-text/RichText';
import styles from './Pages.module.css';
import { TableOfContents } from './TableOfContents';

// Building blocks shared by the pages of step 3e: topic, collection and content pages (design
// doc §9.1, §11.8.5). Server components without 'use client'; only the contents list hydrates.

/** A work complete at its original ratio (§10.3): the frame's height follows the image. */
export function Cover({
  image,
  sizes,
  priority,
  className,
}: {
  image: ImageRef;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const img = getImage(image, 'detail');
  return (
    <figure className={className ? `${styles.cover} ${className}` : styles.cover}>
      <span
        className={styles.coverFrame}
        style={{ '--w': img.width, '--h': img.height, background: img.placeholder } as CSSProperties}
      >
        <img
          src={img.src}
          srcSet={img.srcSet}
          sizes={sizes}
          width={img.width}
          height={img.height}
          alt={img.alt}
          lang={img.lang}
          loading={priority ? undefined : 'lazy'}
          decoding={priority ? undefined : 'async'}
          fetchPriority={priority ? 'high' : undefined}
        />
        <GifBadge image={image} overlay />
      </span>
      {image.caption && <figcaption className={styles.caption}>{image.caption}</figcaption>}
    </figure>
  );
}

/** Breadcrumb, eyebrow, display title and lead; `media` sits beside the titles on wide screens. */
export function PageHead({
  crumbs,
  crumbLabel,
  contentLocale,
  eyebrow,
  title,
  lead,
  media,
}: {
  crumbs: readonly Crumb[];
  crumbLabel: string;
  contentLocale?: string;
  eyebrow?: ReactNode;
  title: string;
  lead?: string;
  media?: ReactNode;
}) {
  return (
    <header className={styles.head} data-has-media={media ? '' : undefined}>
      <div className={styles.titles}>
        <Breadcrumb items={crumbs} label={crumbLabel} />
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 {...languageAttributes(contentLocale)} className={styles.title}>
          {title}
        </h1>
        {lead && (
          <p {...languageAttributes(contentLocale)} className={styles.lead}>
            {lead}
          </p>
        )}
      </div>
      {media}
    </header>
  );
}

/** Long-form text with the sticky contents list beside it on desktop (§11.8.5). */
export function Article({
  body,
  toc,
  tocLabel,
  contentLocale,
}: {
  body: readonly RichBlock[];
  toc: readonly TocItem[];
  tocLabel: string;
  contentLocale?: string;
}) {
  if (body.length === 0) return null;
  return (
    <div className={styles.article} data-has-toc={toc.length >= 2 ? '' : undefined}>
      <RichText locale={contentLocale} blocks={body} className={styles.body} />
      {toc.length >= 2 && (
        <aside className={styles.aside}>
          <TableOfContents contentLocale={contentLocale} items={toc} label={tocLabel} />
        </aside>
      )}
    </div>
  );
}

/** Works in the list's justified rows (§11.1.4), with the list's own cards. */
export function WorkRows({ cards, locale, label }: { cards: readonly FeedCard[]; locale: string; label: string }) {
  return (
    <ul className={`${gallery.gallery} ${styles.rows}`} aria-label={label}>
      {cards.map((card) => (
        <li
          key={card.id}
          className={gallery.cell}
          style={{ '--r': card.cover.width / card.cover.height } as CSSProperties}
        >
          <Card card={card} locale={locale} />
        </li>
      ))}
    </ul>
  );
}
