import { useTranslations } from 'next-intl';
import type { LocaleEntry } from '@/config';
import type { TemplateDetail } from '@/modules/content/types';
import { paths } from '@/modules/url';
import { FavoriteButton } from '@/ui/favorites/FavoriteButton';
import { Breadcrumb } from '@/ui/navigation/Breadcrumb';
import { templateCrumbs } from '@/ui/prompt-detail/crumbs';
import { ExampleRuns } from '@/ui/prompt-detail/ExampleRuns';
import { languageName } from '@/ui/prompt-detail/language';
import { RelatedRow } from '@/ui/prompt-detail/RelatedRow';
import { RichText } from '@/ui/rich-text/RichText';
import { TemplateEditor, type EditorModel } from '@/ui/template-editor/TemplateEditor';
import detailStyles from '@/ui/prompt-detail/Detail.module.css';
import styles from './TemplateDetail.module.css';

/**
 * The template detail (design doc §6, §9.1, §11.8.4), rendered from the build's detail model:
 * title and summary, the editor, then the usage notes, test prints and work made with it. The
 * editor renders on the server with the default sample, so the initial HTML holds every field
 * with its label, help and default value, and the default prompt (§3.2, §3.3), produced by the
 * same pure function the browser uses for every edit (§6.3).
 */
export function TemplateDetailBody({
  detail,
  locale,
}: {
  detail: TemplateDetail;
  locale: Pick<LocaleEntry, 'code' | 'pathPrefix' | 'htmlLang'>;
}) {
  const t = useTranslations('detail');
  const f = useTranslations('favorites');
  const prefix = locale.pathPrefix;
  const { version } = detail;
  // Only what the editor uses crosses to the browser (§3.5): not the notes, prints or related work.
  const model: EditorModel = {
    templateId: detail.id,
    slug: detail.slug,
    path: detail.path,
    title: detail.title,
    promptLanguage: detail.promptLanguage,
    version: { id: version.id, body: version.body, fields: version.fields, samples: version.samples },
    cover: detail.cover,
    examples: detail.examples.flatMap((run) =>
      run.outputs[0]
        ? [
            {
              id: run.id,
              prompt: run.prompt,
              promptLanguage: run.promptLanguage,
              template: run.template,
              image: run.outputs[0],
              references: run.references.map((image, index) => ({
                ...image,
                caption: run.referenceLabels?.[index] || image.caption,
              })),
            },
          ]
        : [],
    ),
  };

  return (
    <article className={detailStyles.detail} data-detail="template" data-entry={detail.id}>
      <div className={styles.top}>
        <Breadcrumb label={t('breadcrumb.label')} items={templateCrumbs(prefix, (key) => t(`breadcrumb.${key}`))} />
        <header className={detailStyles.header}>
          <h1 className={detailStyles.title}>{detail.title}</h1>
          <p className={detailStyles.summary}>{detail.description}</p>
          {detail.inputInstructions && <p className={detailStyles.summary}>{detail.inputInstructions}</p>}
          <div className={detailStyles.actions}>
            {/* Saving (§11.5) and `S` (§11.10). */}
            <FavoriteButton
              id={detail.id}
              kind="template"
              title={detail.title}
              variant="labelled"
              shortcut
              labels={{ save: f('save'), saved: f('saved') }}
            />
          </div>
        </header>
        <TemplateEditor
          key={`${detail.id}:${version.id}`}
          model={model}
          languageName={languageName(detail.promptLanguage, locale.htmlLang)}
          showLanguageNote={detail.promptLanguage.split('-')[0] !== locale.htmlLang.split('-')[0]}
        />
      </div>

      {(detail.body.length > 0 || detail.examples.length > 0) && (
        <div className={styles.reading}>
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
      )}

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
