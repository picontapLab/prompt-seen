import { ArrowUpRight } from 'lucide-react';
import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { InspirationSource } from '@/modules/content/types';
import styles from './Detail.module.css';

export function InspirationSources({
  sources,
  independentlyAdapted = false,
}: {
  sources: InspirationSource[];
  independentlyAdapted?: boolean;
}) {
  const t = useTranslations('detail.inspiration');
  const locale = useLocale();
  const id = useId();
  if (!sources.length) return null;
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionHeading}>
        {t('heading')}
      </h2>
      {independentlyAdapted && <p>{t('adaptation')}</p>}
      {sources.map((source) => (
        <dl className={styles.facts} key={source.candidateId}>
          <div>
            <dt>{t('original')}</dt>
            <dd className="tabular">
              <a className={styles.external} href={source.url}>
                {source.platform}
                {source.author ? ` · ${source.author}` : ''}
                <ArrowUpRight aria-hidden="true" />
              </a>
              {source.publishedAt && <span>{source.publishedAt}</span>}
            </dd>
          </div>
          <div>
            <dt>{t('snapshot')}</dt>
            <dd className="tabular">
              <a className={styles.external} href={source.metricObjectUrl}>
                {source.metricScope}
                <ArrowUpRight aria-hidden="true" />
              </a>
              <span>
                {source.metrics
                  .filter((m) => m.value !== null)
                  .map((m) => `${m.label}: ${new Intl.NumberFormat(locale).format(m.value!)}`)
                  .join(' · ')}
              </span>
              <span>{t('observed', { date: source.observedAt })}</span>
            </dd>
          </div>
          <div>
            <dt>{t('evidence')}</dt>
            <dd className="tabular">
              <a className={styles.external} href={source.evidenceUrl}>
                {source.evidenceMethod}
                <ArrowUpRight aria-hidden="true" />
              </a>
              <span>{source.sourcePromptStatus}</span>
            </dd>
          </div>
        </dl>
      ))}
      <p>{t('scope')}</p>
    </section>
  );
}
