import type { Findings } from './findings';
import type { Content, PromptRecord } from './read';
import { resolvePrompt } from './prompt-variants';

// Empty quotation marks in a rendered prompt (docs/home-ux-optimization-spec.md C-3): a template
// field left blank inside quotes, such as `render exactly when supplied: ""`. The prompt reads as
// broken where it is quoted and copied. A warning, not an error: the prompt is the one the cover
// was made with, so fixing it means a new run, or a template that leaves the line out.

/** Straight, curly and corner quotes with nothing between them. */
const EMPTY_QUOTES = /""|“”|「」/g;

/** Each empty quotation in `text`, with a few words around it to find it by. */
export function emptyQuotations(text: string): string[] {
  return [...text.matchAll(EMPTY_QUOTES)].map((m) =>
    text
      .slice(Math.max(0, m.index - 32), m.index + m[0].length + 16)
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/** Warns about empty quotations in a prompt's source text and in each of its localized prompts. */
export function checkPromptQuotations(content: Content, rec: PromptRecord, sourceText: string | null, findings: Findings) {
  const template = rec.data.promptSource.type === 'template';
  const texts = [
    { file: rec.file, field: template ? 'promptSource.values' : undefined, label: 'the prompt', text: sourceText },
    ...[...rec.promptLocales].map(([locale, variant]) => ({
      file: variant.file,
      field: template ? 'values' : undefined,
      label: `the ${locale} prompt`,
      text: resolvePrompt(content, rec, locale).text,
    })),
  ];
  for (const { file, field, label, text } of texts)
    for (const around of text ? emptyQuotations(text) : [])
      findings.warning(file, `${label} has an empty quotation: "…${around}…"`, {
        field,
        fix: template
          ? 'a blank template field renders as empty quotes; fill it or use a version that leaves the line out, then make a new run so the cover matches the prompt'
          : 'remove the empty quotes or fill them, then make a new run so the cover matches the prompt',
      });
}
