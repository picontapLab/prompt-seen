import { useFormatter, useTranslations } from 'next-intl';
import { useId, type CSSProperties, type ReactNode } from 'react';
import { promptJsonFile } from '@/modules/feed/files';
import type { FeedCard } from '@/modules/feed/types';
import { getImage } from '@/modules/media';
import { paths, withBasePath } from '@/modules/url';
import { CropMarks } from '@/ui/brand/CropMarks';
import { FrameNumber } from '@/ui/brand/FrameNumber';
import { isoDate } from '@/ui/prompt-detail/TestInfo';
import styles from './Card.module.css';

export type CardProps = {
  card: FeedCard;
  /** Registry code of the page's locale, for the popup JSON the card prefetches. */
  locale: string;
  /** Position in the feed (§11.8.2 feed pattern); omit outside a feed. */
  posinset?: number;
  setsize?: number;
  /** Loaded first, not lazily: cards in the first rows of a page that has no showcase (§10.3). */
  priority?: boolean;
  /** `sizes` for the image; justified rows by default. */
  sizes?: string;
  /** Top-end corner of the frame, outside the link: the favourite button of step 4c (§11.8.2). */
  actions?: ReactNode;
  /** Shown as a favourite: actions stay visible (§11.8.2). */
  active?: boolean;
  /** Layout from the parent, e.g. a cell of the justified rows. */
  className?: string;
  /** Page of the newest-first list that holds the card, for the address of the page in view. */
  page?: number;
  /** Stable key, to hold the card in place when content is added above it. */
  dataKey?: string;
};

/** "Sample Renderer 1 · 4:5 · Oct 12": what was tested, the shape and when (§11.1 展签, §9.10.3). */
export function useCardFacts(card: FeedCard) {
  const t = useTranslations('feed.card');
  const format = useFormatter();
  return [
    card.verification === 'verified' && card.model ? card.model : t('notVerified'),
    card.ratio,
    card.lastTestedAt && format.dateTime(isoDate(card.lastTestedAt), { month: 'short', day: 'numeric' }),
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * A work in the justified rows (design doc §11.1.4, §11.8.2, §11.1.9): the image complete at
 * its original ratio in a frame of its dominant colour, and a two-line label: frame number and
 * title, then the test facts, which the opening of the prompt replaces while a fine pointer
 * rests on the card. Image and label are one link to the detail page; the favourite button sits
 * outside it. Works on the server and in the browser (the feed appends cards client-side).
 *
 * Sizing: `--w` and `--h` come from the image, so the row layout is final in the first HTML
 * (§11.1.4); see Gallery.module.css for the row rules.
 */
export function Card({
  card,
  locale,
  posinset,
  setsize,
  priority,
  sizes,
  actions,
  active,
  className,
  page,
  dataKey,
}: CardProps) {
  const id = useId();
  const facts = useCardFacts(card);
  const img = getImage(card.cover, 'card');
  const style = { '--w': card.cover.width, '--h': card.cover.height } as CSSProperties;
  const Tag = posinset ? 'article' : 'div';

  return (
    <Tag
      className={className ? `${styles.card} ${className}` : styles.card}
      style={style}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-facts`}
      aria-posinset={posinset}
      aria-setsize={setsize}
      data-entry={card.id}
      data-feed-page={page}
      data-key={dataKey}
      data-active={active || undefined}
    >
      <a
        href={withBasePath(card.path)}
        className={styles.link}
        data-crop-target=""
        data-prefetch={withBasePath(paths.generated(promptJsonFile(locale, card.slug)))}
      >
        <span className={styles.frame} style={{ background: img.placeholder }}>
          <img
            src={img.src}
            srcSet={img.srcSet}
            sizes={sizes ?? '(min-width: 1024px) 26vw, (min-width: 768px) 34vw, 50vw'}
            width={img.width}
            height={img.height}
            alt={img.alt}
            loading={priority ? undefined : 'lazy'}
            decoding={priority ? undefined : 'async'}
          />
          <CropMarks mode="interactive" size={14} offset={7} />
        </span>
        <span className={styles.label}>
          <FrameNumber n={Number(card.frameNumber)} className={styles.frameNumber} />
          <span id={`${id}-title`} className={styles.title}>
            {card.title}
          </span>
        </span>
        <span className={styles.lines}>
          <span id={`${id}-facts`} className={styles.facts}>
            {facts}
          </span>
          {/* The same opening is on the detail page; screen readers get the facts instead. */}
          <span className={styles.opening} lang={card.promptLanguage} aria-hidden="true">
            {card.promptOpening}
          </span>
        </span>
      </a>
      {actions && <div className={styles.actions}>{actions}</div>}
    </Tag>
  );
}
