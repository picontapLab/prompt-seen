import { parseTemplateBody, placeholderNames } from '../../../src/modules/template/parse';
import { renderTemplate, validateValues } from '../../../src/modules/template/render';
import type { FieldSpec, FieldValues, TemplateVersionSpec } from '../../../src/modules/template/types';
import type { Findings } from './findings';
import {
  sha256,
  type Content,
  type ExampleRecord,
  type PromptRecord,
  type TemplateRecord,
  type TemplateVersion,
} from './read';
import { sameValues, versionSpec } from './rules';

export function resolveTemplate(rec: TemplateRecord, version: TemplateVersion, locale: string) {
  const variant = version.promptLocales.get(locale);
  const source = versionSpec(version);
  if (!variant) return { spec: source, samples: version.samples, language: rec.data.promptLanguage, variantHash: null };
  const fields: FieldSpec[] = source.fields.map((field) => {
    if (field.type === 'enum') {
      const mapping = variant.data.enumText[field.name];
      return {
        ...field,
        options: field.options.map((option) => ({
          ...option,
          ...(mapping && mapping !== 'source' ? { renderText: mapping[option.value] } : {}),
        })),
      };
    }
    const value = variant.data.defaults[field.name];
    if (field.type === 'string-list')
      return {
        ...field,
        default: Array.isArray(value) ? value : field.default,
        separator: variant.data.separators[field.name] ?? field.separator,
      };
    return { ...field, default: typeof value === 'string' ? value : field.default };
  });
  const spec = { body: variant.body, fields };
  // UI labels/swatches/groups do not change the generated text or its validation contract.
  const contractFields = fields.map(({ group: _group, ...field }) => {
    void _group;
    return field.type === 'enum'
      ? {
          ...field,
          options: field.options.map(({ value, renderText }) => ({ value, renderText: renderText ?? value })),
        }
      : field;
  });
  const samples = new Map(
    [...version.samples.keys()].flatMap((name) => {
      const values = variant.data.samples[name];
      return values ? [[name, { file: variant.file, values }] as const] : [];
    }),
  );
  return {
    spec,
    samples,
    language: locale,
    variantHash: sha256(JSON.stringify({ body: spec.body, fields: contractFields })),
  };
}

export function sourcePromptLanguage(content: Content, rec: PromptRecord): string {
  const source = rec.data.promptSource;
  return source.type === 'literal'
    ? source.language
    : (content.templates.get(source.templateId)?.data.promptLanguage ?? '');
}

export function resolvePrompt(content: Content, rec: PromptRecord, locale: string) {
  const source = rec.data.promptSource;
  const variant = rec.promptLocales.get(locale);
  const language = variant ? locale : sourcePromptLanguage(content, rec);
  let text = variant?.text ?? rec.promptText;
  let values = source.type === 'template' ? (variant?.values ?? source.values) : null;
  if (source.type === 'template') {
    const template = content.templates.get(source.templateId);
    const version = template?.versions.get(source.version);
    if (template && version) {
      const selected = resolveTemplate(template, version, language);
      const result = renderTemplate(selected.spec, values ?? {});
      text = result.text;
      values = result.values;
    }
  }
  const annotations = rec.data.annotations.map((annotation) => ({
    ...annotation,
    phrase: variant?.annotations.find((a) => a.sourcePhrase === annotation.phrase)?.phrase ?? annotation.phrase,
  }));
  return { text, language, values, annotations };
}

/** Legacy records only inherit a language when their exact source recipe can be reproduced. */
export function runPromptLanguage(content: Content, run: ExampleRecord): string | null {
  if (run.data.promptLanguage) return run.data.promptLanguage;
  const target = run.data.template;
  if (target) {
    const rec = content.templates.get(target.id);
    const version = rec?.versions.get(target.version);
    if (rec && version && renderTemplate(versionSpec(version), target.values).text === run.prompt)
      return rec.data.promptLanguage;
  }
  const rec = run.data.promptId ? content.prompts.get(run.data.promptId) : null;
  if (rec) {
    const source = resolvePrompt(content, rec, sourcePromptLanguage(content, rec));
    if (source.text === run.prompt) return source.language;
  }
  return null;
}

export function matchingPromptRuns(content: Content, rec: PromptRecord, locale: string) {
  const selected = resolvePrompt(content, rec, locale);
  if (selected.text === null) return [];
  const hash = sha256(selected.text);
  return [...content.examples.values()]
    .filter((run) => {
      if (
        run.data.promptId !== rec.data.id ||
        run.prompt !== selected.text ||
        run.data.promptSha256 !== hash ||
        runPromptLanguage(content, run) !== selected.language
      )
        return false;
      const source = rec.data.promptSource;
      if (source.type !== 'template') return true;
      const template = run.data.template;
      const recTemplate = content.templates.get(source.templateId)!;
      const version = recTemplate.versions.get(source.version)!;
      const { spec } = resolveTemplate(recTemplate, version, selected.language);
      return (
        template?.id === source.templateId &&
        template.version === source.version &&
        sameValues(template.values, selected.values ?? {}, spec.fields)
      );
    })
    .sort((a, b) => b.data.recordedAt.localeCompare(a.data.recordedAt) || b.data.id.localeCompare(a.data.id));
}

export function validatePromptVariants(content: Content, findings: Findings) {
  const keys = (actual: readonly string[], expected: readonly string[], file: string, label: string) => {
    const missing = expected.filter((name) => !actual.includes(name));
    const extra = actual.filter((name) => !expected.includes(name));
    if (missing.length || extra.length)
      findings.error(file, `${label}: missing [${missing.join(', ')}], unknown [${extra.join(', ')}]`);
  };
  const values = (spec: TemplateVersionSpec, data: FieldValues, file: string, label: string) => {
    keys(
      Object.keys(data),
      spec.fields.map((f) => f.name),
      file,
      label,
    );
    const errors = validateValues(spec.fields, data);
    if (errors.length) findings.error(file, `${label}: ${errors.map((e) => `${e.field}: ${e.code}`).join('; ')}`);
  };
  for (const rec of content.templates.values())
    for (const version of rec.versions.values()) {
      for (const [locale, variant] of version.promptLocales) {
        const file = variant.file;
        if (locale === rec.data.promptLanguage) findings.error(file, 'prompt locale duplicates the source language');
        const parsed = parseTemplateBody(variant.body);
        for (const problem of parsed.problems)
          findings.error(variant.bodyFile, problem.message, { line: problem.line });
        keys(
          placeholderNames(parsed.segments),
          version.fields.map((f) => f.name),
          variant.bodyFile,
          'placeholders',
        );
        const data = variant.data;
        keys(
          Object.keys(data.defaults),
          version.fields.filter((f) => f.type !== 'enum' && f.default !== null).map((f) => f.name),
          file,
          'defaults',
        );
        keys(
          Object.keys(data.enumText),
          version.fields.filter((f) => f.type === 'enum').map((f) => f.name),
          file,
          'enumText',
        );
        keys(
          Object.keys(data.separators),
          version.fields.filter((f) => f.type === 'string-list').map((f) => f.name),
          file,
          'separators',
        );
        keys(Object.keys(data.samples), [...version.samples.keys()], file, 'samples');
        for (const field of version.fields) {
          const value = data.defaults[field.name];
          if (
            value !== undefined &&
            (field.type === 'string'
              ? typeof value !== 'string'
              : field.type === 'string-list'
                ? !Array.isArray(value)
                : true)
          )
            findings.error(file, `defaults.${field.name}: wrong type`);
          if (field.type === 'enum') {
            const map = data.enumText[field.name];
            if (map && map !== 'source')
              keys(
                Object.keys(map),
                field.options.map((o) => o.value),
                file,
                `enumText.${field.name}`,
              );
          }
        }
        const selected = resolveTemplate(rec, version, locale);
        for (const field of selected.spec.fields) {
          if (field.default !== null) {
            const errors = validateValues([field], {});
            if (errors.length) findings.error(file, `defaults.${field.name}: ${errors.map((e) => e.code).join(', ')}`);
          }
        }
        for (const [name, sample] of Object.entries(data.samples))
          values(selected.spec, sample, file, `samples.${name}`);
      }
    }
  for (const rec of content.prompts.values())
    for (const [locale, variant] of rec.promptLocales) {
      if (locale === sourcePromptLanguage(content, rec))
        findings.error(variant.file, 'prompt locale duplicates the source language');
      const source = rec.data.promptSource;
      if (source.type === 'template') {
        const template = content.templates.get(source.templateId);
        const version = template?.versions.get(source.version);
        if (!template || !version) continue; // The source reference is checked by validateContent.
        if (!version.promptLocales.has(locale)) {
          findings.error(
            variant.file,
            `template ${source.templateId} ${source.version} has no ${locale} prompt locale`,
          );
          continue;
        }
        values(resolveTemplate(template, version, locale).spec, variant.values, variant.file, 'values');
      }
      const selected = resolvePrompt(content, rec, locale);
      const annotations = variant.annotations;
      keys(
        annotations.map((a) => a.sourcePhrase),
        rec.data.annotations.map((a) => a.phrase),
        variant.file,
        'annotations',
      );
      if (new Set(annotations.map((a) => a.sourcePhrase)).size !== annotations.length)
        findings.error(variant.file, 'duplicate annotation sourcePhrase');
      const spans: { start: number; end: number }[] = [];
      for (const annotation of annotations) {
        const text = selected.text ?? '';
        const start = text.indexOf(annotation.phrase);
        if (start < 0 || text.indexOf(annotation.phrase, start + 1) >= 0)
          findings.error(
            variant.file,
            `annotation phrase "${annotation.phrase}" must appear exactly once in the translated prompt`,
          );
        spans.push({ start, end: start + annotation.phrase.length });
      }
      spans.sort((a, b) => a.start - b.start);
      if (spans.some((span, i) => i > 0 && span.start < spans[i - 1]!.end))
        findings.error(variant.file, 'translated annotation phrases overlap');
    }
}
