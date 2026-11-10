import { renderTemplate } from '../../../src/modules/template/render';
import type { FieldSpec, FieldValues, TemplateVersionSpec } from '../../../src/modules/template/types';
import type { ReviewStatus } from '../../../src/modules/content/types';
import type { ContentLink } from './mdx';
import type { Content, LocaleFile, PromptRecord, TaxonomyKey, TemplateVersion } from './read';
import { inputRequirementsSchema, type FieldSource, type ExampleRunSource } from './schemas';

// Publishing rules shared by validation (which reports them) and the index (which uses them to
// decide what each build shows). Design doc §8.4, §8.5, §9.1.

/** A taxonomy topic page needs at least this many visible prompts in its locale (§9.1). */
export const TOPIC_MIN_PROMPTS = 3;
/** A collection page needs at least this many visible items in its locale (§11.8.5). */
export const COLLECTION_MIN_ITEMS = 2;

export type Problem = { message: string; fix?: string; line?: number; field?: string };

export type LocaleState = {
  isSource: boolean;
  sourceLocale: string | null;
  review: ReviewStatus;
  /** A reviewed translation whose source changed since review (§8.5). */
  outdated: boolean;
  /** The hash a reviewer writes into translation.sourceHash after updating. */
  currentSourceHash: string | null;
};

/** Which locale file is the source and how each translation relates to it (§8.4, §8.5). */
export function localeStates(locales: ReadonlyMap<string, LocaleFile>): Map<string, LocaleState> {
  const sources = [...locales.values()].filter((f) => !f.fm.translation);
  const source = sources.length === 1 ? sources[0]! : null;
  const states = new Map<string, LocaleState>();
  for (const [code, file] of locales) {
    const t = file.fm.translation;
    if (!t) {
      states.set(code, {
        isSource: true,
        sourceLocale: code,
        review: 'source',
        outdated: false,
        currentSourceHash: null,
      });
      continue;
    }
    const sourceFile = locales.get(t.sourceLocale);
    const currentSourceHash = sourceFile && !sourceFile.fm.translation ? sourceFile.contentHash : null;
    const changed = currentSourceHash !== null && currentSourceHash !== t.sourceHash;
    const review: ReviewStatus = t.reviewStatus === 'reviewed' && changed ? 'outdated' : t.reviewStatus;
    states.set(code, {
      isSource: false,
      sourceLocale: source?.locale ?? t.sourceLocale,
      review,
      outdated: review === 'outdated',
      currentSourceHash,
    });
  }
  return states;
}

export function sourceLocaleOf(locales: ReadonlyMap<string, LocaleFile>): string | null {
  const sources = [...locales.values()].filter((f) => !f.fm.translation);
  return sources.length === 1 ? sources[0]!.locale : null;
}

export const versionSpec = (version: TemplateVersion): TemplateVersionSpec => ({
  body: version.body,
  fields: version.fields.map(toFieldSpec),
});

export function toFieldSpec(field: FieldSource): FieldSpec {
  const { labels: _labels, help: _help, ...rest } = field;
  void _labels;
  void _help;
  if (rest.type === 'enum') return { ...rest, options: rest.options.map(({ value, swatch }) => ({ value, swatch })) };
  return rest;
}

/** The prompt a prompt entry shows: prompt.txt, or its template version rendered (§5.2). */
export function promptTextOf(content: Content, rec: PromptRecord): string | null {
  const source = rec.data.promptSource;
  if (source.type === 'literal') return rec.promptText;
  const version = content.templates.get(source.templateId)?.versions.get(source.version);
  return version ? renderTemplate(versionSpec(version), source.values).text : null;
}

/** Locale files of the entry a content link points at, or null when it does not exist. */
export function linkTargetLocales(content: Content, link: ContentLink): ReadonlyMap<string, LocaleFile> | null {
  switch (link.kind) {
    case 'prompt':
      return content.prompts.get(link.target)?.locales ?? null;
    case 'template':
      return content.templates.get(link.target)?.locales ?? null;
    case 'collection':
      return content.collections.get(link.target)?.locales ?? null;
    case 'page':
      return content.pages.get(link.target)?.locales ?? null;
    default: {
      const key: TaxonomyKey = link.kind === 'use-case' ? 'useCase' : link.kind;
      if (!content.taxonomy[key].has(link.target)) return null;
      return content.topics.find((t) => t.taxonomy === key && t.termId === link.target)?.locales ?? new Map();
    }
  }
}

type PublishContext = {
  content: Content;
  kind: 'prompt' | 'template' | 'collection' | 'page' | 'topic';
  locale: string;
  file: LocaleFile;
  state: LocaleState;
  coverAssetId: string | null;
  /** Taxonomy terms the entry uses: their labels must exist in the locale. */
  terms: { key: TaxonomyKey; id: string }[];
  /** Prompt annotations: their notes must exist in the locale. */
  annotationNotes?: Record<string, string>[];
  /** Template fields: their labels must exist in the locale. */
  fields?: FieldSource[];
};

/**
 * Why a locale version marked `published` cannot be published (§8.4 rules 2–6). Empty when it
 * can. The locale's registry state (rule 1) is a build matter, not a content error.
 */
export function publishProblems(p: PublishContext): Problem[] {
  const problems: Problem[] = [];
  const { content, locale, file } = p;
  const mediaFile = (id: string) => `content/media/${id}.yaml`;

  if (p.state.review === 'machine-draft')
    problems.push({
      message: 'machine translations are published only after review (§8.4)',
      fix: 'after a reviewer checks it, set translation.reviewStatus: reviewed; until then keep status: draft',
      field: 'translation.reviewStatus',
    });
  if (!p.state.isSource && p.state.sourceLocale === null)
    problems.push({
      message: 'the entry has no single source-language file',
      fix: 'exactly one locale file has no translation block',
    });

  if (!file.fm.description)
    problems.push({
      message:
        'description is required to publish: the one-sentence summary of what it makes and when to use it (§9.2)',
      field: 'description',
    });

  if (p.kind === 'prompt' || p.kind === 'template') {
    if (!file.compiled.sections.some((s) => s.hasContent))
      problems.push({
        message: 'the body needs at least one ## section with text, such as how to use or adjust it (§8.4 rule 4)',
        fix: 'add a section like "## How to adjust it" with a few sentences in this language',
      });
  } else if (!file.compiled.text.trim()) {
    problems.push({ message: 'the body is empty', fix: 'write the page text below the frontmatter' });
  }

  if (p.coverAssetId) {
    const media = content.media.get(p.coverAssetId);
    if (media && !media.data.alt[locale])
      problems.push({
        message: `the cover image has no ${locale} description (alt) (§8.4 rule 3)`,
        fix: `add alt.${locale} to ${mediaFile(p.coverAssetId)}`,
      });
  } else if (p.kind === 'prompt') {
    problems.push({
      message: 'the prompt has no cover image',
      fix: 'import one with `npm run media:import` and set coverAssetId',
    });
  }

  for (const { key, id } of p.terms) {
    const term = content.taxonomy[key].get(id);
    if (term && !term.labels[locale])
      problems.push({
        message: `${key} "${id}" has no ${locale} label`,
        fix: `add labels.${locale} to ${term.file.replace(/^.*?content\//, 'content/')}`,
      });
  }

  p.annotationNotes?.forEach((note, i) => {
    if (!note[locale])
      problems.push({
        message: `annotation ${i + 1} has no ${locale} note (§5.2)`,
        fix: `add note.${locale} to annotations[${i}] in entry.yaml`,
      });
  });

  for (const field of p.fields ?? []) {
    if (!field.labels[locale])
      problems.push({
        message: `field "${field.name}" has no ${locale} label (§8.5)`,
        fix: `add labels.${locale} in fields.yaml`,
      });
    if (field.type === 'enum')
      for (const o of field.options)
        if (!o.labels[locale])
          problems.push({
            message: `option "${o.value}" of "${field.name}" has no ${locale} label`,
            fix: `add labels.${locale} in fields.yaml`,
          });
    if (field.group) {
      const group = content.fieldGroups.get(field.group);
      if (group && !group.labels[locale])
        problems.push({
          message: `field group "${field.group}" has no ${locale} label`,
          fix: `add labels.${locale} in content/taxonomy/field-groups.yaml`,
        });
    }
  }

  for (const link of file.compiled.links) {
    const target = linkTargetLocales(content, link);
    const local = target?.get(locale);
    const published = (f: LocaleFile) => f.fm.status === 'published' && f.fm.translation?.reviewStatus !== 'machine-draft';
    const available = local && published(local) ||
      (link.kind !== 'page' && local?.fm.status !== 'archived' && [...(target?.values() ?? [])].some(published));
    if (target && !available)
      problems.push({
        message: `links to ${link.kind}:${link.target}, which is not published in ${locale}`,
        fix: 'publish the target (a shared library version or a page in this language), or remove the link',
        line: link.line,
      });
  }

  // The page renders figures and all historical run images, not just its cover.
  const assets = new Set(file.compiled.figures.map((figure) => figure.assetId));
  const owner =
    p.kind === 'prompt'
      ? [...content.prompts.values()].find((r) => r.locales.get(locale) === file)
      : p.kind === 'template'
        ? [...content.templates.values()].find((r) => r.locales.get(locale) === file)
        : null;
  const contracts = [];
  if (owner && p.kind === 'prompt') {
    const prompt = content.prompts.get(owner.data.id)!;
    contracts.push(inputRequirementsOf(content, prompt));
  }
  if (owner && p.kind === 'template') {
    const template = content.templates.get(owner.data.id)!;
    const inputs = template.versions.get(template.data.currentVersion)?.inputs;
    if (inputs) contracts.push(inputs);
  }
  for (const run of content.examples.values()) {
    if (
      !owner ||
      !(p.kind === 'prompt' ? run.data.promptId === owner.data.id : run.data.template?.id === owner.data.id)
    )
      continue;
    for (const id of [...run.data.referenceAssetIds, ...run.data.outputAssetIds]) assets.add(id);
    contracts.push(runInputRequirements(content, run.data));
  }
  for (const id of assets)
    if (!content.media.get(id)?.data.alt[locale]?.trim())
      problems.push({
        message: `displayed image ${id} has no ${locale} alt`,
        field: `media.${id}.alt.${locale}`,
        fix: `add semantic alt.${locale} to ${mediaFile(id)}`,
      });
  for (const inputs of new Set(contracts)) {
    if (inputs.referenceImage === 'required' && !inputs.instructions[locale]?.trim())
      problems.push({
        message: `required reference input has no ${locale} instructions`,
        field: `inputRequirements.instructions.${locale}`,
        fix: 'describe the required input in this language',
      });
    for (const slot of inputs.slots)
      if (!slot.labels[locale]?.trim())
        problems.push({
          message: `reference slot ${slot.id} has no ${locale} label`,
          field: `inputRequirements.slots.${slot.id}.labels.${locale}`,
          fix: 'translate the reference slot label',
        });
  }
  return problems;
}

/** Plain field values equal, ignoring key order and surrounding space. */
export function sameValues(a: FieldValues, b: FieldValues, fields: readonly FieldSpec[]): boolean {
  const norm = (v: string | string[] | undefined) => (Array.isArray(v) ? v.map((x) => x.trim()) : (v?.trim() ?? null));
  return fields.every((f) => JSON.stringify(norm(a[f.name])) === JSON.stringify(norm(b[f.name])));
}

/** Template instances inherit the immutable version input contract. */
export function inputRequirementsOf(content: Content, rec: PromptRecord) {
  const source = rec.data.promptSource;
  return (
    (source.type === 'template'
      ? content.templates.get(source.templateId)?.versions.get(source.version)?.inputs
      : null) ?? rec.data.inputRequirements
  );
}

export function runInputRequirements(content: Content, run: ExampleRunSource) {
  const version = run.template && content.templates.get(run.template.id)?.versions.get(run.template.version);
  const owner = run.promptId && content.prompts.get(run.promptId);
  return version?.inputs ?? (owner ? inputRequirementsOf(content, owner) : inputRequirementsSchema.parse({}));
}
