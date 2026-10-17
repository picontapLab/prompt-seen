import { SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { LocaleEntry } from '@/config';
import type { PromptDetail } from '@/modules/content/types';
import { absoluteUrl, paths } from '@/modules/url';
import { AnnotatedText } from '@/ui/annotation/AnnotatedText';
import { AnnotationNotes } from '@/ui/annotation/AnnotationNotes';
import { AnnotationProvider } from '@/ui/annotation/AnnotationProvider';
import { FrameNumber } from '@/ui/brand/FrameNumber';
import { ShareButton } from '@/ui/feedback/ShareButton';
import { Breadcrumb } from '@/ui/navigation/Breadcrumb';
import { headerSections, linkedPages } from '@/ui/navigation/sections';
import { ButtonLink } from '@/ui/primitives/Button';
import { RichText } from '@/ui/rich-text/RichText';
import { ExampleRuns } from './ExampleRuns';
import { ImageStage } from './ImageStage';
import { languageName } from './language';
import { MobileActionBar } from './MobileActionBar';
import { PromptSheet } from './PromptSheet';
import { RelatedRow } from './RelatedRow';
import { SourceInfo } from './SourceInfo';
import { TestInfo } from './TestInfo';
import styles from './Detail.module.css';

export type PromptDetailBodyProps = {
  detail: PromptDetail;
  /** The page's locale (registry entry). */
  locale: Pick<LocaleEntry, 'code' | 'pathPrefix' | 'htmlLang'>;
  siteName: string;
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
export function PromptDetailBody({ detail, locale, siteName }: PromptDetailBodyProps) {
  const t = useTranslations('detail');
  const id = useId();
  const textId = `${id}-prompt`;
  const copyId = `${id}-copy`;
  const prefix = locale.pathPrefix;
  const promptsSection = headerSections.find((s) => s.key === 'prompts');
  const category = detail.taxonomy.category;
  const template = detail.template && detail.relatedTemplates.find((x) => x.id === detail.template!.id);

  const images = [detail.cover, ...detail.examples.flatMap((r) => r.outputs)].filter(
    (img, i, all) => all.findIndex((x) => x.assetId === img.assetId) === i,
  );

  return (
    <AnnotationProvider annotations={detail.annotations}>
      <article className={styles.detail} data-detail="prompt" data-entry={detail.id}>
        <div className={styles.top}>
          <div className={styles.media}>
            <ImageStage
              images={images}
              startPrint={`${detail.frameNumber} ▸ ${detail.frameNumber}A`}
              endPrint={`${siteName.toUpperCase()} 400`}
              sizes="(min-width: 1024px) 58vw, 100vw"
            />
          </div>

          <div className={styles.info}>
            <Breadcrumb
              label={t('breadcrumb.label')}
              items={[
                { label: t('breadcrumb.home'), href: paths.home(prefix) },
                { label: t('breadcrumb.prompts'), href: promptsSection?.available ? paths.prompts(prefix) : null },
                { label: category.label, href: linkedPages.topics ? category.path : null },
              ]}
            />
            <header className={styles.header}>
              <FrameNumber n={Number(detail.frameNumber)} labelled />
              <h1 className={styles.title}>{detail.title}</h1>
              <p className={styles.summary}>{detail.description}</p>
              <TestInfo detail={detail} />
            </header>

            <PromptSheet
              copyText={detail.prompt.text}
              language={detail.prompt.language}
              languageName={languageName(detail.prompt.language, locale.htmlLang)}
              showLanguageNote={detail.prompt.language.split('-')[0] !== locale.htmlLang.split('-')[0]}
              characters={detail.prompt.characters}
              lines={detail.prompt.lines}
              textId={textId}
              copyButtonId={copyId}
            >
              <AnnotatedText text={detail.prompt.text} />
            </PromptSheet>

            <div className={styles.actions}>
              {template && (
                <ButtonLink
                  href={paths.template(prefix, template.slug)}
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
      />
    </AnnotationProvider>
  );
}
