import type {
  ExampleRunView,
  ImageRef,
  ImageVariant,
  LocalizedField,
  PromptDetail,
  RichBlock,
  RichInline,
  TemplateDetail,
} from '@/modules/content/types';
import { renderTemplate } from '@/modules/template';

// Markdown versions of the detail pages (design doc §9.10.4): what an AI tool or agent reads at
// …/index.md. Rendered from the same detail model as the HTML page, with the same headings and
// labels (the `detail` messages), answer first: title, summary, test record, the full prompt,
// how to use it, test prints with their parameters, source and licence, and the page's address.
// Pure: addresses, messages and language names come from `MarkdownContext`.

/** A message formatter; keys include the namespace ("detail.test.label"). */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

export type MarkdownContext = {
  /** Internal path → canonical URL. */
  absoluteUrl: (path: string) => string;
  /** Image variant → URL on the canonical host. */
  absoluteImageUrl: (variant: ImageVariant) => string;
  /** Messages in the page's locale. */
  t: Translate;
  /** Name of a language tag in the page's language ("English", "英语"). */
  languageName: (tag: string) => string;
  /** Published versions of this entry in other locales: native name and Markdown address. */
  otherVersions?: readonly { name: string; url: string }[];
};

// ---------------------------------------------------------------------------------------------
// Escaping

/** Characters that start Markdown syntax inside a line of text. */
const escapeText = (text: string) => text.replace(/([\\`*_[\]<>|])/g, '\\$1');

/** A code span that holds any text: the fence is longer than any backtick run inside. */
export function codeSpan(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(longest + 1);
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${text}${pad}${fence}`;
}

/** A fenced code block that holds any text, prompts included. */
export function codeBlock(text: string, lang: string | null = 'text'): string {
  const longest = Math.max(0, ...(text.match(/`{3,}/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}${lang ?? ''}\n${text}\n${fence}`;
}

/** Link targets with spaces or parentheses go in angle brackets. */
const target = (url: string) => (/[\s()]/.test(url) ? `<${url}>` : url);

const link = (text: string, url: string) => `[${escapeText(text)}](${target(url)})`;

// ---------------------------------------------------------------------------------------------
// Rich text (MDX compiled at build time, §3.5)

function inline(nodes: readonly RichInline[], ctx: MarkdownContext): string {
  return nodes
    .map((n) => {
      switch (n.t) {
        case 'text':
          return escapeText(n.v);
        case 'strong':
          return `**${inline(n.c, ctx)}**`;
        case 'em':
          return `*${inline(n.c, ctx)}*`;
        case 'del':
          return `~~${inline(n.c, ctx)}~~`;
        case 'code':
          return codeSpan(n.v);
        case 'link':
          return `[${inline(n.c, ctx)}](${target(n.internal ? ctx.absoluteUrl(n.href) : n.href)})`;
        case 'br':
          return '  \n';
      }
    })
    .join('');
}

const prefixLines = (text: string, prefix: string) =>
  text
    .split('\n')
    .map((line) => (line ? prefix + line : prefix.trimEnd()))
    .join('\n');

/** A list item: the marker on the first line, the rest indented to line up under its text. */
const listItem = (marker: string, body: string) => {
  const indent = ' '.repeat(marker.length + 1);
  return body
    .split('\n')
    .map((line, i) => (i === 0 ? `${marker} ${line}` : line ? indent + line : ''))
    .join('\n');
};

const mainVariant = (image: ImageRef) =>
  image.variants.detail ?? image.variants.card ?? image.variants.original ?? image.variants.thumbnail;

function image(img: ImageRef, ctx: MarkdownContext, caption: string | null = img.caption): string {
  const variant = mainVariant(img);
  if (!variant) return '';
  const md = `![${img.alt.replace(/([\\[\]])/g, '\\$1')}](${target(ctx.absoluteImageUrl(variant))})`;
  return caption ? `${md}\n*${escapeText(caption)}*` : md;
}

function table(head: string[], rows: string[][], align?: readonly ('left' | 'right' | 'center' | null)[]): string {
  const cell = (text: string) => text.replace(/\n+/g, ' ').trim() || ' ';
  const rule = head.map((_, i) => {
    const a = align?.[i];
    return a === 'left' ? ':---' : a === 'right' ? '---:' : a === 'center' ? ':---:' : '---';
  });
  const line = (cells: string[]) => `| ${cells.map(cell).join(' | ')} |`;
  return [line(head), line(rule), ...rows.map(line)].join('\n');
}

function block(b: RichBlock, ctx: MarkdownContext): string {
  switch (b.t) {
    case 'p':
      return inline(b.c, ctx);
    case 'h2':
    case 'h3':
    case 'h4':
      return `${'#'.repeat(Number(b.t[1]))} ${inline(b.c, ctx)}`;
    case 'ul':
    case 'ol':
      return b.items
        .map((item, i) =>
          listItem(
            b.t === 'ul' ? '-' : `${(b.start ?? 1) + i}.`,
            item.map((x) => block(x, ctx)).join(b.tight ? '\n' : '\n\n'),
          ),
        )
        .join(b.tight ? '\n' : '\n\n');
    case 'blockquote':
    case 'callout':
      return prefixLines(richText(b.c, ctx), '> ');
    case 'pre':
      return codeBlock(b.v, b.lang);
    case 'hr':
      return '---';
    case 'table':
      return table(
        b.head.map((c) => inline(c, ctx)),
        b.rows.map((row) => row.map((c) => inline(c, ctx))),
        b.align,
      );
    case 'figure':
      return image(b.image, ctx, b.caption);
  }
}

/** Rich text as Markdown blocks separated by blank lines. */
export function richText(blocks: readonly RichBlock[], ctx: MarkdownContext): string {
  return blocks
    .map((b) => block(b, ctx))
    .filter(Boolean)
    .join('\n\n');
}

// ---------------------------------------------------------------------------------------------
// Shared parts of both detail documents

const join = (parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join('\n\n') + '\n';

const modelName = (m: { displayName: string | null; providerModelId: string | null }) =>
  m.displayName ?? m.providerModelId;

/** "Label: value" with the locale's punctuation ("标签：值"); the value may hold Markdown. */
const labelled = (t: Translate, label: string, value: string) => t('geo.markdown.field', { label, value });

/** Title, summary and where the page and the other languages are. */
function head(entry: { title: string; description: string; path: string }, ctx: MarkdownContext): string[] {
  const { t } = ctx;
  const versions = ctx.otherVersions?.length
    ? labelled(t, t('geo.markdown.otherLanguages'), ctx.otherVersions.map((v) => link(v.name, v.url)).join(', '))
    : null;
  return [
    `# ${escapeText(entry.title)}`,
    escapeText(entry.description),
    [labelled(t, t('geo.markdown.webPage'), `<${ctx.absoluteUrl(entry.path)}>`), versions].filter(Boolean).join('  \n'),
  ];
}

function exampleRuns(
  runs: readonly ExampleRunView[],
  currentPrompt: string,
  templates: readonly { id: string; title: string; path: string }[],
  ctx: MarkdownContext,
): string | null {
  if (!runs.length) return null;
  const { t } = ctx;
  const parts = [`## ${t('detail.examples.heading')}`];
  for (const run of runs) {
    parts.push(`### ${run.recordedAt} · ${escapeText(modelName(run.model) ?? t('detail.examples.unknown'))}`);
    const template = run.template && templates.find((x) => x.id === run.template!.id);
    const facts = [
      run.provider && `- ${labelled(t, t('detail.examples.provider'), escapeText(run.provider))}`,
      run.template &&
        `- ${labelled(
          t,
          t('detail.examples.template', { version: run.template.version }),
          template ? link(template.title, ctx.absoluteUrl(template.path)) : codeSpan(run.template.id),
        )}`,
    ].filter(Boolean);
    if (facts.length) parts.push(facts.join('\n'));
    if (run.parameters.length)
      parts.push(
        table(
          [t('detail.examples.parameter'), t('detail.examples.value')],
          run.parameters.map((p) => [codeSpan(p.name), p.value === null ? '—' : escapeText(String(p.value))]),
        ),
      );
    if (run.notes) parts.push(labelled(t, t('detail.examples.notes'), escapeText(run.notes)));
    if (run.prompt !== currentPrompt)
      parts.push(labelled(t, t('detail.examples.promptUsed'), '').trimEnd(), codeBlock(run.prompt));
    const outputs = run.outputs.map((o) => image(o, ctx)).filter(Boolean);
    if (outputs.length) parts.push(outputs.join('\n\n'));
  }
  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------------------------
// Documents

/** The Markdown version of a Prompt detail page (§9.2 order, §9.10.4 contents). */
export function promptMarkdown(detail: PromptDetail, ctx: MarkdownContext): string {
  const { t } = ctx;
  const { test, source } = detail;
  const model = modelName(test.model);
  const verified = test.verification === 'verified' && model;
  const template = detail.template && detail.relatedTemplates.find((x) => x.id === detail.template!.id);
  const credit = detail.cover.credit;

  const testRecord = [
    verified ? t('detail.test.verifiedWith', { model }) : t('detail.test.notVerified') + (model ? ` (${model})` : ''),
    `${t('detail.test.dimensions', { width: detail.cover.width, height: detail.cover.height })} · ${test.aspectRatio}`,
    test.lastTestedAt ? t('detail.test.lastTested', { date: test.lastTestedAt }) : t('detail.test.neverTested'),
    t(`detail.test.reference.${test.referenceImage}`),
    t('detail.test.updated', { date: detail.updatedAt }),
  ].map((line) => `- ${escapeText(line)}`);

  const promptSource = source.author || source.url || source.license;
  const imageFacts = [
    credit.creator && escapeText(t('detail.source.creator', { creator: credit.creator })),
    credit.copyrightNotice && escapeText(credit.copyrightNotice),
    credit.license &&
      (credit.licenseUrl
        ? link(t('detail.source.licence', { licence: credit.license }), credit.licenseUrl)
        : escapeText(t('detail.source.licence', { licence: credit.license }))),
    detail.cover.digitalSourceType === 'trainedAlgorithmicMedia'
      ? t('detail.source.aiGenerated')
      : detail.cover.digitalSourceType === 'algorithmicMedia'
        ? t('detail.source.algorithmic')
        : null,
  ].filter(Boolean);
  const promptFacts = [
    source.author &&
      (source.url
        ? link(t('detail.source.author', { author: source.author }), source.url)
        : escapeText(t('detail.source.author', { author: source.author }))),
    !source.author && source.url && `<${source.url}>`,
    source.license && escapeText(t('detail.source.licence', { licence: source.license })),
  ].filter(Boolean);

  return join([
    ...head(detail, ctx),
    image(detail.cover, ctx),
    `## ${t('detail.test.label')}\n\n${testRecord.join('\n')}`,
    `## ${t('detail.sheet.label', { language: ctx.languageName(detail.prompt.language) })}\n\n${codeBlock(detail.prompt.text)}`,
    template && labelled(t, t('detail.customize'), link(template.title, ctx.absoluteUrl(template.path))),
    detail.annotations.length > 0 &&
      `## ${t('detail.annotations.heading')}\n\n${detail.annotations
        .map((a) => `- ${labelled(t, `**${a.letter}** ${codeSpan(a.phrase)}`, escapeText(a.note))}`)
        .join('\n')}`,
    richText(detail.body, ctx),
    exampleRuns(detail.examples, detail.prompt.text, detail.relatedTemplates, ctx),
    `## ${t('detail.source.heading')}\n\n${[
      `- ${labelled(t, t('detail.source.prompt'), promptSource ? promptFacts.join(' · ') : t('detail.source.unknown'))}`,
      `- ${labelled(t, t('detail.source.image'), imageFacts.length ? imageFacts.join(' · ') : t('detail.source.unknown'))}`,
    ].join('\n')}`,
  ]);
}

/** What a field takes, as on the template page: type and limit, and the choices of an enum. */
function fieldType(field: LocalizedField, t: Translate): string {
  const type = t(`detail.template.types.${field.type}`);
  const limit =
    field.type === 'string-list'
      ? t('detail.template.listLimit', { min: field.minItems ?? (field.required ? 1 : 0), max: field.maxItems ?? '∞' })
      : field.type === 'enum'
        ? field.options
            .map((o) => `${escapeText(field.optionLabels[o.value] ?? o.value)} (${codeSpan(o.value)})`)
            .join(', ')
        : field.maxLength
          ? t('detail.template.maxLength', { max: field.maxLength })
          : null;
  return limit ? labelled(t, type, limit) : type;
}

/** The Markdown version of a template page: the default prompt, the template body and its fields. */
export function templateMarkdown(detail: TemplateDetail, ctx: MarkdownContext): string {
  const { t } = ctx;
  const { version } = detail;
  const values = renderTemplate(
    { body: version.body, fields: version.fields },
    version.samples[0]?.values ?? {},
  ).values;
  const language = ctx.languageName(detail.promptLanguage);

  const rows = version.fields.map((field) => {
    const value = values[field.name];
    const shown =
      field.type === 'enum' && typeof value === 'string'
        ? (field.optionLabels[value] ?? value)
        : Array.isArray(value)
          ? value.join(field.type === 'string-list' ? field.separator : ' ')
          : value;
    const name = [
      `${escapeText(field.label)} (${codeSpan(field.name)})`,
      field.required ? t('detail.template.required') : t('detail.template.optional'),
      field.help && escapeText(field.help),
    ]
      .filter(Boolean)
      .join(' · ');
    return [name, fieldType(field, t), shown ? escapeText(String(shown)) : '—'];
  });

  return join([
    ...head(detail, ctx),
    escapeText(
      [
        t('detail.template.version', { version: version.id }),
        t('detail.template.fieldCount', { count: version.fields.length }),
      ].join(' · '),
    ),
    detail.cover && `${image(detail.cover, ctx)}\n\n*${escapeText(t('detail.template.sampleImage'))}*`,
    `## ${t('detail.sheet.label', { language })}\n\n${codeBlock(version.defaultPrompt)}`,
    `## ${t('geo.markdown.templateBody')}\n\n${codeBlock(version.body)}`,
    `## ${t('detail.template.fields')}\n\n${table(
      [t('detail.template.field'), t('detail.template.type'), t('detail.template.value')],
      rows,
    )}`,
    richText(detail.body, ctx),
    detail.relatedPrompts.length > 0 &&
      `## ${t('detail.template.examples')}\n\n${detail.relatedPrompts
        .map((p) => `- ${link(p.title, ctx.absoluteUrl(p.path))}`)
        .join('\n')}`,
    exampleRuns(detail.examples, version.defaultPrompt, [detail], ctx),
  ]);
}
