import { LOCALES, SITE_NAME, absUrl, listPath, markdownPath } from '@/lib/site.mjs';
import { getCards } from '@/lib/content';

export const dynamic = 'force-static';

export function GET() {
  const lines = [`# ${SITE_NAME}`, '', '> Open image-prompt library (spike).', ''];
  for (const l of LOCALES) {
    lines.push(`## ${l.name}`, '', `- [Prompts](${absUrl(listPath(l.prefix))})`);
    for (const c of getCards(l.prefix).slice(0, 3)) lines.push(`- [${c.title}](${absUrl(markdownPath(l.prefix, c.slug))})`);
    lines.push('');
  }
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
