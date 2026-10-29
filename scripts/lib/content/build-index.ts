import type { LocaleEntry, ResolvedConfig } from '../../../src/config/schema';
import type {
  Alternate,
  Annotation,
  CollectionDetail,
  CollectionItem,
  CollectionSummary,
  ContentManifest,
  DetailByKind,
  EntryKind,
  ExampleRunView,
  ImageRef,
  ImageVariant,
  LocaleIndex,
  LocalizedField,
  PageDetail,
  PromptDetail,
  PromptSummary,
  RichBlock,
  TaxonomyKind,
  TemplateDetail,
  TemplateSummary,
  Term,
  TermRef,
  TopicDetail,
  TranslationInfo,
  Visibility,
} from '../../../src/modules/content/types';
import { graphemeLength, renderTemplate, resolveValues } from '../../../src/modules/template/render';
import type { createUrlModule } from '../../../src/modules/url/create';
import { compileMdx, type ContentLink } from './mdx';
import type { Content, LocaleFile, PromptRecord, TaxonomyKey, TemplateRecord } from './read';
import { TAXONOMY_FILES, sha256 } from './read';
import {
  COLLECTION_MIN_ITEMS,
  localeStates,
  promptTextOf,
  publishProblems,
  TOPIC_MIN_PROMPTS,
  toFieldSpec,
  versionSpec,
  inputRequirementsOf,
  runInputRequirements,
  sameValues,
  type LocaleState,
} from './rules';

// Steps 6–7 of content:build (design doc §14.2): decide what this build shows and produce the
// serializable models in src/modules/content/types.ts.
//
// Production builds show a locale version when the locale is enabled, the file is published
// and it meets every publishing rule (§8.4). Preview builds also show drafts, in enabled and
// preview locales, so maintainers can check work in progress (§15.1); archived versions are
// never shown. An entry is never shown in a locale it has no file for (§8.4: no fallback text).

type Url = ReturnType<typeof createUrlModule>;

export type BuiltContent = {
  manifest: ContentManifest;
  locales: Map<string, LocaleIndex>;
  details: { kind: EntryKind; locale: string; key: string; model: DetailByKind[EntryKind] }[];
};

const SIMILAR_LIMIT = 6;

/** The file key of a detail model: IDs for entries, slugs for pages, `{taxonomy}/{id}` for topics. */
export const detailKey = (kind: EntryKind, key: string) => `${kind}/${key}`;

/** p_127 → "0127": four digits, more once IDs pass 9999 (§11.1.9). */
const frameNumber = (id: string) => id.slice(id.indexOf('_') + 1).padStart(4, '0');

const COMMON_RATIOS: [number, number][] = [
  [1, 1],
  [4, 5],
  [5, 4],
  [3, 4],
  [4, 3],
  [2, 3],
  [3, 2],
  [9, 16],
  [16, 9],
  [1, 2],
  [2, 1],
  [21, 9],
  [9, 21],
  [3, 1],
  [1, 3],
  [5, 7],
  [7, 5],
];

/** "4:5" for 1536 × 1920; common ratios win over exact fractions (§9.2 test information). */
export function aspectRatioLabel(width: number, height: number): string {
  const r = width / height;
  for (const [w, h] of COMMON_RATIOS) if (Math.abs(r - w / h) / (w / h) < 0.01) return `${w}:${h}`;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(width, height);
  return `${width / g}:${height / g}`;
}

/** The first sentence of a prompt, at most about 160 characters (§11.8.2 hover line). */
export function openingOf(text: string, max = 160): string {
  const first = text.split('\n')[0]!.trim();
  // Latin full stops end a sentence before a space; CJK full stops end it outright.
  const m = /^(.+?(?:[.!?](?=\s|$)|[。！？]))/u.exec(first);
  const sentence = m ? m[1]! : first;
  if (sentence.length <= max) return sentence;
  const cut = sentence.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20))}…`;
}

const TAXONOMY_KIND: Record<TaxonomyKey, TaxonomyKind> = { category: 'category', style: 'style', useCase: 'useCase' };

export function buildIndex(content: Content, config: ResolvedConfig, url: Url): BuiltContent {
  const built = config.builtLocales;
  const builtCodes = new Set(built.map((l) => l.code));
  const prefixOf = new Map(config.locales.map((l) => [l.code, l.pathPrefix]));
  const preview = config.buildMode === 'preview';

  // ---- Visibility ------------------------------------------------------------------------------

  type Vis = { visibility: Visibility; state: LocaleState; file: LocaleFile };
  /** visible[owner][locale] */
  const visible = new Map<string, Map<string, Vis>>();

  const decide = (
    owner: string,
    kind: Parameters<typeof publishProblems>[0]['kind'],
    locales: ReadonlyMap<string, LocaleFile>,
    extra: Omit<Parameters<typeof publishProblems>[0], 'content' | 'kind' | 'locale' | 'file' | 'state'>,
    eligible = true,
  ) => {
    const states = localeStates(locales);
    const map = new Map<string, Vis>();
    for (const [code, file] of locales) {
      if (!builtCodes.has(code) || !eligible) continue;
      const state = states.get(code)!;
      const status = file.fm.status;
      if (status === 'archived') continue;
      const publishable =
        status === 'published' &&
        state.review !== 'machine-draft' &&
        publishProblems({ content, kind, locale: code, file, state, ...extra }).length === 0;
      const enabled = config.locales.find((l) => l.code === code)!.enabled;
      if (publishable && enabled) map.set(code, { visibility: 'published', state, file });
      else if (preview) map.set(code, { visibility: publishable ? 'published' : 'draft', state, file });
    }
    visible.set(owner, map);
  };

  const promptTerms = (r: PromptRecord) => [
    { key: 'category' as const, id: r.data.categoryId },
    ...r.data.styleIds.map((id) => ({ key: 'style' as const, id })),
    ...r.data.useCaseIds.map((id) => ({ key: 'useCase' as const, id })),
  ];
  const templateTerms = (r: TemplateRecord) => [
    ...(r.data.categoryId ? [{ key: 'category' as const, id: r.data.categoryId }] : []),
    ...r.data.styleIds.map((id) => ({ key: 'style' as const, id })),
    ...r.data.useCaseIds.map((id) => ({ key: 'useCase' as const, id })),
  ];

  for (const r of content.prompts.values())
    decide(
      r.data.id,
      'prompt',
      r.locales,
      {
        coverAssetId: r.data.coverAssetId,
        terms: promptTerms(r),
        annotationNotes: r.data.annotations.map((a) => a.note),
      },
      // Without an image or prompt text there is nothing to show, even in preview.
      r.data.coverAssetId !== null && content.media.has(r.data.coverAssetId) && promptTextOf(content, r) !== null,
    );
  for (const r of content.templates.values())
    decide(
      r.data.id,
      'template',
      r.locales,
      { coverAssetId: null, terms: templateTerms(r), fields: r.versions.get(r.data.currentVersion)?.fields ?? [] },
      r.versions.has(r.data.currentVersion),
    );
  for (const r of content.pages.values())
    decide(`page:${r.slug}`, 'page', r.locales, { coverAssetId: null, terms: [] });

  const vis = (owner: string, locale: string) => visible.get(owner)?.get(locale) ?? null;

  // Collections and topics depend on what they contain, so they are decided after prompts.
  for (const r of content.collections.values()) {
    decide(
      r.data.id,
      'collection',
      r.locales,
      { coverAssetId: r.data.coverAssetId, terms: [] },
      content.media.has(r.data.coverAssetId),
    );
    const map = visible.get(r.data.id)!;
    for (const code of [...map.keys()])
      if (r.data.items.filter((id) => vis(id, code)).length < COLLECTION_MIN_ITEMS) map.delete(code);
  }
  const promptsOfTerm = (key: TaxonomyKey, id: string, locale: string) =>
    [...content.prompts.values()].filter(
      (p) =>
        vis(p.data.id, locale) &&
        (key === 'category'
          ? p.data.categoryId === id
          : (key === 'style' ? p.data.styleIds : p.data.useCaseIds).includes(id)),
    );
  for (const t of content.topics) {
    const owner = `topic:${t.taxonomy}:${t.termId}`;
    decide(
      owner,
      'topic',
      t.locales,
      { coverAssetId: null, terms: [{ key: t.taxonomy, id: t.termId }] },
      content.taxonomy[t.taxonomy].has(t.termId),
    );
    const map = visible.get(owner)!;
    for (const code of [...map.keys()])
      if (promptsOfTerm(t.taxonomy, t.termId, code).length < TOPIC_MIN_PROMPTS) map.delete(code);
  }

  // ---- Addresses ---------------------------------------------------------------------------------

  const prefix = (code: string) => prefixOf.get(code)!;
  const topicPath = (key: TaxonomyKey, id: string, code: string) =>
    vis(`topic:${key}:${id}`, code) ? url.paths.topic(prefix(code), TAXONOMY_FILES[key].segment, id) : null;
  const pathOf = {
    prompt: (code: string, slug: string) => url.paths.prompt(prefix(code), slug),
    template: (code: string, slug: string) => url.paths.template(prefix(code), slug),
    collection: (code: string, slug: string) => url.paths.collection(prefix(code), slug),
    page: (code: string, slug: string) => url.paths.page(prefix(code), slug),
  };

  const alternates = (owner: string, path: (code: string) => string): Alternate[] =>
    [...(visible.get(owner)?.keys() ?? [])]
      .sort((a, b) => built.findIndex((l) => l.code === a) - built.findIndex((l) => l.code === b))
      .map((code) => ({ locale: code, path: path(code) }));

  const linkPath = (link: ContentLink, code: string): string | null => {
    switch (link.kind) {
      case 'prompt': {
        const r = content.prompts.get(link.target);
        return r && vis(r.data.id, code) ? pathOf.prompt(code, r.data.slug) : null;
      }
      case 'template': {
        const r = content.templates.get(link.target);
        return r && vis(r.data.id, code) ? pathOf.template(code, r.data.slug) : null;
      }
      case 'collection': {
        const r = content.collections.get(link.target);
        return r && vis(r.data.id, code) ? pathOf.collection(code, r.data.slug) : null;
      }
      case 'page':
        return vis(`page:${link.target}`, code) ? pathOf.page(code, link.target) : null;
      default:
        return topicPath(link.kind === 'use-case' ? 'useCase' : link.kind, link.target, code);
    }
  };

  // ---- Images --------------------------------------------------------------------------------------

  const imageRef = (assetId: string, code: string, full: boolean): ImageRef => {
    const m = content.media.get(assetId)!.data;
    const ratio = m.width / m.height;
    const original: ImageVariant = { key: m.original.key, width: m.width, height: m.height, mimeType: m.mimeType };
    return {
      assetId,
      width: m.width,
      height: m.height,
      ratio,
      extreme: ratio > 2 || ratio < 0.5,
      placeholder: m.placeholder.color,
      alt: m.alt[code] ?? '',
      caption: m.caption[code] ?? null,
      variants: full
        ? {
            thumbnail: m.variants.thumbnail,
            card: m.variants.card,
            detail: m.variants.detail,
            og: m.variants.og,
            original,
          }
        : { thumbnail: m.variants.thumbnail, card: m.variants.card, detail: m.variants.detail },
      credit: m.credit,
      digitalSourceType: m.provenance.digitalSourceType,
    };
  };

  const richBody = (file: LocaleFile, code: string): { body: RichBlock[]; toc: { id: string; text: string }[] } => {
    const compiled = compileMdx(file.body, {
      file: file.file,
      resolve: {
        link: (l) => linkPath(l, code),
        figure: (id) => (content.media.has(id) ? imageRef(id, code, true) : null),
      },
    });
    return { body: compiled.blocks, toc: compiled.toc };
  };

  const translation = (v: Vis): TranslationInfo => ({
    sourceLocale: v.state.sourceLocale ?? v.file.locale,
    reviewStatus: v.state.review,
  });
  const seo = (file: LocaleFile) => ({
    title: file.fm.seoTitle ?? file.fm.title,
    description: file.fm.seoDescription ?? file.fm.description,
  });

  const termLabel = (key: TaxonomyKey, id: string, code: string) => {
    const labels = content.taxonomy[key].get(id)?.labels ?? {};
    return labels[code] ?? labels[config.defaultLocale] ?? id;
  };
  /** This locale's aliases first, then the label and aliases of every other locale (§13.2). */
  const termAliases = (term: { labels: Record<string, string>; aliases: Record<string, string[]> }, code: string) => {
    const own = term.labels[code] ?? term.labels[config.defaultLocale] ?? '';
    const words = [
      ...(term.aliases[code] ?? []),
      ...Object.entries(term.labels)
        .filter(([c]) => c !== code)
        .map(([, label]) => label),
      ...Object.entries(term.aliases)
        .filter(([c]) => c !== code)
        .flatMap(([, list]) => list),
    ];
    return [...new Set(words)].filter((w) => w !== own);
  };
  const termRef = (key: TaxonomyKey, id: string, code: string): TermRef => ({
    kind: TAXONOMY_KIND[key],
    id,
    label: termLabel(key, id, code),
    path: topicPath(key, id, code),
  });

  // ---- Summaries -----------------------------------------------------------------------------------

  const runsOfPrompt = (id: string) =>
    [...content.examples.values()]
      .filter((x) => x.data.promptId === id)
      .sort((a, b) => b.data.recordedAt.localeCompare(a.data.recordedAt) || b.data.id.localeCompare(a.data.id));
  const runsOfTemplate = (id: string) =>
    [...content.examples.values()]
      .filter((x) => x.data.template?.id === id)
      .sort((a, b) => b.data.recordedAt.localeCompare(a.data.recordedAt) || b.data.id.localeCompare(a.data.id));

  const promptSummary = (r: PromptRecord, code: string): PromptSummary => {
    const v = vis(r.data.id, code)!;
    const text = promptTextOf(content, r)!;
    const source = r.data.promptSource;
    const language =
      source.type === 'literal' ? source.language : content.templates.get(source.templateId)!.data.promptLanguage;
    return {
      kind: 'prompt',
      id: r.data.id,
      slug: r.data.slug,
      locale: code,
      path: pathOf.prompt(code, r.data.slug),
      title: v.file.fm.title,
      description: v.file.fm.description,
      visibility: v.visibility,
      createdAt: r.data.createdAt,
      updatedAt: v.file.fm.updatedAt > r.data.updatedAt ? v.file.fm.updatedAt : r.data.updatedAt,
      frameNumber: frameNumber(r.data.id),
      cover: imageRef(r.data.coverAssetId!, code, false),
      categoryId: r.data.categoryId,
      styleIds: r.data.styleIds,
      useCaseIds: r.data.useCaseIds,
      model: { displayName: r.data.model.displayName, providerModelId: r.data.model.providerModelId },
      verification: r.data.model.verification,
      lastTestedAt: runsOfPrompt(r.data.id)[0]?.data.recordedAt ?? null,
      promptLanguage: language,
      promptOpening: openingOf(text),
      annotated: r.data.annotations.length > 0,
    };
  };

  const templateCover = (r: TemplateRecord) => {
    const runs = runsOfTemplate(r.data.id);
    const preferred =
      runs.find((x) => x.data.template!.version === r.data.currentVersion && x.data.template!.sample === 'default') ??
      runs[0];
    return preferred?.data.outputAssetIds[0] ?? null;
  };

  const templateSummary = (r: TemplateRecord, code: string): TemplateSummary => {
    const v = vis(r.data.id, code)!;
    const version = r.versions.get(r.data.currentVersion)!;
    const cover = templateCover(r);
    return {
      kind: 'template',
      id: r.data.id,
      slug: r.data.slug,
      locale: code,
      path: pathOf.template(code, r.data.slug),
      title: v.file.fm.title,
      description: v.file.fm.description,
      visibility: v.visibility,
      createdAt: r.data.createdAt,
      updatedAt: v.file.fm.updatedAt > r.data.updatedAt ? v.file.fm.updatedAt : r.data.updatedAt,
      cover: cover && content.media.has(cover) ? imageRef(cover, code, false) : null,
      currentVersion: r.data.currentVersion,
      fieldCount: version.fields.length,
      promptLanguage: r.data.promptLanguage,
      bodyExcerpt: openingOf(version.body, 200),
    };
  };

  const collectionSummary = (id: string, code: string): CollectionSummary => {
    const r = content.collections.get(id)!;
    const v = vis(id, code)!;
    return {
      kind: 'collection',
      id,
      slug: r.data.slug,
      locale: code,
      path: pathOf.collection(code, r.data.slug),
      title: v.file.fm.title,
      description: v.file.fm.description,
      visibility: v.visibility,
      createdAt: r.data.createdAt,
      updatedAt: v.file.fm.updatedAt > r.data.updatedAt ? v.file.fm.updatedAt : r.data.updatedAt,
      cover: imageRef(r.data.coverAssetId, code, false),
      itemCount: r.data.items.filter((item) => vis(item, code)).length,
    };
  };

  const newestFirst = <T extends { createdAt: string; id: string }>(a: T, b: T) =>
    b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);

  // ---- Per locale ----------------------------------------------------------------------------------

  const locales = new Map<string, LocaleIndex>();
  const details: BuiltContent['details'] = [];

  for (const locale of built) {
    const code = locale.code;
    const prompts = [...content.prompts.values()]
      .filter((r) => vis(r.data.id, code))
      .map((r) => promptSummary(r, code))
      .sort(newestFirst);
    const promptById = new Map(prompts.map((p) => [p.id, p]));
    const templates = [...content.templates.values()]
      .filter((r) => vis(r.data.id, code))
      .map((r) => templateSummary(r, code))
      .sort(newestFirst);
    const templateById = new Map(templates.map((t) => [t.id, t]));
    const collections = [...content.collections.values()]
      .filter((r) => vis(r.data.id, code))
      .map((r) => collectionSummary(r.data.id, code))
      .sort(newestFirst);

    const terms: Term[] = [];
    for (const key of Object.keys(TAXONOMY_FILES) as TaxonomyKey[])
      for (const term of content.taxonomy[key].values())
        terms.push({
          kind: TAXONOMY_KIND[key],
          id: term.id,
          label: termLabel(key, term.id, code),
          aliases: termAliases(term, code),
          count: promptsOfTerm(key, term.id, code).length,
          path: topicPath(key, term.id, code),
        });

    // Prompt details
    for (const r of content.prompts.values()) {
      const v = vis(r.data.id, code);
      if (!v) continue;
      const summary = promptById.get(r.data.id)!;
      const text = promptTextOf(content, r)!;
      const annotations: Annotation[] = r.data.annotations
        .map((a) => ({ a, start: text.indexOf(a.phrase) }))
        .filter((x) => x.start >= 0)
        .sort((x, y) => x.start - y.start)
        .map(({ a, start }, i) => ({
          letter: String.fromCharCode(65 + i),
          phrase: a.phrase,
          start,
          end: start + a.phrase.length,
          region: a.region,
          note: a.note[code] ?? '',
        }));
      const examples = runsOfPrompt(r.data.id).map((x) => exampleView(x.data.id, code));
      const score = (p: PromptRecord) =>
        (p.data.categoryId === r.data.categoryId ? 3 : 0) +
        2 * p.data.styleIds.filter((s) => r.data.styleIds.includes(s)).length +
        2 * p.data.useCaseIds.filter((u) => r.data.useCaseIds.includes(u)).length;
      const similar = [...content.prompts.values()]
        .filter((p) => p.data.id !== r.data.id && vis(p.data.id, code) && score(p) > 0)
        .sort((a, b) => score(b) - score(a) || newestFirst(a.data, b.data))
        .slice(0, SIMILAR_LIMIT)
        .map((p) => promptById.get(p.data.id)!);
      const source = r.data.promptSource;
      const model: PromptDetail = {
        ...summary,
        cover: imageRef(r.data.coverAssetId!, code, true),
        seo: seo(v.file),
        ...richBody(v.file, code),
        prompt: {
          text,
          language: summary.promptLanguage,
          characters: graphemeLength(text),
          lines: text.split('\n').length,
        },
        annotations,
        test: {
          model: summary.model,
          verification: summary.verification,
          recordedOutput: examples.some((run) => run.prompt === text && run.outputs.length > 0),
          lastTestedAt: summary.lastTestedAt,
          aspectRatio: aspectRatioLabel(summary.cover.width, summary.cover.height),
          referenceImage: inputRequirementsOf(content, r).referenceImage,
        },
        examples,
        source: r.data.source,
        promptProvenance: r.data.promptProvenance,
        inspirationSources: r.data.inspirationSources.map((source) => ({
          ...source,
          metricScope: source.metricScope[code] ?? '',
          evidenceMethod: source.evidenceMethod[code] ?? '',
          sourcePromptStatus: source.sourcePromptStatus[code] ?? '',
          metrics: source.metrics.map(({ key, value, labels }) => ({ key, value, label: labels[code] ?? key })),
        })),
        inputInstructions: inputRequirementsOf(content, r).instructions[code] ?? null,
        showcaseExampleId: r.data.showcaseExampleId,
        template:
          source.type === 'template' ? { id: source.templateId, version: source.version, values: source.values } : null,
        taxonomy: {
          category: termRef('category', r.data.categoryId, code),
          styles: r.data.styleIds.map((id) => termRef('style', id, code)),
          useCases: r.data.useCaseIds.map((id) => termRef('useCase', id, code)),
        },
        relatedTemplates: [
          ...new Set([...r.data.relatedTemplateIds, ...(source.type === 'template' ? [source.templateId] : [])]),
        ]
          .map((id) => templateById.get(id))
          .filter((t): t is TemplateSummary => !!t),
        similar,
        collections: collections.filter((c) => content.collections.get(c.id)!.data.items.includes(r.data.id)),
        alternates: alternates(r.data.id, (c) => pathOf.prompt(c, r.data.slug)),
        translation: translation(v),
      };
      details.push({ kind: 'prompt', locale: code, key: r.data.id, model });
    }

    // Template details
    for (const r of content.templates.values()) {
      const v = vis(r.data.id, code);
      if (!v) continue;
      const version = r.versions.get(r.data.currentVersion)!;
      const spec = versionSpec(version);
      const label = (labels: Record<string, string>) =>
        labels[code] ?? labels[config.defaultLocale] ?? Object.values(labels)[0] ?? '';
      const fields: LocalizedField[] = version.fields.map((f) => ({
        ...toFieldSpec(f),
        label: label(f.labels),
        help: f.help[code] ?? null,
        groupLabel: f.group ? label(content.fieldGroups.get(f.group)?.labels ?? {}) || null : null,
        optionLabels: f.type === 'enum' ? Object.fromEntries(f.options.map((o) => [o.value, label(o.labels)])) : {},
      }));
      const samples = [...version.samples].map(([name, s]) => ({
        name,
        values: s.values,
        exampleIds: runsOfTemplate(r.data.id)
          .filter((run) => {
            const t = run.data.template;
            const rendered = renderTemplate(spec, s.values).text;
            return (
              t?.version === version.id &&
              t.sample === name &&
              rendered !== null &&
              run.data.promptSha256 === sha256(rendered) &&
              run.prompt === rendered &&
              sameValues(t.values, resolveValues(spec.fields, s.values), spec.fields)
            );
          })
          .map((run) => run.data.id),
      }));
      const defaultValues = version.samples.get('default')?.values ?? {};
      const model: TemplateDetail = {
        ...templateById.get(r.data.id)!,
        cover: (() => {
          const id = templateCover(r);
          return id && content.media.has(id) ? imageRef(id, code, true) : null;
        })(),
        seo: seo(v.file),
        ...richBody(v.file, code),
        inputInstructions: version.inputs?.instructions[code] ?? null,
        version: {
          id: version.id,
          body: version.body,
          fields,
          samples,
          defaultPrompt: renderTemplate(spec, defaultValues).text ?? '',
        },
        versions: [...r.versions.keys()].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))),
        examples: runsOfTemplate(r.data.id).map((x) => exampleView(x.data.id, code)),
        relatedPrompts: prompts.filter((p) => {
          const pr = content.prompts.get(p.id)!.data;
          return (
            pr.relatedTemplateIds.includes(r.data.id) ||
            (pr.promptSource.type === 'template' && pr.promptSource.templateId === r.data.id)
          );
        }),
        taxonomy: {
          category: r.data.categoryId ? termRef('category', r.data.categoryId, code) : null,
          styles: r.data.styleIds.map((id) => termRef('style', id, code)),
          useCases: r.data.useCaseIds.map((id) => termRef('useCase', id, code)),
        },
        alternates: alternates(r.data.id, (c) => pathOf.template(c, r.data.slug)),
        translation: translation(v),
      };
      details.push({ kind: 'template', locale: code, key: r.data.id, model });
    }

    // Collection details
    for (const r of content.collections.values()) {
      const v = vis(r.data.id, code);
      if (!v) continue;
      const items: CollectionItem[] = [];
      for (const id of r.data.items) {
        const reason = v.file.fm.reasons?.[id] ?? null;
        const p = promptById.get(id);
        const t = templateById.get(id);
        if (p) items.push({ kind: 'prompt', entry: p, reason });
        else if (t) items.push({ kind: 'template', entry: t, reason });
      }
      const model: CollectionDetail = {
        ...collectionSummary(r.data.id, code),
        cover: imageRef(r.data.coverAssetId, code, true),
        seo: seo(v.file),
        ...richBody(v.file, code),
        items,
        alternates: alternates(r.data.id, (c) => pathOf.collection(c, r.data.slug)),
        translation: translation(v),
      };
      details.push({ kind: 'collection', locale: code, key: r.data.id, model });
    }

    // Topic details
    const topics: TopicDetail[] = [];
    for (const t of content.topics) {
      const owner = `topic:${t.taxonomy}:${t.termId}`;
      const v = vis(owner, code);
      if (!v) continue;
      const termPrompts = promptsOfTerm(t.taxonomy, t.termId, code)
        .map((p) => promptById.get(p.data.id)!)
        .sort(newestFirst);
      const path = topicPath(t.taxonomy, t.termId, code)!;
      const model: TopicDetail = {
        kind: 'topic',
        taxonomy: TAXONOMY_KIND[t.taxonomy],
        id: t.termId,
        slug: t.termId,
        locale: code,
        path,
        title: v.file.fm.title,
        description: v.file.fm.description,
        visibility: v.visibility,
        createdAt: v.file.fm.updatedAt,
        updatedAt: v.file.fm.updatedAt,
        cover: termPrompts[0] ? imageRef(termPrompts[0].cover.assetId, code, true) : null,
        promptCount: termPrompts.length,
        seo: seo(v.file),
        ...richBody(v.file, code),
        prompts: termPrompts,
        alternates: alternates(owner, (c) => topicPath(t.taxonomy, t.termId, c)!),
        translation: translation(v),
      };
      topics.push(model);
      details.push({ kind: 'topic', locale: code, key: `${t.taxonomy}/${t.termId}`, model });
    }

    // Page details
    const pages: PageDetail[] = [];
    for (const page of content.pages.values()) {
      const owner = `page:${page.slug}`;
      const v = vis(owner, code);
      if (!v) continue;
      const model: PageDetail = {
        kind: 'page',
        id: page.slug,
        slug: page.slug,
        locale: code,
        path: pathOf.page(code, page.slug),
        title: v.file.fm.title,
        description: v.file.fm.description,
        visibility: v.visibility,
        createdAt: v.file.fm.updatedAt,
        updatedAt: v.file.fm.updatedAt,
        seo: seo(v.file),
        ...richBody(v.file, code),
        alternates: alternates(owner, (c) => pathOf.page(c, page.slug)),
        translation: translation(v),
      };
      pages.push(model);
      details.push({ kind: 'page', locale: code, key: page.slug, model });
    }

    const strip = <T extends object, K extends keyof T>(o: T, keys: K[]): Omit<T, K> => {
      const copy = { ...o };
      for (const k of keys) delete copy[k];
      return copy;
    };
    locales.set(code, {
      locale: code,
      prompts,
      templates,
      collections,
      topics: topics.map((t) => strip(t, ['seo', 'body', 'toc', 'prompts', 'alternates', 'translation'])),
      pages: pages.map((p) => strip(p, ['seo', 'body', 'toc', 'alternates', 'translation'])),
      terms,
    });
  }

  function exampleView(id: string, code: string): ExampleRunView {
    const x = content.examples.get(id)!;
    const d = x.data;
    return {
      id: d.id,
      recordedAt: d.recordedAt,
      provider: d.provider,
      model: d.model,
      template: d.template,
      prompt: x.prompt ?? '',
      promptSha256: d.promptSha256,
      parameters: Object.entries(d.parameters).map(([name, value]) => ({ name, value })),
      referenceLabels: d.referenceAssetIds.map((_, index) => {
        const binding = d.referenceBindings.find((b) => b.referenceIndex === index);
        const slot = runInputRequirements(content, d).slots.find((s) => s.id === binding?.slotId);
        return slot ? (slot.labels[code] ?? '') : '';
      }),
      references: d.referenceAssetIds.filter((a) => content.media.has(a)).map((a) => imageRef(a, code, true)),
      outputs: d.outputAssetIds.filter((a) => content.media.has(a)).map((a) => imageRef(a, code, true)),
      notes: d.notes[code] ?? null,
    };
  }

  return { manifest: manifest(content, config, url, built, vis, locales), locales, details };
}

function manifest(
  content: Content,
  config: ResolvedConfig,
  url: Url,
  built: readonly LocaleEntry[],
  vis: (owner: string, code: string) => unknown,
  locales: Map<string, LocaleIndex>,
): ContentManifest {
  const redirects: ContentManifest['redirects'] = [];
  const gone: ContentManifest['gone'] = [];
  const kindPath = {
    prompt: (p: string, slug: string) => url.paths.prompt(p, slug),
    template: (p: string, slug: string) => url.paths.template(p, slug),
    collection: (p: string, slug: string) => url.paths.collection(p, slug),
  };
  const slugOf = (kind: 'prompt' | 'template' | 'collection', id: string) =>
    (kind === 'prompt'
      ? content.prompts.get(id)
      : kind === 'template'
        ? content.templates.get(id)
        : content.collections.get(id)
    )?.data.slug;
  const builtHomes = new Set(built.map((l) => url.paths.home(l.pathPrefix)));

  for (const item of content.redirects?.redirects ?? []) {
    if ('kind' in item) {
      const slug = slugOf(item.kind, item.to);
      if (!slug) continue;
      for (const l of built)
        if (vis(item.to, l.code))
          redirects.push({
            from: kindPath[item.kind](l.pathPrefix, item.from),
            to: kindPath[item.kind](l.pathPrefix, slug),
          });
    } else {
      // A fixed path is kept when its target is a built locale's address (or outside any locale).
      const firstSegment = `/${item.to.split('/')[1]}/`;
      const targetsLocale = config.locales.some((l) => `/${l.pathPrefix}/` === firstSegment);
      if (!targetsLocale || builtHomes.has(firstSegment)) redirects.push({ from: item.from, to: item.to });
    }
  }
  // Page 1 of a list is the list itself; its duplicate address redirects there (§9.4).
  for (const l of built)
    redirects.push({ from: `${url.paths.prompts(l.pathPrefix)}page/1/`, to: url.paths.prompts(l.pathPrefix) });
  const redirected = new Set(redirects.map((r) => r.from));
  for (const item of content.redirects?.gone ?? [])
    for (const l of built)
      gone.push({ path: kindPath[item.kind](l.pathPrefix, item.slug), locale: l.code, reason: item.reason });

  // An archived locale version answers 410 unless a redirect covers its address (§9.5).
  const archived = (
    kind: 'prompt' | 'template' | 'collection',
    slug: string,
    locs: ReadonlyMap<string, LocaleFile>,
  ) => {
    for (const l of built) {
      const path = kindPath[kind](l.pathPrefix, slug);
      if (locs.get(l.code)?.fm.status === 'archived' && !redirected.has(path))
        gone.push({ path, locale: l.code, reason: 'archived' });
    }
  };
  for (const r of content.prompts.values()) archived('prompt', r.data.slug, r.locales);
  for (const r of content.templates.values()) archived('template', r.data.slug, r.locales);
  for (const r of content.collections.values()) archived('collection', r.data.slug, r.locales);

  const counts: ContentManifest['counts'] = {};
  for (const [code, index] of locales)
    counts[code] = {
      prompt: index.prompts.length,
      template: index.templates.length,
      collection: index.collections.length,
      topic: index.topics.length,
      page: index.pages.length,
    };

  return {
    buildId: config.buildId,
    buildMode: config.buildMode,
    locales: built.map((l) => l.code),
    redirects,
    gone,
    counts,
  };
}
