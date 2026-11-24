import type { Annotation, ImageRef, PromptDetail } from '@/modules/content/types';
import { fitAnnotatedExcerpt, promptExcerpt } from '@/ui/annotation/layout';

/**
 * What a showcase needs from a prompt (design doc §11.8.1, §11.8.2): the work, its label and
 * the opening of its prompt with the annotated phrases inside it. Plain data, built on the
 * server from the detail model and passed to client islands as is.
 */
export type Showcase = {
  hasGifOutput?: boolean;
  id: string;
  path: string;
  title: string;
  localization: PromptDetail['localization'];
  frameNumber: string;
  cover: ImageRef;
  model: string | null;
  lastTestedAt: string | null;
  promptLanguage: string;
  /** The annotated sentences, holding every annotation that is kept. */
  quote: string;
  /** Text follows the quote. */
  truncated: boolean;
  /** Sentences without annotations come before the quote (`QuoteBudget.dropLeading`). */
  truncatedStart: boolean;
  /** The full prompt, for "Copy prompt" (§11.8.1: copy copies everything). */
  prompt: string;
  annotations: Annotation[];
};

/** How much of the prompt a showcase quotes (`promptExcerpt`): display width and leading cut. */
export type QuoteBudget = { maxWidth?: number; dropLeading?: boolean };

export function toShowcase(detail: PromptDetail, { maxWidth = 320, dropLeading = false }: QuoteBudget = {}): Showcase {
  const opening = promptExcerpt(detail.prompt.text, detail.annotations, maxWidth, { dropLeading });
  const excerpt = dropLeading ? fitAnnotatedExcerpt(opening, maxWidth) : opening;
  const model = detail.coverModel === undefined ? detail.test.model : detail.coverModel;
  return {
    hasGifOutput: detail.hasGifOutput,
    id: detail.id,
    path: detail.path,
    title: detail.title,
    localization: detail.localization,
    frameNumber: detail.frameNumber,
    cover: detail.cover,
    model: model?.displayName ?? model?.providerModelId ?? null,
    lastTestedAt: detail.coverRecordedAt === undefined ? detail.test.lastTestedAt : detail.coverRecordedAt,
    promptLanguage: detail.prompt.language,
    quote: excerpt.text,
    truncated: excerpt.truncated,
    truncatedStart: excerpt.truncatedStart,
    prompt: detail.prompt.text,
    annotations: excerpt.annotations,
  };
}
