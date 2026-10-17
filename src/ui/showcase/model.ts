import type { Annotation, ImageRef, PromptDetail } from '@/modules/content/types';
import { promptExcerpt } from '@/ui/annotation/layout';

/**
 * What a showcase needs from a prompt (design doc §11.8.1, §11.8.2): the work, its label and
 * the opening of its prompt with the annotated phrases inside it. Plain data, built on the
 * server from the detail model and passed to client islands as is.
 */
export type Showcase = {
  id: string;
  path: string;
  title: string;
  frameNumber: string;
  cover: ImageRef;
  model: string | null;
  lastTestedAt: string | null;
  promptLanguage: string;
  /** The opening sentences, holding every annotation that is kept. */
  quote: string;
  truncated: boolean;
  /** The full prompt, for "Copy prompt" (§11.8.1: copy copies everything). */
  prompt: string;
  annotations: Annotation[];
};

export function toShowcase(detail: PromptDetail, maxQuote = 320): Showcase {
  const excerpt = promptExcerpt(detail.prompt.text, detail.annotations, maxQuote);
  return {
    id: detail.id,
    path: detail.path,
    title: detail.title,
    frameNumber: detail.frameNumber,
    cover: detail.cover,
    model: detail.test.model.displayName ?? detail.test.model.providerModelId,
    lastTestedAt: detail.test.lastTestedAt,
    promptLanguage: detail.prompt.language,
    quote: excerpt.text,
    truncated: excerpt.truncated,
    prompt: detail.prompt.text,
    annotations: excerpt.annotations,
  };
}
