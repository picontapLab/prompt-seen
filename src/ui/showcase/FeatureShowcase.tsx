import { useFormatter, useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { getImage } from '@/modules/media';
import { AnnotatedText } from '@/ui/annotation/AnnotatedText';
import { AnnotationCaption, AnnotationNotes } from '@/ui/annotation/AnnotationNotes';
import { AnnotationOverlay } from '@/ui/annotation/AnnotationOverlay';
import { AnnotationProvider } from '@/ui/annotation/AnnotationProvider';
import { FrameNumber } from '@/ui/brand/FrameNumber';
import { textDirection } from '@/ui/prompt-detail/language';
import { isoDate } from '@/ui/prompt-detail/TestInfo';
import type { Showcase } from './model';
import styles from './FeatureShowcase.module.css';

export type FeatureShowcaseProps = {
  showcase: Showcase;
  /**
   * hero: the home first screen (§11.8.1), image about 55–60 % wide and up to most of the
   * viewport tall. row: a feature row or the list's showcase band (§11.8.2), shorter.
   */
  size?: 'hero' | 'row';
  /** The page's main image (LCP): loaded first, never lazily (§10.3). */
  priority?: boolean;
  /** Main and secondary actions under the quote, e.g. "Copy prompt" and "View details". */
  actions?: ReactNode;
  /** `sizes` for the image; defaults to its share of the container. */
  sizes?: string;
  /** Heading level of the title: h2 in lists, h1 when the showcase leads the page. */
  headingLevel?: 'h1' | 'h2' | 'h3';
  /** Annotation that starts out current (none by default). */
  defaultAnnotation?: string;
};

/**
 * A work on show (design doc §11.1.8, §11.1.9, §11.8.1–§11.8.2): the image complete at its
 * original ratio with the annotation boxes, its label (frame number, title, tested model and
 * date) and the opening of its prompt with lettered phrases. Pointing at, focusing or tapping a
 * phrase frames its region and shows its note in one line. Steps 3a and 4b compose it into the
 * list showcase band, feature rows and the home first screen; "develop" (§11.8.1) is theirs.
 */
export function FeatureShowcase({
  showcase: s,
  size = 'row',
  priority,
  actions,
  sizes,
  headingLevel = 'h2',
  defaultAnnotation,
}: FeatureShowcaseProps) {
  const t = useTranslations('detail');
  const format = useFormatter();
  const img = getImage(s.cover, size === 'hero' ? 'detail' : 'card');
  const Heading = headingLevel;
  const frame = { '--w': s.cover.width, '--h': s.cover.height, background: img.placeholder } as CSSProperties;

  return (
    <AnnotationProvider annotations={s.annotations} defaultCurrent={defaultAnnotation}>
      <figure
        className={styles.showcase}
        data-size={size}
        data-entry={s.id}
        style={{ '--w': s.cover.width, '--h': s.cover.height } as CSSProperties}
      >
        <div className={styles.media} data-annotated={s.annotations.length > 0 || undefined}>
          <div className={styles.picture} style={frame}>
            <img
              src={img.src}
              srcSet={img.srcSet}
              sizes={sizes ?? (size === 'hero' ? '(min-width: 1024px) 58vw, 100vw' : '(min-width: 768px) 50vw, 100vw')}
              width={img.width}
              height={img.height}
              alt={img.alt}
              loading={priority ? undefined : 'lazy'}
              fetchPriority={priority ? 'high' : undefined}
              decoding={priority ? undefined : 'async'}
            />
            <AnnotationOverlay />
          </div>
          <figcaption className={styles.label}>
            <FrameNumber n={Number(s.frameNumber)} />
            <Heading className={styles.title}>{s.title}</Heading>
            <span className={styles.facts}>
              {[
                s.model ?? t('test.notVerified'),
                s.lastTestedAt && format.dateTime(isoDate(s.lastTestedAt), { dateStyle: 'medium' }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </figcaption>
        </div>
        <div className={styles.text}>
          <blockquote className={styles.quote} lang={s.promptLanguage} dir={textDirection(s.promptLanguage)}>
            <AnnotatedText text={s.quote} />
            {s.truncated && '…'}
          </blockquote>
          <AnnotationCaption />
          {/* Every note stays readable text, and describes its phrase (§11.1.9). */}
          <AnnotationNotes heading={t('annotations.heading')} promptLanguage={s.promptLanguage} visuallyHidden />
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      </figure>
    </AnnotationProvider>
  );
}
