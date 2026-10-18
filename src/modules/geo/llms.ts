// llms.txt (design doc §9.10.4; llmstxt.org): a Markdown summary of the site for AI tools, with
// links to the Markdown versions of its pages. A community proposal that Google does not use;
// provided because it costs little, not as the main GEO measure. Pure: the document is
// assembled from data the caller has already filtered to published content.

export type LlmsLink = { title: string; url: string; note?: string | null };
export type LlmsSection = { heading: string; links: readonly LlmsLink[] };

export type LlmsDocument = {
  title: string;
  /** The blockquote under the title: what the site is, in one or two sentences. */
  summary: string;
  /** Paragraphs after the summary. */
  details: readonly string[];
  /** Sections of links; empty sections are left out. "Optional" is the spec's name for skippable links. */
  sections: readonly LlmsSection[];
};

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();
const linkText = (text: string) => oneLine(text).replace(/([\\[\]])/g, '\\$1');

export function llmsTxt(doc: LlmsDocument): string {
  const parts = [`# ${oneLine(doc.title)}`, `> ${oneLine(doc.summary)}`, ...doc.details];
  for (const section of doc.sections) {
    if (!section.links.length) continue;
    const links = section.links.map((l) => `- [${linkText(l.title)}](${l.url})${l.note ? `: ${oneLine(l.note)}` : ''}`);
    parts.push(`## ${oneLine(section.heading)}\n\n${links.join('\n')}`);
  }
  return parts.join('\n\n') + '\n';
}
