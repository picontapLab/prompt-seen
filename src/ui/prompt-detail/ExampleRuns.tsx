import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useId } from 'react';
import type { ExampleRunView, ImageRef, TemplateSummary } from '@/modules/content/types';
import { getImage } from '@/modules/media';
import { paths } from '@/modules/url';
import { GifBadge } from '@/ui/media/GifBadge';
import { isoDate, modelName } from './TestInfo';
import styles from './Detail.module.css';

/** Print id from the frame number: 0098-A, 0098-B… (§11.1.9 "帧号"). */
const printId = (frame: string, index: number) => `${frame}-${String.fromCharCode(65 + index)}`;

function Thumbs({ images, label }: { images: readonly ImageRef[]; label: string }) {
  if (images.length === 0) return null;
  return (
    <figure className={styles.runImages}>
      <figcaption>{label}</figcaption>
      <ul>
        {images.map((img) => {
          const p = getImage(img, 'thumbnail');
          return (
            <li key={img.assetId} style={{ aspectRatio: `${img.width} / ${img.height}`, background: p.placeholder }}>
              <img
                src={p.src}
                srcSet={p.srcSet}
                sizes="160px"
                width={p.width}
                height={p.height}
                alt={p.alt}
                loading="lazy"
                decoding="async"
              />
              <GifBadge image={img} overlay />
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

/**
 * Test prints (design doc §5.5, §9.2 item 7, §9.10.3): each recorded run with its model, date,
 * outputs, parameters as an HTML table and the editor's observations. The prompt that produced a
 * print is shown when it differs from today's prompt; it is a fixed snapshot (§5.5).
 */
export function ExampleRuns({
  runs,
  frameNumber,
  currentPrompt,
  promptLanguage,
  templates,
  locale,
}: {
  runs: readonly ExampleRunView[];
  frameNumber: string;
  currentPrompt: string;
  promptLanguage: string;
  /** Templates visible in this locale, to link a run to the version it used. */
  templates: readonly TemplateSummary[];
  /** URL prefix of the page's locale. */
  locale: string;
}) {
  const t = useTranslations('detail.examples');
  const format = useFormatter();
  const id = useId();
  if (runs.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className={styles.sectionHeading}>
        {t('heading')}
      </h2>
      {runs.map((run, i) => {
        const template = run.template && templates.find((x) => x.id === run.template!.id);
        return (
          <article key={run.id} className={styles.run} aria-labelledby={`${id}-${run.id}`}>
            <h3 id={`${id}-${run.id}`} className={styles.printId}>
              {printId(frameNumber, i)}
            </h3>
            <dl className={styles.runMeta}>
              <div>
                <dt>{t('model')}</dt>
                <dd>{modelName(run.model) ?? t('unknown')}</dd>
              </div>
              <div>
                <dt>{t('recorded')}</dt>
                <dd className="tabular">{format.dateTime(isoDate(run.recordedAt), { dateStyle: 'medium' })}</dd>
              </div>
              {run.provider && (
                <div>
                  <dt>{t('provider')}</dt>
                  <dd>{run.provider}</dd>
                </div>
              )}
              {run.template && (
                <div>
                  <dt>{t('template', { version: run.template.version })}</dt>
                  <dd>
                    {template ? (
                      <Link href={paths.template(locale, template.slug)} prefetch={false}>
                        {template.title}
                      </Link>
                    ) : (
                      run.template.id
                    )}
                  </dd>
                </div>
              )}
            </dl>
            {run.notes && (
              <p className={styles.runNotes}>
                <span className={styles.runLabel}>{t('notes')}: </span>
                {run.notes}
              </p>
            )}
            <div className={styles.runImagesRow}>
              <Thumbs images={run.references} label={t('references')} />
              <Thumbs images={run.outputs} label={t('outputs')} />
            </div>
            {run.parameters.length > 0 && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <caption className="visually-hidden">{t('parameters')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('parameter')}</th>
                      <th scope="col">{t('value')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.parameters.map((p) => (
                      <tr key={p.name}>
                        <th scope="row">
                          <code>{p.name}</code>
                        </th>
                        <td className="tabular">{p.value === null ? t('unknown') : String(p.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {run.prompt.trim() !== currentPrompt.trim() && (
              <details className={styles.runPrompt}>
                <summary>{t('promptUsed')}</summary>
                <p lang={promptLanguage} dir="auto">
                  {run.prompt}
                </p>
              </details>
            )}
          </article>
        );
      })}
    </section>
  );
}
