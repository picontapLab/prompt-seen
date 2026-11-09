import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import type { LocaleEntry } from '../../../src/config/schema';
import { parseTemplateBody } from '../../../src/modules/template/parse';
import type { BodySegment, FieldValues } from '../../../src/modules/template/types';
import type { Findings } from './findings';
import { compileMdx, splitFrontmatter, type CompiledMdx } from './mdx';
import {
  collectionEntrySchema,
  collectionLocalizedSchema,
  exampleRunSchema,
  fieldsFileSchema,
  inputRequirementsSchema,
  type InputRequirementsSource,
  ID_PREFIX,
  localizedSchema,
  mediaSchema,
  promptEntrySchema,
  promptAnnotationsSchema,
  promptVariantSchema,
  templateVariantSchema,
  type PromptAnnotationsSource,
  type TemplateVariantSource,
  redirectsFileSchema,
  sampleSchema,
  SLUG_PATTERN,
  taxonomyFileSchema,
  templateEntrySchema,
  templateContractBaselineSchema,
  type CollectionEntrySource,
  type ExampleRunSource,
  type FieldSource,
  type IdKind,
  type LocalizedSource,
  type MediaSource,
  type PromptEntrySource,
  type RedirectsSource,
  type TemplateEntrySource,
  type TermSource,
} from './schemas';
import { check, parseYaml, type ParsedYaml } from './yaml';

// Step 1–2 of content:build (design doc §14.2): read every file under content/, normalize line
// endings and check each file against its schema. Cross-file rules live in validate.ts.

export type LocaleFile = {
  file: string;
  locale: string;
  fm: LocalizedSource;
  body: string;
  /** Line of the body's first line in the file, for MDX positions. */
  bodyLine: number;
  /** Structure check (no resolvers): sections, links and figures. */
  compiled: CompiledMdx;
  /** Hash of the content a translation follows (§8.5): title, description and body. */
  contentHash: string;
};

export type Located<T> = { file: string; dir: string; data: T; lineOf: ParsedYaml['lineOf'] };

export type PromptRecord = Located<PromptEntrySource> & {
  /** prompt.txt for literal prompts; null for template-based ones until the index renders them. */
  promptText: string | null;
  promptFile: string;
  locales: Map<string, LocaleFile>;
  promptLocales: Map<string, { file: string; text: string | null; values: FieldValues; annotations: PromptAnnotationsSource }>;
};

export type TemplateVersion = {
  id: string;
  dir: string;
  bodyFile: string;
  body: string;
  segments: BodySegment[];
  fieldsFile: string;
  fields: FieldSource[];
  fieldsLineOf: ParsedYaml['lineOf'];
  contractBaseline?: z.infer<typeof templateContractBaselineSchema>;
  inputs?: InputRequirementsSource | null;
  /** name → values, `default` first. */
  samples: Map<string, { file: string; values: FieldValues }>;
  promptLocales: Map<string, { file: string; bodyFile: string; body: string; data: TemplateVariantSource }>;
};

export type TemplateRecord = Located<TemplateEntrySource> & {
  versions: Map<string, TemplateVersion>;
  locales: Map<string, LocaleFile>;
};

export type ExampleRecord = Located<ExampleRunSource> & { promptFile: string; prompt: string | null };
export type MediaRecord = Located<MediaSource>;
export type CollectionRecord = Located<CollectionEntrySource> & { locales: Map<string, LocaleFile> };
export type PageRecord = { dir: string; slug: string; locales: Map<string, LocaleFile> };
export type TaxonomyKey = 'category' | 'style' | 'useCase';
export type TopicRecord = { dir: string; taxonomy: TaxonomyKey; termId: string; locales: Map<string, LocaleFile> };
export type TermRecord = TermSource & { file: string; line: number | undefined };

export type Content = {
  dir: string;
  prompts: Map<string, PromptRecord>;
  templates: Map<string, TemplateRecord>;
  examples: Map<string, ExampleRecord>;
  media: Map<string, MediaRecord>;
  collections: Map<string, CollectionRecord>;
  pages: Map<string, PageRecord>;
  topics: TopicRecord[];
  taxonomy: Record<TaxonomyKey, Map<string, TermRecord>>;
  fieldGroups: Map<string, TermRecord>;
  /** Taxonomy files that could not be read; references to them are not checked again. */
  unreadable: Set<TaxonomyKey | 'fieldGroups'>;
  redirects: (RedirectsSource & { file: string; lineOf: ParsedYaml['lineOf'] }) | null;
};

/** Taxonomy files and the URL segment of their topic pages (§9.1). */
export const TAXONOMY_FILES = {
  category: { file: 'categories.yaml', dir: 'categories', segment: 'categories' },
  style: { file: 'styles.yaml', dir: 'styles', segment: 'styles' },
  useCase: { file: 'use-cases.yaml', dir: 'use-cases', segment: 'use-cases' },
} as const satisfies Record<TaxonomyKey, { file: string; dir: string; segment: string }>;

/** UTF-8 text with LF line endings and no byte-order mark (§14.2 step 1). */
export function readText(file: string): string {
  return fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/** Prompt text as stored and hashed: LF line endings, no surrounding blank space (§11.9). */
export const normalizePrompt = (text: string) => text.replace(/\r\n?/g, '\n').trim();
export const sha256 = (text: string) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');
/** The value written to `translation.sourceHash`. */
export const sourceHashOf = (file: { fm: { title: string; description: string }; body: string }) =>
  `sha256:${sha256([file.fm.title.trim(), file.fm.description.trim(), file.body.trim()].join('\n\n')).slice(0, 16)}`;

const subdirs = (dir: string) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => d.name)
        .sort()
    : [];

function readYamlFile<T>(file: string, schema: z.ZodType<T>, findings: Findings, hint?: string): Located<T> | null {
  if (!fs.existsSync(file)) {
    findings.error(file, 'file is missing', {
      fix: 'run `npm run content:new` to create entries with every required file',
    });
    return null;
  }
  const parsed = parseYaml(file, readText(file), findings);
  if (!parsed) return null;
  const data = check(schema, parsed, findings, { hint });
  return data === null ? null : { file, dir: path.dirname(file), data, lineOf: parsed.lineOf };
}

function readLocaleFiles(
  dir: string,
  registry: readonly LocaleEntry[],
  findings: Findings,
  schema: z.ZodType<LocalizedSource> = localizedSchema,
): Map<string, LocaleFile> {
  const files = new Map<string, LocaleFile>();
  const localesDir = path.join(dir, 'locales');
  if (!fs.existsSync(localesDir)) {
    findings.error(localesDir, 'no locales/ directory', {
      fix: 'add locales/en.mdx (or the source language) with frontmatter',
    });
    return files;
  }
  const codes = new Set(registry.map((l) => l.code));
  for (const name of fs.readdirSync(localesDir).sort()) {
    const file = path.join(localesDir, name);
    if (name.startsWith('.')) continue;
    const code = name.replace(/\.mdx$/, '');
    if (!name.endsWith('.mdx') || !codes.has(code)) {
      findings.error(file, `"${name}" is not a locale file`, {
        fix: `name locale files after a registered code in content/locales.yaml, e.g. ${[...codes].slice(0, 3).join('.mdx, ')}.mdx`,
      });
      continue;
    }
    const source = readText(file);
    const split = splitFrontmatter(source);
    if (!split) {
      findings.error(file, 'missing frontmatter', {
        line: 1,
        fix: 'start the file with ---, the fields title, status and updatedAt, then ---',
      });
      continue;
    }
    const parsed = parseYaml(file, split.frontmatter, findings);
    if (!parsed) continue;
    const fm = check(schema, parsed, findings, { lineOffset: split.frontmatterLine - 1 });
    const compiled = compileMdx(split.body, { file, lineOffset: split.bodyLine - 1, findings });
    if (!fm) continue;
    const entry = { file, locale: code, fm, body: split.body, bodyLine: split.bodyLine, compiled, contentHash: '' };
    entry.contentHash = sourceHashOf(entry);
    files.set(code, entry);
  }
  return files;
}

function checkDirId(kind: IdKind, dir: string, file: string, id: string, findings: Findings) {
  const name = path.basename(dir);
  if (name !== id)
    findings.error(file, `id "${id}" does not match its directory "${name}"`, {
      field: 'id',
      fix: `rename the directory to ${id}, or set id: ${name}; IDs never change once published (§5.1)`,
    });
  if (!new RegExp(`^${ID_PREFIX[kind]}_\\d{3,}$`).test(name))
    findings.error(dir, `directory "${name}" is not a ${kind} ID`, { fix: `name it like ${ID_PREFIX[kind]}_001` });
}

function readTerms(file: string, findings: Findings): Map<string, TermRecord> | null {
  const terms = new Map<string, TermRecord>();
  if (!fs.existsSync(file)) return terms;
  const parsed = parseYaml(file, readText(file), findings);
  if (!parsed) return null;
  const list = check(taxonomyFileSchema, parsed, findings);
  if (!list) return null;
  list.forEach((term, i) => {
    if (terms.has(term.id))
      findings.error(file, `duplicate id "${term.id}"`, { line: parsed.lineOf([i, 'id']), field: `${i}.id` });
    terms.set(term.id, { ...term, file, line: parsed.lineOf([i]) });
  });
  return terms;
}

/** Optional prompt bodies are content, with no separate translation publishing state. */
function variantDirs(dir: string, registry: readonly LocaleEntry[], findings: Findings, allowed: string[]) {
  const base = path.join(dir, 'prompt-locales');
  if (!fs.existsSync(base)) return [];
  const result: { code: string; dir: string }[] = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const target = path.join(base, entry.name);
    if (!entry.isDirectory() || !registry.some((l) => l.code === entry.name)) {
      findings.error(target, 'prompt-locales must contain directories named after registered locale codes');
      continue;
    }
    for (const child of fs.readdirSync(target, { withFileTypes: true })) {
      if (child.name.startsWith('.')) continue;
      if (!child.isFile() || !allowed.includes(child.name))
        findings.error(path.join(target, child.name), `unexpected prompt locale file; allowed: ${allowed.join(', ')}`);
    }
    result.push({ code: entry.name, dir: target });
  }
  return result.sort((a, b) => a.code.localeCompare(b.code));
}

function variantText(file: string, findings: Findings): string | null {
  if (!fs.existsSync(file)) {
    findings.error(file, 'prompt locale text file is missing');
    return null;
  }
  const text = normalizePrompt(readText(file));
  if (!text) findings.error(file, 'prompt locale text is empty');
  return text;
}

export function readContent(dir: string, registry: readonly LocaleEntry[], findings: Findings): Content {
  const content: Content = {
    dir,
    prompts: new Map(),
    templates: new Map(),
    examples: new Map(),
    media: new Map(),
    collections: new Map(),
    pages: new Map(),
    topics: [],
    taxonomy: { category: new Map(), style: new Map(), useCase: new Map() },
    fieldGroups: new Map(),
    unreadable: new Set(),
    redirects: null,
  };

  // Prompts
  for (const name of subdirs(path.join(dir, 'prompts'))) {
    const entryDir = path.join(dir, 'prompts', name);
    const rec = readYamlFile(path.join(entryDir, 'entry.yaml'), promptEntrySchema, findings);
    const locales = readLocaleFiles(entryDir, registry, findings);
    if (!rec) continue;
    checkDirId('prompt', entryDir, rec.file, rec.data.id, findings);
    const promptFile = path.join(entryDir, 'prompt.txt');
    let promptText: string | null = null;
    if (rec.data.promptSource.type === 'literal') {
      if (!fs.existsSync(promptFile))
        findings.error(promptFile, 'prompt.txt is missing', { fix: 'add the prompt text, exactly as it is copied' });
      else {
        promptText = normalizePrompt(readText(promptFile));
        if (!promptText) findings.error(promptFile, 'prompt.txt is empty');
      }
    } else if (fs.existsSync(promptFile)) {
      findings.error(
        promptFile,
        'a template-based prompt has no prompt.txt; its text is rendered from the template (§5.2)',
        {
          fix: 'delete prompt.txt, or change promptSource.type to literal',
        },
      );
    }
    const promptLocales: PromptRecord['promptLocales'] = new Map();
    const literal = rec.data.promptSource.type === 'literal';
    for (const variant of variantDirs(entryDir, registry, findings, literal ? ['prompt.txt', 'annotations.yaml'] : ['variant.yaml'])) {
      if (literal) {
        const file = path.join(variant.dir, 'prompt.txt');
        const annotationsFile = path.join(variant.dir, 'annotations.yaml');
        const annotations = fs.existsSync(annotationsFile)
          ? readYamlFile(annotationsFile, promptAnnotationsSchema, findings)?.data.annotations ?? [] : [];
        promptLocales.set(variant.code, { file, text: variantText(file, findings), values: {}, annotations });
      } else {
        const data = readYamlFile(path.join(variant.dir, 'variant.yaml'), promptVariantSchema, findings);
        if (data) promptLocales.set(variant.code, { file: data.file, text: null, ...data.data });
      }
    }
    content.prompts.set(rec.data.id, { ...rec, promptText, promptFile, locales, promptLocales });
  }

  // Templates
  for (const name of subdirs(path.join(dir, 'templates'))) {
    const entryDir = path.join(dir, 'templates', name);
    const rec = readYamlFile(path.join(entryDir, 'entry.yaml'), templateEntrySchema, findings);
    const locales = readLocaleFiles(entryDir, registry, findings);
    if (!rec) continue;
    checkDirId('template', entryDir, rec.file, rec.data.id, findings);
    const versions = new Map<string, TemplateVersion>();
    for (const vid of subdirs(path.join(entryDir, 'versions'))) {
      const vdir = path.join(entryDir, 'versions', vid);
      if (!/^v\d+$/.test(vid)) {
        findings.error(vdir, `"${vid}" is not a version name`, { fix: 'name versions v1, v2, …' });
        continue;
      }
      const bodyFile = path.join(vdir, 'body.txt');
      const fieldsFile = path.join(vdir, 'fields.yaml');
      const fields = readYamlFile(fieldsFile, fieldsFileSchema, findings);
      const baselineFile = path.join(vdir, 'contract-baseline.yaml');
      const contractBaseline = fs.existsSync(baselineFile)
        ? readYamlFile(baselineFile, templateContractBaselineSchema, findings)?.data
        : undefined;
      const inputsFile = path.join(vdir, 'inputs.yaml');
      const inputs = fs.existsSync(inputsFile)
        ? (readYamlFile(inputsFile, inputRequirementsSchema, findings)?.data ?? null)
        : null;
      if (!fs.existsSync(bodyFile)) {
        findings.error(bodyFile, 'body.txt is missing', {
          fix: 'add the template text with {{fieldName}} placeholders',
        });
        continue;
      }
      const body = normalizePrompt(readText(bodyFile));
      const { segments, problems } = parseTemplateBody(body);
      for (const p of problems) findings.error(bodyFile, p.message, { line: p.line });
      const samples = new Map<string, { file: string; values: FieldValues }>();
      const samplesDir = path.join(vdir, 'samples');
      const sampleFiles = fs.existsSync(samplesDir)
        ? fs
            .readdirSync(samplesDir)
            .filter((f) => f.endsWith('.yaml'))
            .sort()
        : [];
      for (const f of ['default.yaml', ...sampleFiles.filter((f) => f !== 'default.yaml')]) {
        if (!sampleFiles.includes(f)) continue;
        const file = path.join(samplesDir, f);
        const sample = readYamlFile(file, sampleSchema, findings);
        if (sample) samples.set(f.slice(0, -'.yaml'.length), { file, values: sample.data });
      }
      if (!fields) continue;
      const promptLocales: TemplateVersion['promptLocales'] = new Map();
      for (const variant of variantDirs(vdir, registry, findings, ['body.txt', 'variant.yaml'])) {
        const localizedBodyFile = path.join(variant.dir, 'body.txt');
        const localizedBody = variantText(localizedBodyFile, findings);
        const data = readYamlFile(path.join(variant.dir, 'variant.yaml'), templateVariantSchema, findings);
        if (data && localizedBody !== null)
          promptLocales.set(variant.code, { file: data.file, bodyFile: localizedBodyFile, body: localizedBody, data: data.data });
      }
      versions.set(vid, {
        id: vid,
        dir: vdir,
        bodyFile,
        body,
        segments,
        fieldsFile,
        fields: fields.data.fields,
        fieldsLineOf: fields.lineOf,
        contractBaseline,
        inputs,
        samples,
        promptLocales,
      });
    }
    content.templates.set(rec.data.id, { ...rec, versions, locales });
  }

  // Example runs
  for (const name of subdirs(path.join(dir, 'examples'))) {
    const entryDir = path.join(dir, 'examples', name);
    const rec = readYamlFile(path.join(entryDir, 'run.yaml'), exampleRunSchema, findings);
    if (!rec) continue;
    checkDirId('example', entryDir, rec.file, rec.data.id, findings);
    const promptFile = path.join(entryDir, 'prompt.txt');
    const prompt = fs.existsSync(promptFile) ? normalizePrompt(readText(promptFile)) : null;
    if (prompt === null)
      findings.error(promptFile, 'prompt.txt is missing: a run keeps the exact prompt it used (§5.5)');
    content.examples.set(rec.data.id, { ...rec, promptFile, prompt });
  }

  // Media
  const mediaDir = path.join(dir, 'media');
  if (fs.existsSync(mediaDir)) {
    for (const name of fs.readdirSync(mediaDir).sort()) {
      if (!name.endsWith('.yaml')) continue;
      const rec = readYamlFile(
        path.join(mediaDir, name),
        mediaSchema,
        findings,
        'media files are written by `npm run media:import`',
      );
      if (!rec) continue;
      if (name !== `${rec.data.id}.yaml`)
        findings.error(rec.file, `id "${rec.data.id}" does not match the file name`, {
          field: 'id',
          fix: `rename the file to ${rec.data.id}.yaml`,
        });
      content.media.set(rec.data.id, rec);
    }
  }

  // Collections
  for (const name of subdirs(path.join(dir, 'collections'))) {
    const entryDir = path.join(dir, 'collections', name);
    const rec = readYamlFile(path.join(entryDir, 'entry.yaml'), collectionEntrySchema, findings);
    const locales = readLocaleFiles(entryDir, registry, findings, collectionLocalizedSchema);
    if (!rec) continue;
    checkDirId('collection', entryDir, rec.file, rec.data.id, findings);
    content.collections.set(rec.data.id, { ...rec, locales });
  }

  // Pages: about, license, … (§9.1)
  for (const name of subdirs(path.join(dir, 'pages'))) {
    const pageDir = path.join(dir, 'pages', name);
    if (!SLUG_PATTERN.test(name)) {
      findings.error(pageDir, `"${name}" is not a valid page slug`, {
        fix: 'use lowercase letters, digits and hyphens',
      });
      continue;
    }
    content.pages.set(name, { dir: pageDir, slug: name, locales: readLocaleFiles(pageDir, registry, findings) });
  }

  // Taxonomy and topic pages
  const taxonomyDir = path.join(dir, 'taxonomy');
  for (const key of Object.keys(TAXONOMY_FILES) as TaxonomyKey[]) {
    const spec = TAXONOMY_FILES[key];
    const terms = readTerms(path.join(taxonomyDir, spec.file), findings);
    if (terms) content.taxonomy[key] = terms;
    else content.unreadable.add(key);
    for (const termId of subdirs(path.join(taxonomyDir, spec.dir))) {
      const topicDir = path.join(taxonomyDir, spec.dir, termId);
      content.topics.push({
        dir: topicDir,
        taxonomy: key,
        termId,
        locales: readLocaleFiles(topicDir, registry, findings),
      });
    }
  }
  const groups = readTerms(path.join(taxonomyDir, 'field-groups.yaml'), findings);
  if (groups) content.fieldGroups = groups;
  else content.unreadable.add('fieldGroups');

  // Redirects and removed addresses (§9.5)
  const redirectsFile = path.join(dir, 'redirects.yaml');
  if (fs.existsSync(redirectsFile)) {
    const parsed = parseYaml(redirectsFile, readText(redirectsFile), findings);
    const data = parsed && check(redirectsFileSchema, parsed, findings);
    if (parsed && data) content.redirects = { ...data, file: redirectsFile, lineOf: parsed.lineOf };
  }

  return content;
}
