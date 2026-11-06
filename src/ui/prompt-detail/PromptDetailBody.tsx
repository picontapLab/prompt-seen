import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { LocaleEntry } from '@/config';
import type { PromptDetail } from '@/modules/content/types';
import { absoluteUrl, paths } from '@/modules/url';
import { AnnotatedText } from '@/ui/annotation/AnnotatedText';
import { AnnotationNotes } from '@/ui/annotation/AnnotationNotes';
import { AnnotationProvider } from '@/ui/annotation/AnnotationProvider';
import { CircleMark } from '@/ui/brand/CircleMark';
import { FrameNumber } from '@/ui/brand/FrameNumber';
import { FavoriteButton } from '@/ui/favorites/FavoriteButton';
import { ShareButton } from '@/ui/feedback/ShareButton';
import { Breadcrumb } from '@/ui/navigation/Breadcrumb';
import { ButtonLink } from '@/ui/primitives/Button';
import { RichText } from '@/ui/rich-text/RichText';
import { encodeShare } from '@/ui/template-editor/share';
import { promptCrumbs } from './crumbs';
import { ExampleRuns } from './ExampleRuns';
import { RecordedShowcase } from './RecordedShowcase';
import { languageName } from './language';
import { MobileActionBar } from './MobileActionBar';
import { PromptSheet } from './PromptSheet';
import { RelatedRow } from './RelatedRow';
import { SourceInfo } from './SourceInfo';
import { InspirationSources } from './InspirationSources';
import { TestInfo } from './TestInfo';
import styles from './Detail.module.css';

export type PromptDetailBodyProps = {
  detail: PromptDetail;
  /** The page's locale (registry entry). */
  locale: Pick<LocaleEntry, 'code' | 'pathPrefix' | 'htmlLang'>;
  siteName: string;
  /**
   * In the detail popup the title is a level-2 heading that names the dialog (the list's own
   * title stays the page's h1). Omit on the full page.
   */
  heading?: { level: 2; id: string };
  /** An already loaded file of the cover to show until the larger one paints (ImageStage). */
  coverPreview?: string;
};

/**
 * The Prompt detail (design doc §9.2, §11.8.3), rendered from the build's serializable detail
 * model. The full page renders it on the server; the popup of step 4a renders the same component
 * from the same JSON in the browser (§3.5, §11.3: "两种展示共用详情正文"). So it reads no files,
 * no request state and no server-only modules: only the model, the locale and messages from the
 * `detail` namespace (give client islands that namespace with <ClientMessages>).
 *
 * Order follows §9.2, answer first: title, one-line summary and test record, the image, the
 * prompt to copy, then how to use it, test prints, source and related work.
 */
export function PromptDetailBody({ detail, locale, siteName, heading, coverPreview }: PromptDetailBodyProps) {
  const t = useTranslations('detail');
  const f = useTranslations('favorites');
  const k = useTranslations('shortcuts');
  const id = useId();
  const textId = `${id}-prompt`;
  const copyId = `${id}-copy`;
  const prefix = locale.pathPrefix;
  const template = detail.template && detail.relatedTemplates.find((x) => x.id === detail.template!.id);

  return (
    <AnnotationProvider annotations={detail.annotations}>
      <article className={styles.detail} data-detail="prompt" data-entry={detail.id} data-save-scope="">
        <div className={`${styles.top} ${styles.promptTop}`}>
          <div className={`${styles.info} ${styles.promptIntro}`}>
            <Breadcrumb
              label={t('breadcrumb.label')}
              items={promptCrumbs(detail, prefix, (key) => t(`breadcrumb.${key}`))}
            />
            <header className={styles.header}>
              <span className={styles.frameMark}>
                <FrameNumber n={Number(detail.frameNumber)} labelled />
                <CircleMark />
              </span>
              {heading ? (
                <h2 id={heading.id} className={styles.title}>
                  {detail.title}
                </h2>
              ) : (
                <h1 className={styles.title}>{detail.title}</h1>
              )}
              <p className={styles.summary}>{detail.description}</p>
              <TestInfo detail={detail} />
              {detail.inputInstructions && <p className={styles.summary}>{detail.inputInstructions}</p>}
            </header>
          </div>
          <RecordedShowcase
            runs={detail.examples.map(({ id, outputs, references, referenceLabels, prompt, promptLanguage }) => ({
              id,
              outputs,
              references,
              referenceLabels,
              prompt,
              promptLanguage,
            }))}
            defaultId={detail.showcaseExampleId ?? undefined}
            cover={detail.cover}
            currentPrompt={detail.prompt.text}
            frameNumber={detail.frameNumber}
            siteName={siteName}
            preview={coverPreview}
          />

          <div className={styles.info}>
            <PromptSheet
              copyText={detail.prompt.text}
              language={detail.prompt.language}
              languageName={languageName(detail.prompt.language, locale.htmlLang)}
              showLanguageNote={detail.prompt.language.split('-')[0] !== locale.htmlLang.split('-')[0]}
              characters={detail.prompt.characters}
              lines={detail.prompt.lines}
              textId={textId}
              copyButtonId={copyId}
              copyShortcut={{ key: 'C', hint: k('withKey', { action: t('copy.label'), key: 'C' }) }}
            >
              <AnnotatedText text={detail.prompt.text} />
            </PromptSheet>

            <div className={styles.actions}>
              {/* Saving (§11.5) and `S` (§11.10); the mobile bar repeats it as an icon. */}
              <FavoriteButton
                id={detail.id}
                kind="prompt"
                title={detail.title}
                variant="labelled"
                shortcut
                labels={{ save: f('save'), saved: f('saved') }}
              />
              {template && (
                <ButtonLink
                  href={
                    // The editor opens filled in with this prompt's values while the template still
                    // has their version; for an older version it opens on its default sample (§11.8.4).
                    detail.template!.version === template.currentVersion
                      ? paths.templateFilled(
                          prefix,
                          template.slug,
                          encodeShare(detail.template!.version, detail.template!.values),
                        )
                      : paths.template(prefix, template.slug)
                  }
                  icon={<SlidersHorizontal aria-hidden="true" />}
                >
                  {t('customize')}
                </ButtonLink>
              )}
              <ShareButton
                url={absoluteUrl(detail.path)}
                title={detail.title}
                labels={{ share: t('share.label'), copied: t('share.copied'), failed: t('share.failed') }}
              />
            </div>

            <AnnotationNotes heading={t('annotations.heading')} promptLanguage={detail.prompt.language} />

            {detail.body.length > 0 && <RichText blocks={detail.body} className={styles.body} />}

            <ExampleRuns
              runs={detail.examples}
              frameNumber={detail.frameNumber}
              currentPrompt={detail.prompt.text}
              promptLanguage={detail.prompt.language}
              templates={detail.relatedTemplates}
              locale={prefix}
            />

            <SourceInfo source={detail.source} image={detail.cover} />
            <InspirationSources
              sources={detail.inspirationSources ?? []}
              independentlyAdapted={detail.promptProvenance === 'independent-adaptation'}
            />
          </div>
        </div>

        <div className={styles.related}>
          <RelatedRow
            heading={t('related.templates')}
            items={detail.relatedTemplates.map((x) => ({
              href: paths.template(prefix, x.slug),
              title: x.title,
              image: x.cover,
            }))}
          />
          <RelatedRow
            heading={t('related.similar')}
            items={detail.similar.map((x) => ({
              href: paths.prompt(prefix, x.slug),
              title: x.title,
              image: x.cover,
              meta: x.frameNumber,
            }))}
          />
        </div>
      </article>

      <MobileActionBar
        copyText={detail.prompt.text}
        sheetCopyId={copyId}
        shareUrl={absoluteUrl(detail.path)}
        title={detail.title}
        favorite={
          <FavoriteButton
            id={detail.id}
            kind="prompt"
            title={detail.title}
            variant="bar"
            labels={{ save: f('save'), saved: f('saved'), saveKey: k('withKey', { action: f('save'), key: 'S' }) }}
          />
        }
      />
    </AnnotationProvider>
  );
}
