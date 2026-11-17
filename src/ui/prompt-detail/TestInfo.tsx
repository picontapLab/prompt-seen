import { CircleCheck, CircleDashed } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { PromptDetail } from '@/modules/content/types';
import { GifBadge } from '@/ui/media/GifBadge';
import { IsolatedMessage } from '@/ui/rich-text/IsolatedMessage';
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
export function TestInfo({ detail }: { detail: Pick<PromptDetail, 'test' | 'cover' | 'updatedAt' | 'hasGifOutput'> }) {
  const t = useTranslations('detail.test');
  const format = useFormatter();
  const { test, cover } = detail;
  const model = modelName(test.model);
  const verified = test.verification === 'verified' && model;
  const date = (d: string) => format.dateTime(isoDate(d), { dateStyle: 'medium' });

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
