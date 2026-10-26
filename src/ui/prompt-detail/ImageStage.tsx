'use client';

import { ArrowUpRight, RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type CSSProperties } from 'react';
import type { ImageRef } from '@/modules/content/types';
import { getImage, imageUrl } from '@/modules/media';
import { AnnotationOverlay } from '@/ui/annotation/AnnotationOverlay';
import { useAnnotations } from '@/ui/annotation/AnnotationProvider';
import { FilmStrip } from '@/ui/brand/FilmStrip';
import styles from './ImageStage.module.css';

export type ImageStageProps = {
  /** The cover first, then other results; annotations belong to the cover (§5.2). */
  images: readonly ImageRef[];
  /** Edge print beside the frame, e.g. "0098 ▸ 0098A" (decorative, §11.1.9). */
  startPrint?: string;
  endPrint?: string;
  /** `sizes` for the responsive image: how wide the stage is at each breakpoint. */
  sizes: string;
  /**
   * An already loaded, smaller file of the cover (the card's), shown under the cover until the
   * larger file paints: the detail popup opens on the thumbnail the visitor clicked and switches
   * to the sharp image once it has decoded (§11.3.2).
   */
  preview?: string;
};

/**
 * The detail image stage (design doc §11.8.3, §10.3, §11.1.9): the work on film, complete and at
 * its original ratio, no taller than the viewport allows, with the annotation boxes over the
 * cover. The cover is the page's main image: it loads first and is visible as soon as it paints
 * (no fade that waits for JavaScript, §12.3). Below: caption, size and a link to the original;
 * with several results, a strip of thumbnails switches the image.
 */
export function ImageStage({ images, startPrint, endPrint, sizes, preview }: ImageStageProps) {
  const t = useTranslations('detail.image');
  const annotations = useAnnotations();
  const [index, setIndex] = useState(0);
  // Per image: failed loads, and retries so far (a retry adds a query so the browser refetches).
  const [failed, setFailed] = useState<ReadonlySet<number>>(new Set());
  const [retries, setRetries] = useState<Record<number, number>>({});
  const image = images[index] ?? images[0]!;
  const props = getImage(image, 'detail');
  const original = image.variants.original;
  const annotated = index === 0 && !!annotations && annotations.annotations.length > 0;
  const retry = retries[index] ?? 0;

  const frame: CSSProperties & Record<`--${string}`, string | number> = {
    '--w': image.width,
    '--h': image.height,
    background: props.placeholder,
  };

  return (
    <div className={styles.stage} id={annotations?.stageId}>
      <FilmStrip startPrint={startPrint} endPrint={endPrint}>
        <div className={styles.picture} style={frame} data-annotated={annotated || undefined} data-stage-picture="">
          {preview && index === 0 && !failed.has(0) && (
            <img src={preview} alt="" aria-hidden="true" className={`${styles.image} ${styles.preview}`} />
          )}
          {!failed.has(index) ? (
            <img
              key={`${index}-${retry}`}
              src={retry ? `${props.src}?retry=${retry}` : props.src}
              srcSet={retry ? undefined : props.srcSet}
              sizes={sizes}
              width={props.width}
              height={props.height}
              alt={props.alt}
              className={styles.image}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding={index === 0 ? undefined : 'async'}
              onError={() => setFailed((f) => new Set(f).add(index))}
            />
          ) : (
            <div className={styles.failed} role="alert">
              <p>{t('failed')}</p>
              <button
                type="button"
                className={styles.retry}
                onClick={() => {
                  setRetries((r) => ({ ...r, [index]: retry + 1 }));
                  setFailed((f) => {
                    const next = new Set(f);
                    next.delete(index);
                    return next;
                  });
                }}
              >
                <RotateCw aria-hidden="true" />
                {t('retry')}
              </button>
            </div>
          )}
          {annotated && <AnnotationOverlay />}
        </div>
      </FilmStrip>

      <div className={styles.captionRow}>
        {image.caption && <span className={styles.caption}>{image.caption}</span>}
        <span className={styles.meta}>
          <span className="tabular">{t('dimensions', { width: image.width, height: image.height })}</span>
          {original && (
            <a href={imageUrl(original)} target="_blank" rel="noopener" className={styles.original}>
              {t('original')}
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}
        </span>
      </div>

      {images.length > 1 && (
        <ul className={styles.thumbs}>
          {images.map((img, i) => {
            const thumb = getImage(img, 'thumbnail');
            return (
              <li key={img.assetId} style={{ '--w': img.width, '--h': img.height } as CSSProperties}>
                <button
                  type="button"
                  aria-pressed={i === index}
                  aria-label={t('show', { n: i + 1, total: images.length })}
                  onClick={() => setIndex(i)}
                  style={{ background: thumb.placeholder }}
                >
                  <img
                    src={thumb.src}
                    width={thumb.width}
                    height={thumb.height}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
