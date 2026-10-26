import { useFormatter, useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { getImage } from '@/modules/media';
import { AnnotatedText } from '@/ui/annotation/AnnotatedText';
import { AnnotationCaption, AnnotationNotes } from '@/ui/annotation/AnnotationNotes';
import { AnnotationOverlay } from '@/ui/annotation/AnnotationOverlay';
import { AnnotationProvider } from '@/ui/annotation/AnnotationProvider';
import { FilmStrip } from '@/ui/brand/FilmStrip';
import { FrameNumber } from '@/ui/brand/FrameNumber';
import { textDirection } from '@/ui/prompt-detail/language';
import { isoDate } from '@/ui/prompt-detail/TestInfo';
import { DevelopImage } from './DevelopImage';
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
  /** Film edges above and below the image, with edge print (§11.1.9 片边): the home first screen. */
  film?: { startPrint?: string; endPrint?: string };
  /**
   * Develop the image (§11.1.9 显影): colour, blurred preview, sharp image. For the works that
   * open a page: the home first screen and the list's showcase band.
   */
  develop?: boolean;
  /** Above the quote, e.g. the home page's eyebrow and title. */
  intro?: ReactNode;
  /** Below the actions, e.g. the home page's search field and use cases. */
  footer?: ReactNode;
  /** Shown under the quote until a phrase is current: how to use the lettered phrases. */
  captionHint?: string;
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
  film,
  develop,
  intro,
  footer,
  captionHint,
}: FeatureShowcaseProps) {
  const t = useTranslations('detail');
  const format = useFormatter();
  const img = getImage(s.cover, size === 'hero' ? 'detail' : 'card');
  const Heading = headingLevel;
  const frame = { '--w': s.cover.width, '--h': s.cover.height, background: img.placeholder } as CSSProperties;
  const imgProps = {
    src: img.src,
    srcSet: img.srcSet,
    sizes: sizes ?? (size === 'hero' ? '(min-width: 1024px) 58vw, 100vw' : '(min-width: 768px) 50vw, 100vw'),
    width: img.width,
    height: img.height,
    alt: img.alt,
    loading: priority ? undefined : ('lazy' as const),
    fetchPriority: priority ? ('high' as const) : undefined,
    decoding: priority ? undefined : ('async' as const),
  };
  const picture = (
    <div className={styles.picture} style={frame}>
      {develop ? (
        <DevelopImage {...imgProps} preview={getImage(s.cover, 'thumbnail').src} />
      ) : (
        <img {...imgProps} alt={imgProps.alt} />
      )}
      <AnnotationOverlay />
    </div>
  );

  return (
    <AnnotationProvider annotations={s.annotations} defaultCurrent={defaultAnnotation}>
      <figure
        className={styles.showcase}
        data-size={size}
        data-entry={s.id}
        style={{ '--w': s.cover.width, '--h': s.cover.height } as CSSProperties}
      >
        <div
          className={styles.media}
          data-annotated={s.annotations.length > 0 || undefined}
          data-film={film ? '' : undefined}
        >
          {film ? (
            <FilmStrip startPrint={film.startPrint} endPrint={film.endPrint}>
              {picture}
            </FilmStrip>
          ) : (
            picture
          )}
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
          {intro}
          <blockquote className={styles.quote} lang={s.promptLanguage} dir={textDirection(s.promptLanguage)}>
            <AnnotatedText text={s.quote} />
            {s.truncated && '…'}
          </blockquote>
          <AnnotationCaption hint={captionHint} />
          {/* Every note stays readable text, and describes its phrase (§11.1.9). */}
          <AnnotationNotes heading={t('annotations.heading')} promptLanguage={s.promptLanguage} visuallyHidden />
          {actions && <div className={styles.actions}>{actions}</div>}
          {footer}
        </div>
      </figure>
    </AnnotationProvider>
  );
}
