import { CircleCheck, CircleDashed } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { ExampleRunView, PromptDetail } from '@/modules/content/types';
import { imageUrl } from '@/modules/media';
import { GifBadge } from '@/ui/media/GifBadge';
import { IsolatedMessage } from '@/ui/rich-text/IsolatedMessage';
import { languageAttributes, languageName } from './language';
import styles from './Detail.module.css';

/** "2026-10-10" as a date at midnight UTC, the time zone every page formats in (§11.9). */
export const isoDate = (date: string) => new Date(`${date}T00:00:00Z`);

export const modelName = (model: { displayName: string | null; providerModelId: string | null }) =>
  model.displayName ?? model.providerModelId;

/**
 * The test record line under the summary (design doc §9.2 item 3, §9.8, §11.1.9): the tested model
 * as a badge, or "Not verified" in a neutral outlined badge; size, ratio, whether a reference
 * image is needed, and both dates, as visible text. Dates are absolute: pages are pre-rendered.
 */
export function TestInfo({ detail, run, locale }: { detail: PromptDetail; run?: ExampleRunView; locale: string }) {
  const t = useTranslations('detail.test');
  const format = useFormatter();
  const { test, cover } = detail;
  const facts = detail.facts;
  const model = modelName(test.model);
  const verified = test.verification === 'verified' && model;
  const date = (d: string) => format.dateTime(isoDate(d), { dateStyle: 'medium' });

  if (run?.outputs.length) {
    const exampleModel = modelName(facts?.model ?? run.model);
    const language = facts?.examplePrompt.language ?? run.promptLanguage;
    const assets = [
      ...run.references.map((image, i) => ({
        image,
        label: run.referenceLabels?.[i] || t('inputNumber', { n: i + 1 }),
        language: run.referenceLabelLocales?.[i],
      })),
      ...run.outputs.map((image, i) => ({ image, label: t('outputNumber', { n: i + 1 }), language: null })),
    ];
    return (
      <div className={styles.testInfo} role="group" aria-label={t('label')} data-example-run={run.id}>
        {exampleModel && (
          <span className={styles.badge} data-tone="verified">
            <CircleCheck aria-hidden="true" />
            <IsolatedMessage format={(slot) => t('generatedWith', { model: slot })} value={exampleModel} dir="ltr" />
          </span>
        )}
        <span className="tabular">
          {[
            language && t('originalLanguage', { language: languageName(language, locale) }),
            t('recorded', { date: date(run.recordedAt) }),
            t('updated', { date: date(detail.updatedAt) }),
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        <span>
          {t(`reference.${test.referenceImage}`)} · {t('referenceCount', { count: run.references.length })}
        </span>
        <ul className={styles.testAssets}>
          {assets.map(({ image, label, language }, i) => {
            const original = image.variants.original;
            const animation = image.animation;
            return (
              <li key={`${i}-${image.assetId}`}>
                {original ? (
                  <a href={imageUrl(original)} lang={language ?? undefined} target="_blank" rel="noopener">
                    {label}
                  </a>
                ) : (
                  label
                )}
                {' · '}
                <bdi dir="ltr">{t('dimensions', { width: image.width, height: image.height })}</bdi>
                {image.mimeType && (
                  <>
                    {' '}
                    · <bdi dir="ltr">{image.mimeType}</bdi>
                  </>
                )}
                <GifBadge image={image} />
                {animation && (
                  <>
                    {' '}
                    · {t('frames', { count: animation.frameCount })} ·{' '}
                    {t('seconds', { duration: animation.durationMs / 1000 })}
                    {' · '}
                    {animation.loopCount === 0
                      ? t('loop')
                      : animation.loopCount === null
                        ? t('loopUnknown')
                        : t('loopCount', { count: animation.loopCount })}
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {facts?.observation && (
          <p>
            <strong>{t('observation')}</strong> ·{' '}
            <span {...languageAttributes(detail.localization.contentLocale)}>{facts.observation}</span>
          </p>
        )}
        {facts?.limitation && (
          <p>
            <strong>{t('limitation')}</strong> ·{' '}
            <span {...languageAttributes(detail.localization.contentLocale)}>{facts.limitation}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.testInfo} aria-label={t('label')} role="group">
      <GifBadge image={cover} hasGifOutput={detail.hasGifOutput} />
      {verified ? (
        <span className={styles.badge} data-tone="verified">
          <CircleCheck aria-hidden="true" />
          <IsolatedMessage format={(slot) => t('verifiedWith', { model: slot })} value={model} dir="ltr" />
        </span>
      ) : (
        <span className={styles.badge} data-tone="unverified">
          <CircleDashed aria-hidden="true" />
          {test.recordedOutput ? t('recordedUnknownModel') : t('notVerified')}
        </span>
      )}
      {/* Facts in two short runs, so a wrapped line never starts with a separator. */}
      <span className="tabular">
        {[
          !verified && model ? <bdi dir="ltr">{model}</bdi> : null,
          <bdi dir="ltr" key="dimensions">
            {t('dimensions', { width: cover.width, height: cover.height })}
          </bdi>,
          test.aspectRatio ? <bdi dir="ltr">{test.aspectRatio}</bdi> : null,
          <bdi dir="auto" key="tested">
            {test.lastTestedAt ? t('lastTested', { date: date(test.lastTestedAt) }) : t('neverTested')}
          </bdi>,
        ]
          .filter(Boolean)
          .map((fact, index) => (
            <span key={index}>
              {index > 0 && ' · '}
              {fact}
            </span>
          ))}
      </span>
      <span className="tabular">
        {[t(`reference.${test.referenceImage}`), t('updated', { date: date(detail.updatedAt) })].join(' · ')}
      </span>
    </div>
  );
}
