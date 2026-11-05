import type { CSSProperties } from 'react';
import type { SearchHit } from '@/modules/search/types';
import { mediaUrl } from '@/modules/url';
import { FrameNumber } from '@/ui/brand/FrameNumber';
import { GifBadge } from '@/ui/media/GifBadge';
import { Highlight } from './Highlight';
import styles from './Search.module.css';

/**
 * One result (§11.8.6): a small thumbnail at the work's own ratio on its placeholder colour, the
 * title with matched words marked, and a line of facts, monospaced like the work labels: frame
 * number and terms. `description` adds the summary, on the search page.
 */
export function ResultRow({ hit, locale, description }: { hit: SearchHit; locale: string; description?: boolean }) {
  const thumb = hit.thumb;
  return (
    <span className={styles.row}>
      <span
        className={styles.thumb}
        style={
          thumb
            ? ({ '--ratio': `${thumb.width} / ${thumb.height}`, '--placeholder': thumb.placeholder } as CSSProperties)
            : undefined
        }
        aria-hidden="true"
      >
        {thumb && (
          <img
            src={mediaUrl(thumb.key)}
            alt=""
            width={thumb.width}
            height={thumb.height}
            loading="lazy"
            decoding="async"
          />
        )}
      </span>
      <span className={styles.text}>
        <span className={styles.title}>
          <Highlight text={hit.title} locale={locale} terms={hit.matched} />{' '}
          <GifBadge image={thumb} hasGifOutput={hit.hasGifOutput} />
        </span>
        {description && hit.description && (
          <span className={styles.description}>
            <Highlight text={hit.description} locale={locale} terms={hit.matched} />
          </span>
        )}
        {(hit.frame || hit.tags.length > 0) && (
          <span className={styles.facts}>
            {hit.frame && <FrameNumber n={Number(hit.frame)} />}
            {hit.tags.length > 0 && <span className={styles.tags}>{hit.tags.join(' · ')}</span>}
          </span>
        )}
      </span>
    </span>
  );
}
