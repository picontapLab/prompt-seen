import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { LocaleEntry } from '@/config';
import type { LocalizedField, TemplateDetail } from '@/modules/content/types';
import { renderTemplate } from '@/modules/template';
import { absoluteUrl, paths } from '@/modules/url';
import { ShareButton } from '@/ui/feedback/ShareButton';
import { Breadcrumb } from '@/ui/navigation/Breadcrumb';
import { headerSections } from '@/ui/navigation/sections';
import { ExampleRuns } from '@/ui/prompt-detail/ExampleRuns';
import { ImageStage } from '@/ui/prompt-detail/ImageStage';
import { languageName } from '@/ui/prompt-detail/language';
import { PromptSheet } from '@/ui/prompt-detail/PromptSheet';
import { RelatedRow } from '@/ui/prompt-detail/RelatedRow';
import { RichText } from '@/ui/rich-text/RichText';
import detailStyles from '@/ui/prompt-detail/Detail.module.css';
import styles from './TemplateDetail.module.css';

/** Variable colour of a field: the six var-* token pairs in field order (§11.1.1). */
export const varColor = (fieldIndex: number) => (fieldIndex % 6) + 1;

function Constraint({ field }: { field: LocalizedField }) {
  const t = useTranslations('detail.template');
  if (field.type === 'string-list')
    return <>{t('listLimit', { min: field.minItems ?? (field.required ? 1 : 0), max: field.maxItems ?? '∞' })}</>;
  if (field.type === 'enum') return <>{t('choices', { count: field.options.length })}</>;
  return field.maxLength ? <>{t('maxLength', { max: field.maxLength })}</> : null;
}

/**
 * The template detail (design doc §6, §9.1, §11.8.4), rendered from the build's detail model. The
 * initial HTML holds the default sample's prompt, rendered by the same pure function the editor
 * of step 3c uses (§3.2, §6.3), with each field's value in that field's variable colour. The
 * field table names each variable with the same colour bar, so "fill here, changes there" reads
 * before any editing exists.
 */
export function TemplateDetailBody({
  detail,
  locale,
}: {
  detail: TemplateDetail;
  locale: Pick<LocaleEntry, 'code' | 'pathPrefix' | 'htmlLang'>;
}) {
  const t = useTranslations('detail');
  const id = useId();
  const prefix = locale.pathPrefix;
  const { version } = detail;
  const sample = version.samples[0];
  const rendered = renderTemplate({ body: version.body, fields: version.fields }, sample?.values ?? {});
  const segments = rendered.segments.map((s, i, all) =>
    s.kind === 'text' && i === 0
      ? { ...s, text: s.text.trimStart() }
      : s.kind === 'text' && i === all.length - 1
        ? { ...s, text: s.text.trimEnd() }
        : s,
  );
  const templatesSection = headerSections.find((s) => s.key === 'templates');

  return (
    <article className={detailStyles.detail} data-detail="template" data-entry={detail.id}>
      <div className={detailStyles.top}>
        <div className={detailStyles.media}>
          {detail.cover && (
            <>
              <ImageStage images={[detail.cover]} sizes="(min-width: 1024px) 58vw, 100vw" />
              <p className={styles.sampleNote}>{t('template.sampleImage')}</p>
            </>
          )}
        </div>

        <div className={detailStyles.info}>
          <Breadcrumb
            label={t('breadcrumb.label')}
            items={[
              { label: t('breadcrumb.home'), href: paths.home(prefix) },
              { label: t('breadcrumb.templates'), href: templatesSection?.available ? paths.templates(prefix) : null },
            ]}
          />
          <header className={detailStyles.header}>
            <h1 className={detailStyles.title}>{detail.title}</h1>
            <p className={detailStyles.summary}>{detail.description}</p>
            <p className={styles.meta}>
              {[
                t('template.version', { version: version.id }),
                t('template.fieldCount', { count: version.fields.length }),
              ].join(' · ')}
            </p>
          </header>

          <PromptSheet
            copyText={version.defaultPrompt}
            language={detail.promptLanguage}
            languageName={languageName(detail.promptLanguage, locale.htmlLang)}
            showLanguageNote={detail.promptLanguage.split('-')[0] !== locale.htmlLang.split('-')[0]}
            characters={version.defaultPrompt.length}
            lines={version.defaultPrompt.split('\n').length}
            textId={`${id}-prompt`}
          >
            {segments.map((s, i) =>
              s.kind === 'text' ? (
                <span key={i}>{s.text}</span>
              ) : (
                <span key={i} className={styles.variable} data-var={varColor(s.fieldIndex)} data-field={s.name}>
                  {s.text}
                </span>
              ),
            )}
          </PromptSheet>

          <div className={detailStyles.actions}>
            <ShareButton
              url={absoluteUrl(detail.path)}
              title={detail.title}
              labels={{ share: t('share.label'), copied: t('share.copied'), failed: t('share.failed') }}
            />
          </div>

          <section className={detailStyles.section} aria-labelledby={`${id}-fields`}>
            <h2 id={`${id}-fields`} className={detailStyles.sectionHeading}>
              {t('template.fields')}
            </h2>
            <div className={detailStyles.tableWrap}>
              <table className={detailStyles.table}>
                <thead>
                  <tr>
                    <th scope="col">{t('template.field')}</th>
                    <th scope="col">{t('template.type')}</th>
                    <th scope="col">{t('template.value')}</th>
                  </tr>
                </thead>
                <tbody>
                  {version.fields.map((field, i) => {
                    const value = rendered.values[field.name];
                    const shown =
                      field.type === 'enum' && typeof value === 'string'
                        ? (field.optionLabels[value] ?? value)
                        : Array.isArray(value)
                          ? value.join(field.type === 'string-list' ? field.separator : ' ')
                          : value;
                    return (
                      <tr key={field.name}>
                        <th scope="row">
                          <div className={styles.fieldName} data-var={varColor(i)}>
                            <span>{field.label}</span>
                            <span className={styles.requirement}>
                              {field.required ? t('template.required') : t('template.optional')}
                            </span>
                            {field.help && <span className={styles.help}>{field.help}</span>}
                          </div>
                        </th>
                        <td>
                          {t(`template.types.${field.type}`)}
                          <span className={styles.help}>
                            <Constraint field={field} />
                          </span>
                        </td>
                        <td lang={detail.promptLanguage}>{shown || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {detail.body.length > 0 && <RichText blocks={detail.body} className={detailStyles.body} />}

          <ExampleRuns
            runs={detail.examples}
            frameNumber={detail.id.replace(/^t_/, 'T')}
            currentPrompt={version.defaultPrompt}
            promptLanguage={detail.promptLanguage}
            templates={[detail]}
            locale={prefix}
          />
        </div>
      </div>

      <div className={detailStyles.related}>
        <RelatedRow
          heading={t('template.examples')}
          items={detail.relatedPrompts.map((x) => ({
            href: paths.prompt(prefix, x.slug),
            title: x.title,
            image: x.cover,
            meta: x.frameNumber,
          }))}
        />
      </div>
    </article>
  );
}
