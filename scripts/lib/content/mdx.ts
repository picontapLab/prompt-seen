import GithubSlugger from 'github-slugger';
import type { Nodes, PhrasingContent, RootContent } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { ImageRef, RichBlock, RichInline, TocItem } from '../../../src/modules/content/types';
import type { Findings } from './findings';

// Restricted MDX → serializable rich text (design doc §3.5, §5.3). Locale files are parsed at
// build time into a small tree of known nodes. Allowed:
// - Markdown: paragraphs, ## to #### headings, lists, quotes, code, rules, GFM tables,
//   emphasis, strong, strikethrough, inline code, links, line breaks.
// - Components: <Figure asset="a_012" caption="…" /> and <Callout>…</Callout>.
// - Links: https/mailto, #anchors, and content links that follow slug changes and the base
//   path: prompt:p_001, template:t_001, collection:c_001, page:about, category:landscape,
//   style:ink, use-case:portrait.
// Anything else (raw HTML, import/export, {expressions}, images, other components) is an
// error with its line, so the browser never compiles MDX and pages never run content code.

export const CONTENT_LINK = /^(prompt|template|collection|page|category|style|use-case):([a-z0-9_-]+)$/;
export type ContentLinkKind = 'prompt' | 'template' | 'collection' | 'page' | 'category' | 'style' | 'use-case';
export type ContentLink = { kind: ContentLinkKind; target: string };

export type MdxResolvers = {
  /** Internal path of a content link in this locale, or null when it is not visible there. */
  link: (link: ContentLink) => string | null;
  /** The image for <Figure asset>, with alt text in this locale. */
  figure: (assetId: string) => ImageRef | null;
};

export type CompiledMdx = {
  blocks: RichBlock[];
  toc: TocItem[];
  /** ## sections with whether anything follows the heading (§8.4 rule 4). */
  sections: { title: string; hasContent: boolean }[];
  /** Plain text of the whole body, for search and checks. */
  text: string;
  links: (ContentLink & { line?: number })[];
  figures: { assetId: string; line?: number }[];
};

type Ctx = {
  file: string;
  lineOffset: number;
  findings: Findings | null;
  resolve: MdxResolvers | null;
  slugger: GithubSlugger;
  out: CompiledMdx;
};

type JsxAttribute = { type: string; name?: string; value?: unknown };
type JsxElement = {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement';
  name: string | null;
  attributes: JsxAttribute[];
  children: RootContent[];
  position?: Nodes['position'];
};

const processor = unified().use(remarkParse).use(remarkMdx).use(remarkGfm);

const lineOf = (ctx: Ctx, node: { position?: Nodes['position'] }) =>
  node.position ? node.position.start.line + ctx.lineOffset : undefined;

function fail(ctx: Ctx, node: { position?: Nodes['position'] } | null, message: string, fix?: string) {
  ctx.findings?.error(ctx.file, message, { line: node ? lineOf(ctx, node) : undefined, fix });
}

function plain(nodes: readonly RichInline[]): string {
  return nodes
    .map((n) => {
      switch (n.t) {
        case 'text':
        case 'code':
          return n.v;
        case 'br':
          return '\n';
        default:
          return plain(n.c);
      }
    })
    .join('');
}

function inline(ctx: Ctx, nodes: readonly PhrasingContent[]): RichInline[] {
  const result: RichInline[] = [];
  for (const node of nodes) {
    const n = node as PhrasingContent | JsxElement | { type: string; position?: Nodes['position'] };
    switch (n.type) {
      case 'text':
        result.push({ t: 'text', v: (n as { value: string }).value });
        break;
      case 'emphasis':
      case 'strong':
      case 'delete': {
        const t = n.type === 'emphasis' ? 'em' : n.type === 'strong' ? 'strong' : 'del';
        result.push({ t, c: inline(ctx, (n as { children: PhrasingContent[] }).children) });
        break;
      }
      case 'inlineCode':
        result.push({ t: 'code', v: (n as { value: string }).value });
        break;
      case 'break':
        result.push({ t: 'br' });
        break;
      case 'link': {
        const { url, children } = n as { url: string; children: PhrasingContent[] };
        const c = inline(ctx, children);
        const link = linkTarget(ctx, n, url);
        if (link === null) result.push(...c);
        else result.push({ t: 'link', href: link.href, internal: link.internal, c });
        break;
      }
      case 'image':
        fail(ctx, n, 'Markdown images are not supported', 'use <Figure asset="a_012" /> on its own line');
        break;
      case 'mdxJsxTextElement':
        fail(ctx, n, `inline component <${(n as JsxElement).name ?? ''}> is not supported`, 'put <Figure> or <Callout> on its own line');
        break;
      case 'mdxTextExpression':
        fail(ctx, n, '{…} expressions are not allowed in content', 'write \\{ for a literal brace, or put the text in `inline code`');
        break;
      case 'html':
        fail(ctx, n, 'raw HTML is not allowed in content', 'use Markdown or the allowed components');
        break;
      case 'linkReference':
      case 'imageReference':
      case 'footnoteReference':
        fail(ctx, n, 'reference-style links and footnotes are not supported', 'write links inline: [text](https://…)');
        break;
      default:
        fail(ctx, n, `unsupported Markdown element "${n.type}"`);
    }
  }
  return result;
}

function linkTarget(ctx: Ctx, node: { position?: Nodes['position'] }, url: string): { href: string; internal: boolean } | null {
  if (/^https?:\/\/[^\s]+$/.test(url) || /^mailto:[^\s]+$/.test(url)) return { href: url, internal: false };
  if (/^#[\w-]+$/.test(url)) return { href: url, internal: false };
  const m = CONTENT_LINK.exec(url);
  if (!m) {
    fail(
      ctx,
      node,
      `link "${url}" is not allowed`,
      'link to this site with prompt:p_001, template:t_001, collection:c_001, page:about, category:id, style:id or use-case:id; other sites with https://',
    );
    return null;
  }
  const link: ContentLink = { kind: m[1] as ContentLinkKind, target: m[2]! };
  ctx.out.links.push({ ...link, line: lineOf(ctx, node) });
  if (!ctx.resolve) return { href: url, internal: true };
  const path = ctx.resolve.link(link);
  return path === null ? null : { href: path, internal: true };
}

function attributes(ctx: Ctx, el: JsxElement, allowed: Record<string, boolean>): Record<string, string> | null {
  const values: Record<string, string> = {};
  let ok = true;
  for (const attr of el.attributes) {
    if (attr.type !== 'mdxJsxAttribute' || !attr.name || !(attr.name in allowed)) {
      fail(ctx, el, `<${el.name}> does not accept ${attr.name ? `"${attr.name}"` : 'spread attributes'}`, `allowed: ${Object.keys(allowed).join(', ')}`);
      ok = false;
    } else if (typeof attr.value !== 'string') {
      fail(ctx, el, `<${el.name} ${attr.name}> must be a quoted string`, `write ${attr.name}="…"`);
      ok = false;
    } else values[attr.name] = attr.value;
  }
  for (const [name, required] of Object.entries(allowed)) {
    if (required && !(name in values)) {
      fail(ctx, el, `<${el.name}> needs ${name}="…"`);
      ok = false;
    }
  }
  return ok ? values : null;
}

function component(ctx: Ctx, el: JsxElement): RichBlock[] {
  if (el.name === 'Figure') {
    if (el.children.length) fail(ctx, el, '<Figure> takes no children', 'write <Figure asset="a_012" caption="…" />');
    const attrs = attributes(ctx, el, { asset: true, caption: false });
    if (!attrs) return [];
    if (!/^a_\d{3,}$/.test(attrs.asset!)) {
      fail(ctx, el, `<Figure asset="${attrs.asset}"> is not a media ID`, 'use the ID of a file in content/media/, e.g. a_012');
      return [];
    }
    ctx.out.figures.push({ assetId: attrs.asset!, line: lineOf(ctx, el) });
    const caption = attrs.caption?.trim() || null;
    if (!ctx.resolve) return [];
    const image = ctx.resolve.figure(attrs.asset!);
    return image ? [{ t: 'figure', image, caption }] : [];
  }
  if (el.name === 'Callout') {
    attributes(ctx, el, {});
    return [{ t: 'callout', c: blocks(ctx, el.children) }];
  }
  fail(ctx, el, `component <${el.name ?? ''}> is not allowed`, 'allowed components: <Figure asset="…" /> and <Callout>…</Callout>');
  return [];
}

function blocks(ctx: Ctx, nodes: readonly RootContent[]): RichBlock[] {
  const result: RichBlock[] = [];
  for (const node of nodes) {
    const n = node as RootContent | JsxElement;
    switch (n.type) {
      case 'paragraph':
        result.push({ t: 'p', c: inline(ctx, n.children) });
        break;
      case 'heading': {
        const c = inline(ctx, n.children);
        if (n.depth === 1 || n.depth > 4) {
          fail(ctx, n, `"${'#'.repeat(n.depth)}" headings are not allowed`, 'start sections at ## (the title is the page heading) and go no deeper than ####');
          break;
        }
        const text = plain(c).trim();
        const id = ctx.slugger.slug(text);
        const t = `h${n.depth}` as 'h2' | 'h3' | 'h4';
        result.push({ t, id, c });
        if (t === 'h2') {
          ctx.out.toc.push({ id, text });
          ctx.out.sections.push({ title: text, hasContent: false });
        }
        break;
      }
      case 'list':
        result.push({
          t: n.ordered ? 'ol' : 'ul',
          start: n.ordered ? (n.start ?? 1) : null,
          tight: !n.spread,
          items: n.children.map((item) => blocks(ctx, item.children)),
        });
        break;
      case 'blockquote':
        result.push({ t: 'blockquote', c: blocks(ctx, n.children) });
        break;
      case 'code':
        result.push({ t: 'pre', lang: n.lang ?? null, v: n.value });
        break;
      case 'thematicBreak':
        result.push({ t: 'hr' });
        break;
      case 'table': {
        const [head, ...rows] = n.children;
        result.push({
          t: 'table',
          align: (n.align ?? []).map((a) => a ?? null),
          head: (head?.children ?? []).map((cell) => inline(ctx, cell.children)),
          rows: rows.map((row) => row.children.map((cell) => inline(ctx, cell.children))),
        });
        break;
      }
      case 'mdxJsxFlowElement':
        result.push(...component(ctx, n as JsxElement));
        break;
      case 'mdxjsEsm':
        fail(ctx, n, 'import and export are not allowed in content', 'use the allowed components only; they need no import');
        break;
      case 'mdxFlowExpression':
        fail(ctx, n, '{…} expressions are not allowed in content', 'write \\{ for a literal brace, or use a code block');
        break;
      case 'html':
        fail(ctx, n, 'raw HTML is not allowed in content', 'use Markdown or the allowed components');
        break;
      case 'definition':
      case 'footnoteDefinition':
        fail(ctx, n, 'link definitions and footnotes are not supported', 'write links inline: [text](https://…)');
        break;
      default:
        fail(ctx, n, `unsupported Markdown element "${n.type}"`);
    }
    // A block after a ## heading gives that section content.
    const last = ctx.out.sections.at(-1);
    if (last && n.type !== 'heading') last.hasContent = true;
    else if (last && n.type === 'heading' && n.depth > 2) last.hasContent = true;
  }
  return result;
}

function blockText(b: RichBlock): string {
  switch (b.t) {
    case 'p':
    case 'h2':
    case 'h3':
    case 'h4':
      return plain(b.c);
    case 'ul':
    case 'ol':
      return b.items.map((item) => item.map(blockText).join('\n')).join('\n');
    case 'blockquote':
    case 'callout':
      return b.c.map(blockText).join('\n');
    case 'pre':
      return b.v;
    case 'table':
      return [b.head, ...b.rows].map((row) => row.map(plain).join(' ')).join('\n');
    case 'figure':
      return b.caption ?? '';
    case 'hr':
      return '';
  }
}

/**
 * Compiles one locale file's body. Without resolvers it only checks the body and collects its
 * links and figures (reported to `findings`); with resolvers it produces the final tree.
 */
export function compileMdx(
  source: string,
  { file, lineOffset = 0, findings = null, resolve = null }: { file: string; lineOffset?: number; findings?: Findings | null; resolve?: MdxResolvers | null },
): CompiledMdx {
  const out: CompiledMdx = { blocks: [], toc: [], sections: [], text: '', links: [], figures: [] };
  const ctx: Ctx = { file, lineOffset, findings, resolve, slugger: new GithubSlugger(), out };
  let tree;
  try {
    tree = processor.parse(source);
  } catch (error) {
    const e = error as { reason?: string; message: string; line?: number; place?: { line?: number; start?: { line?: number } } };
    const line = e.line ?? e.place?.line ?? e.place?.start?.line;
    findings?.error(file, `MDX syntax error: ${e.reason ?? e.message}`, {
      line: line === undefined ? undefined : line + lineOffset,
      fix: 'a literal "{" or "<" must be escaped as \\{ or \\<, or written inside `inline code`',
    });
    return out;
  }
  out.blocks = blocks(ctx, tree.children);
  out.text = out.blocks.map(blockText).filter(Boolean).join('\n');
  return out;
}

// ---------------------------------------------------------------------------------------------
// Frontmatter

export type SplitFile = { frontmatter: string; body: string; bodyLine: number; frontmatterLine: number };

/** Splits `---\n…\n---` from a locale file. Line numbers are 1-based positions in the file. */
export function splitFrontmatter(source: string): SplitFile | null {
  const m = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(source);
  if (!m) return null;
  const consumed = m[0];
  return {
    frontmatter: m[1]!,
    body: source.slice(consumed.length),
    frontmatterLine: 2,
    bodyLine: consumed.split('\n').length - (consumed.endsWith('\n') ? 1 : 0) + 1,
  };
}
