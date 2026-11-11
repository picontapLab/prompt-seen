import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { Content, LocaleFile } from '../content/read';
import type { EntryKind } from '../../../src/modules/content/types';
import { fingerprint, entityFingerprint } from './fingerprint';
import { localeStates, publishProblems } from '../content/rules';

export type Field = {
  reviewStatus?: string;
  identity?: string;
  key: string;
  file: string;
  sourceFile: string;
  sourceField: (string | number)[];
  targetField: (string | number)[];
  sourceLocale: string;
  source: unknown;
  target: unknown;
  sourceHash: string;
  targetHash: string | null;
};
export type Unit = { key: string; kind: EntryKind; id: string; dir: string; locales: Map<string, LocaleFile> };

/** Uses the same publication contract as validation, without relying on a fallback route. */
export function unitPublishProblems(content: Content, unit: Unit, locale: string) {
  const file = unit.locales.get(locale);
  if (!file) return [];
  const prompt = unit.kind === 'prompt' ? content.prompts.get(unit.id) : undefined;
  const template = unit.kind === 'template' ? content.templates.get(unit.id) : undefined;
  const collection = unit.kind === 'collection' ? content.collections.get(unit.id) : undefined;
  const topic = unit.kind === 'topic' ? content.topics.find((t) => `${t.taxonomy}/${t.termId}` === unit.id) : undefined;
  const data = prompt?.data ?? template?.data;
  const terms = data
    ? [
        ...(data.categoryId ? [{ key: 'category' as const, id: data.categoryId }] : []),
        ...data.styleIds.map((id) => ({ key: 'style' as const, id })),
        ...data.useCaseIds.map((id) => ({ key: 'useCase' as const, id })),
      ]
    : topic
      ? [{ key: topic.taxonomy, id: topic.termId }]
      : [];
  return publishProblems({
    content,
    kind: unit.kind,
    locale,
    file,
    state: localeStates(unit.locales).get(locale)!,
    coverAssetId: prompt?.data.coverAssetId ?? collection?.data.coverAssetId ?? null,
    terms,
    annotationNotes: prompt?.data.annotations.map((a) => a.note),
    fields: template?.versions.get(template.data.currentVersion)?.fields,
  });
}

export function unitsOf(content: Content): Unit[] {
  return [
    ...[...content.prompts.values()].map((r) => ({ kind: 'prompt' as const, id: r.data.id, ...r })),
    ...[...content.templates.values()].map((r) => ({ kind: 'template' as const, id: r.data.id, ...r })),
    ...[...content.collections.values()].map((r) => ({ kind: 'collection' as const, id: r.data.id, ...r })),
    ...[...content.pages.values()].map((r) => ({ kind: 'page' as const, id: r.slug, ...r })),
    ...content.topics.map((r) => ({ kind: 'topic' as const, id: `${r.taxonomy}/${r.termId}`, ...r })),
  ].map(({ kind, id, dir, locales }) => ({ key: `${kind}/${id}`, kind, id, dir, locales }));
}

// Only these schema-defined maps contain editable explanatory text. Values, sample parameters,
// annotation phrases, model/evidence facts and template contracts never enter the allowlist.
const TEXT_MAPS = new Set([
  'labels',
  'help',
  'alt',
  'caption',
  'instructions',
  'note',
  'notes',
  'metricScope',
  'evidenceMethod',
  'sourcePromptStatus',
  'aliases',
]);

const documents = new WeakMap<Content, Map<string, unknown>>();

export function dependencyFields(
  root: string,
  content: Content,
  unit: Unit,
  locale: string,
  defaultLocale: string,
): Field[] {
  const files = new Map<string, Set<string> | null>();
  const add = (file: string, termId?: string) => {
    if (!termId) {
      files.set(file, null);
      return;
    }
    if (files.get(file) === null) return;
    const ids = files.get(file) ?? new Set<string>();
    ids.add(termId);
    files.set(file, ids);
  };
  const asset = (id: string | null | undefined) => {
    const r = id && content.media.get(id);
    if (r) add(r.file);
  };
  const version = (id: string, name: string, fields: boolean) => {
    const v = content.templates.get(id)?.versions.get(name);
    if (!v) return;
    if (fields) {
      add(v.fieldsFile);
      for (const field of v.fields)
        if (field.group) {
          const group = content.fieldGroups.get(field.group);
          if (group) add(group.file, group.id);
        }
    }
    if (v.inputs) add(path.join(v.dir, 'inputs.yaml'));
  };
  const terms = (data: { categoryId: string | null; styleIds: string[]; useCaseIds: string[] }) => {
    for (const [key, ids] of [
      ['category', [data.categoryId]],
      ['style', data.styleIds],
      ['useCase', data.useCaseIds],
    ] as const)
      for (const id of ids) {
        const term = id && content.taxonomy[key].get(id);
        if (term) add(term.file, term.id);
      }
  };
  const prompt = unit.kind === 'prompt' ? content.prompts.get(unit.id) : undefined;
  const template = unit.kind === 'template' ? content.templates.get(unit.id) : undefined;
  if (prompt) {
    add(prompt.file);
    asset(prompt.data.coverAssetId);
    terms(prompt.data);
    const source = prompt.data.promptSource;
    if (source.type === 'template') version(source.templateId, source.version, false);
  }
  if (template) {
    terms(template.data);
    version(template.data.id, template.data.currentVersion, true);
  }
  if (unit.kind === 'collection') asset(content.collections.get(unit.id)?.data.coverAssetId);
  if (unit.kind === 'topic') {
    const topic = content.topics.find((t) => `${t.taxonomy}/${t.termId}` === unit.id);
    if (topic) {
      const term = content.taxonomy[topic.taxonomy].get(topic.termId);
      if (term) add(term.file, term.id);
    }
  }
  for (const file of unit.locales.values()) for (const fig of file.compiled.figures) asset(fig.assetId);
  for (const run of content.examples.values()) {
    if (!((prompt && run.data.promptId === unit.id) || (template && run.data.template?.id === unit.id))) continue;
    add(run.file);
    for (const id of run.data.outputAssetIds) asset(id);
    for (const id of run.data.referenceAssetIds) asset(id);
    if (run.data.template) version(run.data.template.id, run.data.template.version, false);
    else if (run.data.promptId) {
      const owner = content.prompts.get(run.data.promptId);
      if (owner) add(owner.file);
    }
  }
  return fieldsFromFiles(root, content, files, locale, defaultLocale);
}

/** Taxonomy labels and aliases are visible in global filters/search even without a member. */
export function globalDependencyFields(root: string, content: Content, locale: string, defaultLocale: string): Field[] {
  const files = new Map<string, Set<string> | null>();
  for (const terms of [...Object.values(content.taxonomy), content.fieldGroups])
    for (const term of terms.values()) files.set(term.file, null);
  return fieldsFromFiles(root, content, files, locale, defaultLocale);
}

function fieldsFromFiles(
  root: string,
  content: Content,
  files: Map<string, Set<string> | null>,
  locale: string,
  defaultLocale: string,
): Field[] {
  const result: Field[] = [];
  let cached = documents.get(content);
  if (!cached) {
    cached = new Map();
    documents.set(content, cached);
  }
  for (const [file, termIds] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    if (!cached.has(file)) cached.set(file, YAML.parse(fs.readFileSync(file, 'utf8')));
    const raw = cached.get(file);
    const relative = path.relative(root, file);
    const walk = (value: unknown, parts: (string | number)[]) => {
      if (Array.isArray(value)) {
        value.forEach((v, i) => walk(v, [...parts, i]));
        return;
      }
      if (!value || typeof value !== 'object') return;
      const record = value as Record<string, unknown>;
      const name = String(parts.at(-1));
      if (TEXT_MAPS.has(name)) {
        // Shared text has one deterministic source, independent of the referring page language.
        const sourceLocale = Object.hasOwn(record, defaultLocale) ? defaultLocale : Object.keys(record).sort()[0];
        if (!sourceLocale) return;
        const source = record[sourceLocale];
        if (source === null || source === '' || (Array.isArray(source) && !source.length)) return;
        const target = record[locale] ?? null;
        result.push({
          key: `${relative}#${parts.join('.')}`,
          identity: entityFingerprint(relative, raw, [...parts, locale]),
          file: relative,
          sourceFile: relative,
          sourceField: [...parts, sourceLocale],
          targetField: [...parts, locale],
          sourceLocale,
          source,
          target,
          sourceHash: fingerprint({ field: [...parts, sourceLocale], value: source }),
          targetHash: target === null ? null : fingerprint({ field: [...parts, locale], value: target }),
        });
        return;
      }
      for (const [key, v] of Object.entries(record)) walk(v, [...parts, key]);
    };
    if (termIds && Array.isArray(raw))
      raw.forEach((term, index) => {
        if (termIds.has(term.id)) walk(term, [index]);
      });
    else walk(raw, []);
  }
  return result;
}
