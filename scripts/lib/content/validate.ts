import fs from 'node:fs';
import path from 'node:path';
import type { ResolvedConfig } from '../../../src/config/schema';
import { placeholderNames } from '../../../src/modules/template/parse';
import { renderTemplate, resolveValues } from '../../../src/modules/template/render';
import { RESERVED_PAGE_SEGMENTS } from '../../../src/modules/url/create';
import type { FieldError } from '../../../src/modules/template/types';
import type { Findings } from './findings';
import type { Content, LocaleFile, TaxonomyKey } from './read';
import { TAXONOMY_FILES, sha256 } from './read';
import { linkTargetLocales, localeStates, promptTextOf, publishProblems, sameValues, versionSpec } from './rules';
import { validateFeedSettings } from './validate-feed';
import { validateHomeSettings } from './validate-home';

// Cross-file rules (design doc §14.2 steps 3–5, §14.3). Mode-independent: the same content
// gives the same findings in every build. What a build shows is decided in build-index.ts.

export type ValidateOptions = {
  /** Where the local media driver keeps files: keys resolve to `${mediaRoot}/${key}` (§10.1). */
  mediaRoot: string;
};

const describeFieldError = (e: FieldError) =>
  `${e.field}: ${e.code}${e.limit !== undefined ? ` (limit ${e.limit}, got ${e.actual})` : ''}${e.item !== undefined ? ` at item ${e.item + 1}` : ''}`;

export function validateContent(
  content: Content,
  config: ResolvedConfig,
  findings: Findings,
  opts: ValidateOptions,
): void {
  const codes = new Set(config.locales.map((l) => l.code));
  const rel = (file: string) => path.relative(path.dirname(content.dir), file);

  /** Locale keys of a text map must be registered codes. */
  const checkKeys = (map: Record<string, unknown>, file: string, field: string, line?: number) => {
    for (const key of Object.keys(map))
      if (!codes.has(key))
        findings.error(file, `"${key}" is not a registered locale code`, {
          field: `${field}.${key}`,
          line,
          fix: `use a code from content/locales.yaml, e.g. en, zh-Hans`,
        });
  };

  const termExists = (key: TaxonomyKey, id: string, file: string, field: string, line?: number) => {
    // An unreadable taxonomy file is reported once; every reference to it would repeat it.
    if (!content.unreadable.has(key) && !content.taxonomy[key].has(id))
      findings.error(file, `${key} "${id}" is not defined`, {
        field,
        line,
        fix: `add it to content/taxonomy/${TAXONOMY_FILES[key].file}, or use an existing id`,
      });
  };

  const assetExists = (id: string, file: string, field: string, line?: number) => {
    if (!content.media.has(id))
      findings.error(file, `image ${id} does not exist`, {
        field,
        line,
        fix: 'import it with `npm run media:import`, which writes content/media/<id>.yaml',
      });
  };

  const usedAssets = new Set<string>();
  /** Template versions whose body is already reported as broken. */
  const brokenVersions = new Set<string>();
  const brokenBodies = new Set(
    findings.list
      .filter((f) => f.level === 'error' && f.file.endsWith('body.txt'))
      .map((f) => path.resolve(path.dirname(content.dir), f.file)),
  );

  // --- Slugs must be unique per kind (§14.3: duplicate address) --------------------------------
  const slugOwners = new Map<string, string>();
  for (const [kind, map] of [
    ['prompt', content.prompts],
    ['template', content.templates],
    ['collection', content.collections],
  ] as const) {
    for (const rec of map.values()) {
      const key = `${kind}:${rec.data.slug}`;
      const other = slugOwners.get(key);
      if (other)
        findings.error(rec.file, `slug "${rec.data.slug}" is already used by ${other}`, {
          field: 'slug',
          line: rec.lineOf(['slug']),
          fix: 'choose another slug; two entries cannot share an address',
        });
      else slugOwners.set(key, rec.data.id);
    }
  }

  // --- Taxonomy and field groups ---------------------------------------------------------------
  for (const key of Object.keys(content.taxonomy) as TaxonomyKey[])
    for (const term of content.taxonomy[key].values()) {
      checkKeys(term.labels, term.file, `${term.id}.labels`, term.line);
      checkKeys(term.aliases, term.file, `${term.id}.aliases`, term.line);
    }
  for (const group of content.fieldGroups.values())
    checkKeys(group.labels, group.file, `${group.id}.labels`, group.line);
  for (const topic of content.topics)
    if (!content.taxonomy[topic.taxonomy].has(topic.termId))
      findings.error(topic.dir, `topic "${topic.termId}" has no ${topic.taxonomy} with that id`, {
        fix: `add it to content/taxonomy/${TAXONOMY_FILES[topic.taxonomy].file} or rename the directory`,
      });

  // --- Prompts (§5.2) ---------------------------------------------------------------------------
  let untested: string[] = [];
  for (const rec of content.prompts.values()) {
    const d = rec.data;
    if (d.showcaseExampleId) {
      const run = content.examples.get(d.showcaseExampleId);
      if (
        !run ||
        run.data.promptId !== d.id ||
        !run.data.outputAssetIds.includes(d.coverAssetId ?? '') ||
        run.prompt !== promptTextOf(content, rec)
      )
        findings.error(rec.file, 'showcase must belong to this prompt and match its cover and exact text');
    }
    termExists('category', d.categoryId, rec.file, 'categoryId', rec.lineOf(['categoryId']));
    d.styleIds.forEach((id, i) => termExists('style', id, rec.file, `styleIds.${i}`, rec.lineOf(['styleIds', i])));
    d.useCaseIds.forEach((id, i) =>
      termExists('useCase', id, rec.file, `useCaseIds.${i}`, rec.lineOf(['useCaseIds', i])),
    );
    if (d.coverAssetId) {
      assetExists(d.coverAssetId, rec.file, 'coverAssetId', rec.lineOf(['coverAssetId']));
      usedAssets.add(d.coverAssetId);
    }
    d.relatedTemplateIds.forEach((id, i) => {
      if (!content.templates.has(id))
        findings.error(rec.file, `template ${id} does not exist`, {
          field: `relatedTemplateIds.${i}`,
          line: rec.lineOf(['relatedTemplateIds', i]),
        });
    });
    if (d.model.verification === 'verified' && !d.model.displayName)
      findings.error(rec.file, 'a verified prompt names the model it was verified with', {
        field: 'model.displayName',
        line: rec.lineOf(['model']),
        fix: 'set model.displayName (and providerModelId if known), or set verification: unknown',
      });

    const source = d.promptSource;
    if (source.type === 'template') {
      const template = content.templates.get(source.templateId);
      const version = template?.versions.get(source.version);
      if (!template || !version)
        findings.error(rec.file, `template ${source.templateId} ${source.version} does not exist`, {
          field: 'promptSource',
          line: rec.lineOf(['promptSource']),
        });
      else {
        const result = renderTemplate(versionSpec(version), source.values);
        if (!result.ok)
          findings.error(
            rec.file,
            `the template values do not render: ${result.errors.map(describeFieldError).join('; ')}`,
            {
              field: 'promptSource.values',
              line: rec.lineOf(['promptSource', 'values']),
            },
          );
      }
    }

    const text = promptTextOf(content, rec);
    if (text !== null) {
      const spans: [number, number, number][] = [];
      d.annotations.forEach((a, i) => {
        checkKeys(a.note, rec.file, `annotations.${i}.note`, rec.lineOf(['annotations', i, 'note']));
        const at = text.indexOf(a.phrase);
        if (at < 0) {
          findings.error(rec.file, `annotation phrase "${a.phrase}" does not appear in the prompt`, {
            field: `annotations.${i}.phrase`,
            line: rec.lineOf(['annotations', i, 'phrase']),
            fix: 'copy the phrase exactly from the prompt, with the same case and punctuation (§5.2)',
          });
          return;
        }
        if (text.indexOf(a.phrase, at + 1) >= 0)
          findings.warning(
            rec.file,
            `annotation phrase "${a.phrase}" appears more than once; the first one is marked`,
            {
              field: `annotations.${i}.phrase`,
              line: rec.lineOf(['annotations', i, 'phrase']),
              fix: 'quote a longer phrase so it is unique',
            },
          );
        spans.push([at, at + a.phrase.length, i]);
      });
      spans.sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < spans.length; i += 1)
        if (spans[i]![0] < spans[i - 1]![1])
          findings.error(rec.file, 'annotation phrases overlap', {
            field: `annotations.${spans[i]![2]}.phrase`,
            line: rec.lineOf(['annotations', spans[i]![2], 'phrase']),
            fix: 'each phrase marks a separate part of the prompt',
          });
    }
    const runs = [...content.examples.values()].filter((x) => x.data.promptId === d.id);
    if (!runs.length || d.model.verification === 'unknown') untested.push(d.id);
  }
  if (untested.length) {
    untested = untested.sort();
    findings.warning(
      'content/prompts',
      `${untested.length} prompt(s) have no recorded run or no known model: ${untested.join(', ')}`,
      {
        fix: 'record an ExampleRun with the model and date (§5.5); pages show "Not verified" until then',
      },
    );
  }

  // --- Templates (§6) ---------------------------------------------------------------------------
  for (const rec of content.templates.values()) {
    const d = rec.data;
    if (d.categoryId) termExists('category', d.categoryId, rec.file, 'categoryId', rec.lineOf(['categoryId']));
    d.styleIds.forEach((id, i) => termExists('style', id, rec.file, `styleIds.${i}`, rec.lineOf(['styleIds', i])));
    d.useCaseIds.forEach((id, i) =>
      termExists('useCase', id, rec.file, `useCaseIds.${i}`, rec.lineOf(['useCaseIds', i])),
    );
    if (!rec.versions.has(d.currentVersion))
      findings.error(rec.file, `currentVersion ${d.currentVersion} does not exist`, {
        field: 'currentVersion',
        line: rec.lineOf(['currentVersion']),
        fix: `add versions/${d.currentVersion}/ or point currentVersion at an existing version`,
      });

    for (const version of rec.versions.values()) {
      const names = new Set<string>();
      version.fields.forEach((f, i) => {
        const line = version.fieldsLineOf(['fields', i]);
        if (names.has(f.name))
          findings.error(version.fieldsFile, `duplicate field "${f.name}"`, { field: `fields.${i}.name`, line });
        names.add(f.name);
        checkKeys(f.labels, version.fieldsFile, `fields.${i}.labels`, line);
        checkKeys(f.help, version.fieldsFile, `fields.${i}.help`, line);
        if (f.group && !content.unreadable.has('fieldGroups') && !content.fieldGroups.has(f.group))
          findings.error(version.fieldsFile, `field group "${f.group}" is not defined`, {
            field: `fields.${i}.group`,
            line,
            fix: 'add it to content/taxonomy/field-groups.yaml',
          });
        if (f.type === 'enum') {
          f.options.forEach((o, j) => checkKeys(o.labels, version.fieldsFile, `fields.${i}.options.${j}.labels`, line));
          const values = f.options.map((o) => o.value);
          if (new Set(values).size !== values.length)
            findings.error(version.fieldsFile, `"${f.name}" has duplicate option values`, { line });
          if (f.default !== null && !values.includes(f.default))
            findings.error(version.fieldsFile, `default "${f.default}" is not one of the options of "${f.name}"`, {
              field: `fields.${i}.default`,
              line,
            });
        }
      });

      // §6.3: an undefined placeholder fails the build with its position; unused fields too.
      const used = placeholderNames(version.segments);
      for (const s of version.segments)
        if (s.kind === 'field' && !names.has(s.name))
          findings.error(version.bodyFile, `placeholder {{${s.name}}} has no field definition`, {
            line: s.line,
            fix: `define "${s.name}" in fields.yaml, or fix the spelling`,
          });
      for (const f of version.fields)
        if (!used.includes(f.name))
          findings.error(version.fieldsFile, `field "${f.name}" is not used in body.txt`, {
            fix: `add {{${f.name}}} to body.txt, or remove the field`,
          });

      // A broken body is reported above; rendering it again would only repeat the error.
      const bodyOk =
        version.segments.every((s) => s.kind === 'text' || names.has(s.name)) && !brokenBodies.has(version.bodyFile);
      if (!bodyOk) brokenVersions.add(`${d.id}/${version.id}`);
      const spec = versionSpec(version);
      if (!version.samples.has('default'))
        findings.error(version.dir, 'samples/default.yaml is missing: pages render the default sample (§6.2)');
      for (const [name, sample] of version.samples) {
        for (const key of Object.keys(sample.values))
          if (!names.has(key)) findings.error(sample.file, `"${key}" is not a field of this version`, { field: key });
        const result = renderTemplate(spec, sample.values);
        if (!result.ok && bodyOk)
          findings.error(
            sample.file,
            `sample "${name}" does not render: ${result.errors.map(describeFieldError).join('; ')}`,
            {
              fix: 'every sample must be a valid set of values (§6.2)',
            },
          );
      }
    }
  }

  // --- Example runs (§5.5, §6.4) ----------------------------------------------------------------
  for (const run of content.examples.values()) {
    const d = run.data;
    if (d.promptId && !content.prompts.has(d.promptId))
      findings.error(run.file, `prompt ${d.promptId} does not exist`, {
        field: 'promptId',
        line: run.lineOf(['promptId']),
      });
    [...d.outputAssetIds, ...d.referenceAssetIds].forEach((id) => {
      assetExists(id, run.file, 'outputAssetIds', run.lineOf(['outputAssetIds']));
      usedAssets.add(id);
    });
    const owner = d.promptId ? content.prompts.get(d.promptId) : null;
    const slots = owner?.data.inputRequirements.slots ?? [];
    if (slots.length) {
      const indices = d.referenceBindings.map((b) => b.referenceIndex);
      if (
        indices.length !== d.referenceAssetIds.length ||
        new Set(indices).size !== indices.length ||
        indices.some((i) => i >= d.referenceAssetIds.length) ||
        d.referenceBindings.some((b) => !slots.some((s) => s.id === b.slotId))
      )
        findings.error(run.file, 'each reference must have exactly one valid slot binding');
      for (const slot of slots) {
        const count = d.referenceBindings.filter((b) => b.slotId === slot.id).length;
        if (count < slot.min || count > slot.max)
          findings.error(run.file, `reference slot ${slot.id} requires ${slot.min}–${slot.max} images`);
      }
    }
    checkKeys(d.notes, run.file, 'notes', run.lineOf(['notes']));
    if (run.prompt === null) continue;
    if (sha256(run.prompt) !== d.promptSha256)
      findings.error(
        run.promptFile,
        'prompt.txt does not match promptSha256: a run keeps the exact prompt it used (§5.5)',
        {
          fix: `if this is a new run, record it as a new example; the current text hashes to ${sha256(run.prompt)}`,
        },
      );
    if (d.template) {
      const version = content.templates.get(d.template.id)?.versions.get(d.template.version);
      if (!version) {
        findings.error(run.file, `template ${d.template.id} ${d.template.version} does not exist`, {
          field: 'template',
          line: run.lineOf(['template']),
        });
        continue;
      }
      if (brokenVersions.has(`${d.template.id}/${d.template.version}`)) continue;
      const spec = versionSpec(version);
      const result = renderTemplate(spec, d.template.values);
      if (result.text !== run.prompt)
        findings.error(
          run.file,
          `template ${d.template.id} ${d.template.version} no longer renders this run's prompt`,
          {
            field: 'template',
            line: run.lineOf(['template']),
            fix: `versions used by examples are frozen (§6.4): undo the change to ${d.template.version} and create a new version instead`,
          },
        );
      if (d.template.sample) {
        const sample = version.samples.get(d.template.sample);
        if (!sample)
          findings.error(run.file, `sample "${d.template.sample}" does not exist in ${d.template.version}`, {
            field: 'template.sample',
          });
        else if (!sameValues(resolveValues(spec.fields, sample.values), result.values, spec.fields))
          findings.error(sample.file, `sample "${d.template.sample}" changed after run ${d.id} used it`, {
            fix: `samples of versions used by examples are frozen (§6.4): restore it, or create a new version`,
          });
      }
    }
  }

  // --- Media (§5.4, §10) ------------------------------------------------------------------------
  for (const rec of content.media.values()) {
    const d = rec.data;
    checkKeys(d.alt, rec.file, 'alt', rec.lineOf(['alt']));
    checkKeys(d.caption, rec.file, 'caption', rec.lineOf(['caption']));
    const files = [d.original.key, ...Object.values(d.variants).map((v) => v.key)];
    for (const key of files) {
      if (!key.startsWith(`media/${d.id}/`))
        findings.error(rec.file, `key "${key}" belongs to another image`, {
          fix: 'keys are written by media:import; do not edit them',
        });
      if (!fs.existsSync(path.join(opts.mediaRoot, key))) {
        // With a CDN (§10.1) an instance may keep its images only in object storage; the deploy
        // checks them there with `media:check` before going live (§10.4).
        if (config.media.baseUrl)
          findings.warning(rec.file, `image file ${key} is not in local storage`, {
            fix: `\`npm run media:check\` verifies it on ${config.media.baseUrl} before a deploy`,
          });
        else
          findings.error(rec.file, `image file ${key} is missing from storage`, {
            fix: `run \`npm run media:import -- --refresh ${d.id}\` to regenerate it from the original, or re-import the image`,
          });
      }
    }
    const ratio = d.width / d.height;
    for (const [name, v] of Object.entries(d.variants)) {
      if (name === 'og') continue;
      if (v.width > d.width || v.height > d.height)
        findings.error(rec.file, `variant ${name} is larger than the original`, { field: `variants.${name}` });
      if (Math.abs(v.width / v.height - ratio) > 0.02 * ratio)
        findings.error(rec.file, `variant ${name} does not keep the original ratio (§10.2)`, {
          field: `variants.${name}`,
        });
    }
  }

  // --- Collections ------------------------------------------------------------------------------
  for (const rec of content.collections.values()) {
    assetExists(rec.data.coverAssetId, rec.file, 'coverAssetId', rec.lineOf(['coverAssetId']));
    usedAssets.add(rec.data.coverAssetId);
    rec.data.items.forEach((id, i) => {
      if (!content.prompts.has(id) && !content.templates.has(id))
        findings.error(rec.file, `item ${id} does not exist`, { field: `items.${i}`, line: rec.lineOf(['items', i]) });
    });
    for (const file of rec.locales.values())
      for (const id of Object.keys(file.fm.reasons ?? {}))
        if (!rec.data.items.includes(id))
          findings.error(file.file, `reason for ${id}, which is not an item of this collection`, {
            field: `reasons.${id}`,
          });
  }

  // --- Locale files: source, translation state and publishing rules (§8.4, §8.5) ----------------
  const checkLocales = (
    owner: string,
    kind: 'prompt' | 'template' | 'collection' | 'page' | 'topic',
    locales: ReadonlyMap<string, LocaleFile>,
    extra: Omit<Parameters<typeof publishProblems>[0], 'content' | 'kind' | 'locale' | 'file' | 'state'>,
  ) => {
    if (!locales.size) return;
    const sources = [...locales.values()].filter((f) => !f.fm.translation);
    if (sources.length !== 1)
      findings.error(
        owner,
        sources.length
          ? `${sources.length} locale files have no translation block (${sources.map((s) => s.locale).join(', ')}); exactly one is the source`
          : 'every locale file is marked as a translation; the source-language file has no translation block',
        {
          fix: 'the source file has no translation block; each translation names sourceLocale, sourceHash and reviewStatus (§8.4)',
        },
      );
    const states = localeStates(locales);
    for (const [code, file] of locales) {
      const state = states.get(code)!;
      const t = file.fm.translation;
      if (t) {
        if (t.sourceLocale === code)
          findings.error(file.file, 'a translation cannot be its own source', { field: 'translation.sourceLocale' });
        else if (!locales.has(t.sourceLocale))
          findings.error(file.file, `source locale ${t.sourceLocale} has no file`, {
            field: 'translation.sourceLocale',
          });
        else if (sources.length === 1 && t.sourceLocale !== sources[0]!.locale)
          findings.error(
            file.file,
            `sourceLocale is ${t.sourceLocale}, but the source file is ${sources[0]!.locale}.mdx`,
            {
              field: 'translation.sourceLocale',
            },
          );
        if (state.outdated)
          findings.warning(
            file.file,
            `the ${t.sourceLocale} source changed after this translation was reviewed (§8.5)`,
            {
              field: 'translation.sourceHash',
              fix: `review the changes, then set sourceHash: ${state.currentSourceHash}`,
            },
          );
        else if (t.reviewStatus === 'outdated')
          findings.warning(file.file, 'marked outdated: review it against the source', {
            field: 'translation.reviewStatus',
            fix: `after review, set reviewStatus: reviewed and sourceHash: ${state.currentSourceHash ?? '<current hash>'}`,
          });
      }
      for (const link of file.compiled.links)
        if (!linkTargetLocales(content, link))
          findings.error(file.file, `link target ${link.kind}:${link.target} does not exist`, { line: link.line });
      for (const fig of file.compiled.figures) {
        assetExists(fig.assetId, file.file, 'Figure', fig.line);
        usedAssets.add(fig.assetId);
      }
      if (file.fm.status !== 'published') continue;
      for (const p of publishProblems({ content, kind, locale: code, file, state, ...extra }))
        findings.publish(file.file, p.message, { fix: p.fix, line: p.line, field: p.field });
    }
  };

  for (const rec of content.prompts.values())
    checkLocales(rec.dir, 'prompt', rec.locales, {
      coverAssetId: rec.data.coverAssetId,
      terms: [
        { key: 'category', id: rec.data.categoryId },
        ...rec.data.styleIds.map((id) => ({ key: 'style' as const, id })),
        ...rec.data.useCaseIds.map((id) => ({ key: 'useCase' as const, id })),
      ],
      annotationNotes: rec.data.annotations.map((a) => a.note),
    });
  for (const rec of content.templates.values()) {
    const version = rec.versions.get(rec.data.currentVersion);
    checkLocales(rec.dir, 'template', rec.locales, {
      coverAssetId: null,
      terms: [
        ...(rec.data.categoryId ? [{ key: 'category' as const, id: rec.data.categoryId }] : []),
        ...rec.data.styleIds.map((id) => ({ key: 'style' as const, id })),
        ...rec.data.useCaseIds.map((id) => ({ key: 'useCase' as const, id })),
      ],
      fields: version?.fields ?? [],
    });
  }
  for (const rec of content.collections.values())
    checkLocales(rec.dir, 'collection', rec.locales, { coverAssetId: rec.data.coverAssetId, terms: [] });
  for (const page of content.pages.values()) {
    checkLocales(page.dir, 'page', page.locales, { coverAssetId: null, terms: [] });
    // Pages are served at /{locale}/{slug}/, beside the site's own routes (§9.1).
    if (RESERVED_PAGE_SEGMENTS.includes(page.slug))
      findings.error(rel(page.dir), `page "${page.slug}" would take the address of the site's ${page.slug} route`, {
        fix: `rename the directory; reserved: ${RESERVED_PAGE_SEGMENTS.join(', ')}`,
      });
  }
  for (const topic of content.topics)
    checkLocales(topic.dir, 'topic', topic.locales, {
      coverAssetId: null,
      terms: [{ key: topic.taxonomy, id: topic.termId }],
    });

  // --- Missing translations in enabled locales (§14.3: a warning, never an empty page) ----------
  const missing = new Map<string, string[]>();
  const entries: [string, ReadonlyMap<string, LocaleFile>][] = [
    ...[...content.prompts.values()].map((r) => [r.data.id, r.locales] as [string, ReadonlyMap<string, LocaleFile>]),
    ...[...content.templates.values()].map((r) => [r.data.id, r.locales] as [string, ReadonlyMap<string, LocaleFile>]),
    ...[...content.collections.values()].map(
      (r) => [r.data.id, r.locales] as [string, ReadonlyMap<string, LocaleFile>],
    ),
  ];
  for (const locale of config.locales.filter((l) => l.enabled)) {
    for (const [id, locales] of entries) {
      const published = [...locales.values()].some((f) => f.fm.status === 'published');
      if (published && !locales.has(locale.code)) missing.set(locale.code, [...(missing.get(locale.code) ?? []), id]);
    }
  }
  for (const [code, ids] of missing)
    findings.warning(
      'content',
      `${ids.length} published entr${ids.length === 1 ? 'y has' : 'ies have'} no ${code} version: ${ids.join(', ')}`,
      {
        fix: `translate them (§8.4); until then ${code} pages are not generated for these entries`,
      },
    );

  // --- Redirects and removed addresses (§9.5) ---------------------------------------------------
  const r = content.redirects;
  if (r) {
    const live = new Map<string, Set<string>>([
      ['prompt', new Set([...content.prompts.values()].map((p) => p.data.slug))],
      ['template', new Set([...content.templates.values()].map((p) => p.data.slug))],
      ['collection', new Set([...content.collections.values()].map((p) => p.data.slug))],
    ]);
    const seen = new Set<string>();
    const homes = new Set(config.locales.map((l) => `/${l.pathPrefix}/`));
    r.redirects.forEach((item, i) => {
      const line = r.lineOf(['redirects', i]);
      if ('kind' in item) {
        const key = `${item.kind}:${item.from}`;
        if (seen.has(key)) findings.error(r.file, `duplicate redirect from ${item.kind} "${item.from}"`, { line });
        seen.add(key);
        if (live.get(item.kind)!.has(item.from))
          findings.error(r.file, `"${item.from}" is the slug of a current ${item.kind}; the redirect would hide it`, {
            line,
            fix: 'remove the redirect, or change the slug of the current entry',
          });
        const prefix = { prompt: 'p_', template: 't_', collection: 'c_' }[item.kind];
        const exists =
          item.kind === 'prompt'
            ? content.prompts.has(item.to)
            : item.kind === 'template'
              ? content.templates.has(item.to)
              : content.collections.has(item.to);
        if (!item.to.startsWith(prefix) || !exists)
          findings.error(r.file, `redirect target ${item.to} is not an existing ${item.kind}`, {
            line,
            fix: 'point the redirect at the ID of the entry that replaces the old address',
          });
      } else {
        if (seen.has(item.from)) findings.error(r.file, `duplicate redirect from "${item.from}"`, { line });
        seen.add(item.from);
        if (item.from === item.to) findings.error(r.file, 'a redirect cannot point at itself', { line });
        if (homes.has(item.from))
          findings.error(r.file, `"${item.from}" is a language home; the redirect would hide it`, { line });
      }
    });
    r.gone.forEach((item, i) => {
      const line = r.lineOf(['gone', i]);
      if (live.get(item.kind)!.has(item.slug))
        findings.error(r.file, `"${item.slug}" is the slug of a current ${item.kind}; it cannot be gone`, { line });
      if (seen.has(`${item.kind}:${item.slug}`))
        findings.error(r.file, `"${item.slug}" is both redirected and gone`, {
          line,
          fix: 'keep the redirect if there is a replacement',
        });
    });
  }

  // --- List settings in site.yaml (§11.8.2) -----------------------------------------------------
  validateFeedSettings(content, config, findings);

  // --- Home settings in site.yaml (§11.8.1) -----------------------------------------------------
  validateHomeSettings(content, config, findings);

  // --- Maintenance hints (§14.3 info) -----------------------------------------------------------
  const unused = [...content.media.keys()].filter((id) => !usedAssets.has(id));
  if (unused.length)
    findings.info('content/media', `${unused.length} image(s) are not used by any entry: ${unused.join(', ')}`, {
      fix: 'use them, or remove them with their files once no published version references them (§10.4)',
    });
  for (const rec of content.media.values()) {
    const original = path.join(opts.mediaRoot, rec.data.original.key);
    if (fs.existsSync(original) && fs.statSync(original).size > 5 * 1024 * 1024)
      findings.info(rel(rec.file), `the original of ${rec.data.id} is over 5 MB`, {
        fix: 'a smaller source keeps imports and downloads fast',
      });
  }
}
