// The one serializable detail model. The full page renders it at build time;
// content:build writes the same object to public/generated/{prefix}/prompts/{slug}.json
// for the popup. Both feed <PromptDetailBody>.
import { detailPath, markdownPath, templatesPath } from './site.mjs';

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * @param {any} item entry of content/prompts.json
 * @param {{code: string, prefix: string}} locale
 */
export function toDetailModel(item, locale) {
  const l = item.locales[locale.code];
  return {
    id: item.id,
    slug: item.slug,
    locale: locale.code,
    prefix: locale.prefix,
    title: l.title,
    summary: l.summary,
    prompt: l.prompt,
    hue: item.hue,
    ratio: item.ratio,
    // Stand-in for MDX compiled at build time to a serializable form (memo §3.1).
    bodyHtml: `<p>${escapeHtml(l.summary)}</p><p><em>${escapeHtml(item.id)}</em></p>`,
    path: detailPath(locale.prefix, item.slug),
    markdownPath: markdownPath(locale.prefix, item.slug),
    templatesPath: templatesPath(locale.prefix),
  };
}

export function toMarkdown(model, htmlUrl) {
  return [
    `# ${model.title}`,
    '',
    `> HTML: ${htmlUrl}`,
    '',
    model.summary,
    '',
    '```text',
    model.prompt,
    '```',
    '',
  ].join('\n');
}
