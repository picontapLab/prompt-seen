'use client';

import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type CSSProperties } from 'react';
import type { ImageRef } from '@/modules/content/types';
import { getImage, imageUrl } from '@/modules/media';
import { FilmStrip } from '@/ui/brand/FilmStrip';
import { ImageStage } from '@/ui/prompt-detail/ImageStage';
import { languageAttributes } from '@/ui/prompt-detail/language';
import { Button } from '@/ui/primitives/Button';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { IsolatedMessage } from '@/ui/rich-text/IsolatedMessage';
import { CompareFrame } from './CompareFrame';
import { stageMode } from './stage';
import styles from './TemplateStage.module.css';

/** A recorded run as the stage shows it: its result, and the inputs it was given. */
export type StageRun = {
  id: string;
  image: ImageRef;
  references: ImageRef[];
  notes?: string | null;
  notesLocale?: string | null;
};

export type TemplateStageProps = {
  /** The run on show; null when this template has no recorded run for it. */
  run: StageRun | null;
  /** Shown when there is no run: the default sample's image. */
  cover: ImageRef | null;
  /** True when the editor's values are exactly the ones that produced `run`. */
  matched: boolean;
  /** Edge print of the frame, e.g. "T076" and "T076-A" (decorative, §11.1.9). */
  startPrint: string;
  endPrint?: string;
  /** One entry per sample, in sample order; the switcher appears with two or more. */
  samples: readonly { run: StageRun | null }[];
  active: number;
  onSelect: (index: number) => void;
  /** Present while the values differ from the active sample's: loads that sample's values. */
  onUseValues?: () => void;
};

/** How wide the stage is at each breakpoint: 7 of 12 columns on desktop, the page on phones. */
const SIZES = '(min-width: 1024px) 58vw, 100vw';
const HALF_SIZES = '(min-width: 1024px) 29vw, (min-width: 480px) 50vw, 100vw';

/**
 * The example stage of a template (design doc §11.8.4 案例舞台): what the template does, shown
 * before anything is asked of the reader. A text-to-image template shows its result; an edit
 * shows the input and the result in one frame with a divider, or side by side; other inputs sit
 * beside the result. With several samples, a row of thumbnails switches between them. The line
 * under the frame says whether the image is the recorded result of the values in the form, so
 * an example is never taken for a promise about other values (§5.5).
 */
export function TemplateStage({
  run,
  cover,
  matched,
  startPrint,
  endPrint,
  samples,
  active,
  onSelect,
  onUseValues,
}: TemplateStageProps) {
  const t = useTranslations('templates.editor.stage');
  const d = useTranslations('detail');
  const [view, setView] = useState<'slider' | 'pair'>('slider');
  const image = run?.image ?? cover;
  if (!image) return null;
  const references = run?.references ?? [];
  const mode = stageMode(image, references);
  const before = references[0];
  const beforeLabel = before?.caption || t('before');

  return (
    <figure className={styles.stage} data-template-stage="" data-mode={mode} data-run={run?.id}>
      {mode === 'compare' && before && view === 'slider' && (
        <div className={styles.frame}>
          <FilmStrip startPrint={startPrint} endPrint={endPrint}>
            <CompareFrame
              key={run!.id}
              before={before}
              after={image}
              sizes={SIZES}
              labels={{
                before: t('before'),
                after: t('after'),
                slider: t('compare'),
                value: (percent) => t('compareValue', { percent }),
              }}
            />
          </FilmStrip>
        </div>
      )}
      {mode === 'compare' && before && view === 'pair' && (
        <div className={styles.pair}>
          <ImageStage
            key={before.assetId}
            images={[{ ...before, caption: beforeLabel }]}
            startPrint={startPrint}
            endPrint={t('before')}
            sizes={HALF_SIZES}
            priority={false}
            annotationsEnabled={false}
          />
          <ImageStage
            key={image.assetId}
            images={[{ ...image, caption: image.caption || t('after') }]}
            startPrint={startPrint}
            endPrint={t('after')}
            sizes={HALF_SIZES}
            annotationsEnabled={false}
          />
        </div>
      )}
      {mode === 'inputs' && (
        <div className={styles.inputs}>
          <div className={styles.references} role="group" aria-label={d('examples.references')}>
            <ImageStage
              key={references.map((r) => r.assetId).join(' ')}
              images={references}
              startPrint={startPrint}
              endPrint={d('examples.references')}
              sizes="(min-width: 1024px) 20vw, 60vw"
              priority={false}
              annotationsEnabled={false}
            />
          </div>
          <ImageStage
            key={image.assetId}
            images={[image]}
            startPrint={startPrint}
            endPrint={endPrint}
            sizes="(min-width: 1024px) 38vw, 100vw"
            annotationsEnabled={false}
          />
        </div>
      )}
      {mode === 'single' && (
        <ImageStage
          key={image.assetId}
          images={[image]}
          startPrint={startPrint}
          endPrint={endPrint}
          sizes={SIZES}
          annotationsEnabled={false}
        />
      )}

      {mode === 'compare' && before && (
        <div className={styles.tools}>
          <SegmentedControl
            label={t('view')}
            labelHidden
            segments={[
              { id: 'slider', label: t('viewSlider') },
              { id: 'pair', label: t('viewPair') },
            ]}
            value={view}
            onChange={setView}
          />
          {view === 'slider' && (
            <span className={styles.originals}>
              <Original image={before} label={beforeLabel} name={d('image.original')} />
              <Original image={image} label={t('after')} name={d('image.original')} />
            </span>
          )}
        </div>
      )}

      {samples.length > 1 && (
        <div className={styles.cases} role="group" aria-label={t('examples')}>
          {samples.map((sample, index) => {
            const thumb = sample.run && getImage(sample.run.image, 'thumbnail');
            return (
              <button
                key={index}
                type="button"
                className={styles.case}
                aria-pressed={index === active}
                aria-label={t('example', { n: index + 1, total: samples.length })}
                data-sample={index}
                data-empty={thumb ? undefined : ''}
                onClick={() => onSelect(index)}
                style={
                  sample.run && thumb
                    ? ({
                        '--w': sample.run.image.width,
                        '--h': sample.run.image.height,
                        background: thumb.placeholder,
                      } as CSSProperties)
                    : undefined
                }
              >
                {thumb && (
                  <img
                    src={thumb.src}
                    width={thumb.width}
                    height={thumb.height}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <span className={styles.caseLetter} aria-hidden="true">
                  {String.fromCharCode(65 + index)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <figcaption className={styles.caption} data-matched={matched || undefined}>
        <span>
          {matched ? d('template.testedImage') : d('template.unmatchedImage')}
          {image.generationModel && (
            <>
              {' · '}
              <IsolatedMessage
                format={(model) => d('test.generatedWith', { model })}
                value={image.generationModel}
                dir="ltr"
              />
            </>
          )}
        </span>
        {onUseValues && (
          <Button variant="ghost" onPress={onUseValues} data-action="use-sample" className={styles.use}>
            {t('useValues')}
          </Button>
        )}
      </figcaption>
      {run?.notes && (
        <p {...languageAttributes(run.notesLocale)} className={styles.notes}>
          {run.notes}
        </p>
      )}
    </figure>
  );
}

/** Link to an image's original file; the visible label says which image, the name says what opens. */
function Original({ image, label, name }: { image: ImageRef; label: string; name: string }) {
  const original = image.variants.original;
  if (!original) return null;
  return (
    <a href={imageUrl(original)} target="_blank" rel="noopener" aria-label={`${name} · ${label}`}>
      {label}
      <ArrowUpRight aria-hidden="true" />
    </a>
  );
}
