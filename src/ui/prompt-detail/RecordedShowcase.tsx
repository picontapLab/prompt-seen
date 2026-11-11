'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ExampleRunView, ImageRef } from '@/modules/content/types';
import { AnnotationProvider } from '@/ui/annotation/AnnotationProvider';
import { CopyButton } from '@/ui/feedback/CopyButton';
import { ImageStage } from './ImageStage';
import styles from './Detail.module.css';

type Run = Pick<
  ExampleRunView,
  'id' | 'outputs' | 'references' | 'referenceLabels' | 'referenceLabelLocales' | 'prompt' | 'promptLanguage'
>;

/** Keep the selected run's inputs, output and immutable prompt together. */
export function RecordedShowcase({
  runs,
  defaultId,
  cover,
  currentPrompt,
  frameNumber,
  siteName,
  preview,
}: {
  runs: readonly Run[];
  defaultId?: string;
  cover: ImageRef;
  currentPrompt: string;
  frameNumber: string;
  siteName: string;
  preview?: string;
}) {
  const t = useTranslations('detail');
  const id = useId();
  const [selected, setSelected] = useState(defaultId);
  const run = runs.find((item) => item.id === selected);
  const isDefault = selected === defaultId;
  const images = (
    isDefault ? [cover, ...(run ? run.outputs : runs.flatMap((item) => item.outputs))] : (run?.outputs ?? [cover])
  ).filter((image, index, all) => all.findIndex((item) => item.assetId === image.assetId) === index);
  const stage = (
    <ImageStage
      images={images}
      startPrint={frameNumber}
      endPrint={`${siteName.toUpperCase()} 400`}
      sizes="(min-width: 1024px) 58vw, 100vw"
      preview={isDefault ? preview : undefined}
      annotationsEnabled={isDefault}
    />
  );

  return (
    <div className={`${styles.media} ${run?.references.length ? styles.withReferences : ''}`} data-recorded-showcase="">
      {runs.length > 1 && (
        <label className={styles.runChooser}>
          <span>{t('examples.selectRun')}</span>
          <select value={selected ?? ''} onChange={(event) => setSelected(event.target.value)}>
            {!defaultId && <option value="">{t('examples.cover')}</option>}
            {runs.map((item, index) => (
              <option key={item.id} value={item.id}>
                {frameNumber}-{String.fromCharCode(65 + index)}
              </option>
            ))}
          </select>
        </label>
      )}
      <div key={selected ?? 'default'} className={run?.references.length ? styles.comparison : undefined}>
        {stage}
        {!!run?.references.length && (
          <AnnotationProvider key={selected} annotations={[]}>
            <section className={styles.referenceStage} aria-label={t('examples.references')}>
              <h2 className={styles.sectionHeading}>{t('examples.references')}</h2>
              <ImageStage
                priority={false}
                images={run.references.map((image, index) => ({
                  ...image,
                  caption: run.referenceLabels?.[index] || image.caption,
                  captionLocale: run.referenceLabels?.[index]
                    ? run.referenceLabelLocales?.[index]
                    : image.captionLocale,
                }))}
                startPrint={frameNumber}
                endPrint={t('examples.references')}
                sizes="(min-width: 1024px) 30vw, 90vw"
              />
            </section>
          </AnnotationProvider>
        )}
      </div>
      {run && run.prompt.trim() !== currentPrompt.trim() && (
        <details className={styles.runPrompt}>
          <summary>{t('examples.promptUsed')}</summary>
          <p id={`${id}-snapshot`} lang={run.promptLanguage ?? undefined} dir="auto">
            {run.prompt}
          </p>
          <CopyButton
            text={run.prompt}
            selectOnFailId={`${id}-snapshot`}
            labels={{
              copy: t('copy.label'),
              done: t('copy.done'),
              failed: t('copy.failed'),
              failedHint: t('copy.failedHint'),
            }}
          />
        </details>
      )}
    </div>
  );
}
