// Minimal readers for raw HTML as served (before any JavaScript runs), which is what crawlers
// see (design doc §16.3). Next.js writes attributes in a stable order, so regexes suffice.

const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1] ?? null;
const tags = (html: string, name: string) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];

export function htmlElement(html: string) {
  const tag = tags(html, 'html')[0] ?? '';
  return { lang: attr(tag, 'lang'), dir: attr(tag, 'dir') };
}

export function canonical(html: string): string | null {
  const link = tags(html, 'link').find((t) => attr(t, 'rel') === 'canonical');
  return link ? attr(link, 'href') : null;
}

/** hreflang -> href for <link rel="alternate" hreflang>. */
export function alternates(html: string): Record<string, string> {
  return Object.fromEntries(
    tags(html, 'link')
      .filter((t) => attr(t, 'rel') === 'alternate' && attr(t, 'hreflang'))
      .map((t) => [attr(t, 'hreflang')!, attr(t, 'href')!]),
  );
}

export function robots(html: string): string[] {
  return tags(html, 'meta')
    .filter((t) => attr(t, 'name') === 'robots')
    .map((t) => attr(t, 'content') ?? '');
}

/** Every same-host src/href in the document (absolute URLs to other hosts are skipped). */
export function localReferences(html: string): string[] {
  return [...html.matchAll(/\s(?:src|href)="(\/[^"/][^"]*|\/)"/g)].map((m) => m[1]!);
}

export function dataAttr(html: string, name: string): string | null {
  return new RegExp(`\\sdata-${name}="([^"]*)"`).exec(html)?.[1] ?? null;
}

const decode = (text: string) =>
  text
    .replace(/<!-- -->/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");

/** Text of the first <name> element inside <main> (React may split text with <!-- -->). */
export function elementText(html: string, name: string): string | null {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? html;
  const inner = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`).exec(main)?.[1];
  return inner === undefined ? null : decode(inner.replace(/<[^>]+>/g, '')).trim();
}

export function title(html: string): string | null {
  const inner = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1];
  return inner === undefined ? null : decode(inner).trim();
}
