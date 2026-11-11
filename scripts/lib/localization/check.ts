import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import type { LocalizationPolicy, ResolvedConfig } from '../../../src/config/schema';
import { classifyLocalization, reviewState, selectDescription, type LocalStatus } from '../content/localization';
import { loadConfig, contentDir } from '../../../src/config/load';
import { catalogDir, listNamespaces, readCatalog } from '../../../src/i18n/catalog';
import { readContent, type Content } from '../content/read';
import { validateContent } from '../content/validate';
import { COLLECTION_MIN_ITEMS, TOPIC_MIN_PROMPTS, localeStates, sourceLocaleOf } from '../content/rules';
import { type Finding, Findings } from '../content/findings';
import { type LocaleFile } from '../content/read';
import { dependencyFields, globalDependencyFields, unitsOf, unitPublishProblems, type Field } from './dependencies';
import { fingerprint, proseFingerprint } from './fingerprint';
import { verifiedRemoval } from './scope-evidence';
import { validateBuildMessages } from './messages';

export type LocaleFinding = Finding & {
  code: string;
  reason: string;
  fix: string;
  locale: string;
  key: string;
  severity: 'error' | 'warning';
  blockingForRelease: boolean;
};
export const reviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    locale: z.string(),
    records: z.array(
      z
        .object({
          key: z.string().min(1),
          sourceHash: z.string().min(1),
          targetHash: z.string().min(1),
          reviewer: z.string().trim().min(1),
          completedAt: z.iso.datetime({ offset: true }),
          conclusion: z.enum(['approved', 'changes-requested']),
          reason: z.string().trim().min(1).optional(),
        })
        .strict(),
    ),
  })
  .strict();
export const scopeSchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    policyFingerprint: z.string().optional(),
    locale: z.string(),
    sourceRevision: z.string(),
    scopeFingerprint: z.string(),
    items: z.array(z.object({ key: z.string(), sourceHash: z.string(), dependencies: z.array(z.string()) })),
    fields: z.array(
      z.object({
        key: z.string(),
        sourceHash: z.string(),
        sourceFile: z.string(),
        sourceField: z.array(z.union([z.string(), z.number()])),
      }),
    ),
    removals: z
      .array(
        z.object({
          key: z.string(),
          reason: z.string().trim().min(1),
          evidence: z.object({ file: z.string(), key: z.string(), fingerprint: z.string() }).optional(),
        }),
      )
      .default([]),
  })
  .strict();
export type CheckItem = {
  key: string;
  kind: string;
  sourceFile: string;
  targetFile: string;
  sourceLocale: string;
  sourceHash: string;
  sourceFingerprint: string;
  targetHash: string | null;
  pageStatus: string;
  localStatus: LocalStatus;
  presentation: 'local' | 'fallback' | 'draft' | null;
  indexable: boolean;
  declaredStatus: string | null;
  reviewStatus: string;
  dependencies: string[];
  dependencyGaps: string[];
};
export type LocaleReport = {
  schemaVersion: 2;
  policy: LocalizationPolicy;
  policyFingerprint: string;
  evaluationMode: 'candidate-production';
  locale: string;
  sourceRevision: string;
  scopeFingerprint: string;
  counts: Record<string, number>;
  countsByKind: Record<string, Record<string, number>>;
  ready: boolean;
  blocking: boolean;
  items: CheckItem[];
  fields: Field[];
  publishedDependencies: string[];
  findings: LocaleFinding[];
  changes: {
    added: string[];
    changed: string[];
    changedFields: string[];
    changedTargets: string[];
    changedDependencies: string[];
    removed: { key: string; reason: string | null }[];
  };
};

export const pageFingerprint = (file: LocaleFile) => proseFingerprint({ ...file.fm, body: file.body });

export type LocalizationSnapshot = { root: string; config: ResolvedConfig; content: Content; findings: Findings };

// Memoize version classification only within one immutable read snapshot.
const versionStates = new WeakMap<LocalizationSnapshot, Map<string, LocalStatus>>();

/** Read once for one or many candidate languages. Never calls the gated content loader. */
export function readLocalizationSnapshot(root: string, options: { mediaRoot?: string } = {}): LocalizationSnapshot {
  const config = loadConfig(root, { ...process.env, BUILD_MODE: 'production' });
  const findings = new Findings(root);
  const content = readContent(contentDir(root), config.locales, findings);
  validateContent(content, config, findings, { mediaRoot: options.mediaRoot ?? path.join(root, 'public') });
  validateBuildMessages(root, config, findings);
  return { root, config, content, findings };
}

export function checkLocale(root: string, locale: string): LocaleReport {
  return analyzeLocale(readLocalizationSnapshot(root), locale);
}

export function analyzeLocale(loaded: LocalizationSnapshot, locale: string): LocaleReport {
  const { root, config } = loaded;
  let statesByVersion = versionStates.get(loaded);
  if (!statesByVersion) {
    statesByVersion = new Map();
    versionStates.set(loaded, statesByVersion);
  }
  const entry = config.locales.find((l) => l.code === locale);
  if (!entry) throw new Error(`Unknown locale: ${locale}`);
  const policy = entry.localization;
  const findings: LocaleFinding[] = loaded.findings.list
    .filter((f) => f.level === 'error' || f.level === 'publish')
    .map((f) => ({
      ...f,
      code: 'content.invalid',
      locale,
      key: f.file,
      severity: 'error' as const,
      blockingForRelease: true,
      reason: f.message,
      fix: f.fix ?? 'Correct the source content before checking coverage.',
    }));
  const add = (
    code: string,
    file: string,
    field: string,
    reason: string,
    fix: string,
    key = file,
    blockingForRelease = true,
  ) =>
    findings.push({
      code,
      file,
      field,
      reason,
      message: reason,
      fix,
      level: 'warning',
      locale,
      key,
      severity: 'warning',
      blockingForRelease,
    });
  const metadataDir = path.join(root, 'production/localization', locale);
  const reviewFile = path.join(metadataDir, 'reviews.json');
  const reviews = fs.existsSync(reviewFile)
    ? reviewSchema.parse(JSON.parse(fs.readFileSync(reviewFile, 'utf8')))
    : { locale, records: [] };
  if (reviews.locale !== locale) throw new Error('Review locale does not match');
  const reviewed = (key: string, sourceHash: string, targetHash: string | null) =>
    reviewState(key, sourceHash, targetHash, reviews.records) === 'current';
  const content = loaded.content;
  const units = unitsOf(content);
  for (const slug of ['about', 'license'])
    if (!content.pages.has(slug)) {
      add(
        'content.invalid',
        `content/pages/${slug}`,
        'locales',
        `Required ${slug} source page is missing`,
        'Restore the required source page before evaluating coverage.',
        `page/${slug}`,
      );
    }
  const declaredKeys = new Set(
    units
      .filter((unit) =>
        [...unit.locales].some(
          ([code, file]) =>
            file.fm.status === 'published' &&
            (code === locale || config.locales.some((entry) => entry.code === code && entry.enabled)),
        ),
      )
      .map((unit) => unit.key),
  );
  const scopeFile = path.join(metadataDir, 'scope.json');
  const scope = fs.existsSync(scopeFile) ? scopeSchema.parse(JSON.parse(fs.readFileSync(scopeFile, 'utf8'))) : null;
  if (scope && scope.locale !== locale) throw new Error('Scope locale does not match');
  const removedKeys = new Set(
    (scope?.removals ?? []).filter((removal) => verifiedRemoval(root, removal, units)).map((removal) => removal.key),
  );
  const targetKeys = new Set(
    [...declaredKeys, ...(scope?.items.map((item) => item.key) ?? []), 'page/about', 'page/license'].filter(
      (key) => !removedKeys.has(key) || key === 'page/about' || key === 'page/license',
    ),
  );
  const published = new Set(
    units
      .filter(
        (unit) =>
          unit.locales.get(locale)?.fm.status === 'published' &&
          unitPublishProblems(content, unit, locale).length === 0,
      )
      .map((unit) => unit.key),
  );
  const globalFields = globalDependencyFields(root, content, locale, config.defaultLocale);
  const allFields = new Map<string, Field>(globalFields.map((field) => [field.key, field]));
  const items: CheckItem[] = [];
  // A Japanese-only or outdated published consumer is still protected, even when it is
  // outside the other locales' launch target union.
  const publishedDependencies = [
    ...new Set([
      ...(entry.enabled ? globalFields.map((field) => field.key) : []),
      ...units
        .filter((unit) => unit.locales.get(locale)?.fm.status === 'published')
        .flatMap((unit) =>
          dependencyFields(root, content, unit, locale, config.defaultLocale).map((field) => field.key),
        ),
    ]),
  ].sort();
  for (const unit of units.filter((u) => targetKeys.has(u.key)).sort((a, b) => a.key.localeCompare(b.key))) {
    const sourceLocale = sourceLocaleOf(unit.locales);
    const source = sourceLocale && unit.locales.get(sourceLocale);
    if (!source || !sourceLocale) {
      add(
        'content.invalid',
        path.relative(root, unit.dir),
        'locales',
        'No unique source file',
        'Restore the unique source declaration.',
        unit.key,
      );
      continue;
    }
    const target = unit.locales.get(locale);
    const sourceFingerprint = pageFingerprint(source);
    const targetHash = target ? pageFingerprint(target) : null;
    const targetFile = path.relative(root, path.join(unit.dir, 'locales', `${locale}.mdx`));
    const dependencies = dependencyFields(root, content, unit, locale, config.defaultLocale);
    for (const field of dependencies) allFields.set(field.key, field);
    const state = localeStates(unit.locales).get(locale);
    const pageStatus = !target
      ? 'missing'
      : state?.outdated
        ? 'outdated'
        : published.has(unit.key)
          ? 'published'
          : target.fm.status;
    if (!target || target.fm.status !== 'published' || !published.has(unit.key) || state?.outdated)
      add(
        !target
          ? 'locale.page-missing'
          : target.fm.status === 'draft'
            ? 'locale.page-draft'
            : state?.outdated
              ? 'locale.outdated'
              : 'locale.page',
        targetFile,
        'status',
        `${unit.key}: ${pageStatus}; requires a current production-publishable translation`,
        'Translate and review this page, including its dependencies.',
        unit.key,
        policy.coverage === 'complete' ||
          (!state?.outdated &&
            ((unit.kind === 'page' && ['about', 'license'].includes(unit.id)) || target?.fm.status === 'published')),
      );
    const textReview =
      policy.review === 'metadata'
        ? state?.review === 'machine-draft'
          ? 'unreviewed'
          : state?.outdated
            ? 'outdated'
            : 'current'
        : reviewState(unit.key, sourceFingerprint, targetHash, reviews.records);
    const reviewStatus = textReview === 'current' ? 'approved' : textReview;
    const localStatus = classifyLocalization({
      declaredStatus: target?.fm.status ?? null,
      publishable: !!target && published.has(unit.key),
      review: textReview,
      dependencies: [],
    });
    if (policy.review === 'fingerprint' && reviewStatus !== 'approved')
      add(
        'locale.review',
        targetFile,
        'translation',
        `${unit.key}: no current approval bound to both fingerprints`,
        'Complete a language review and record the actual reviewer, time and fingerprints.',
        unit.key,
        policy.coverage === 'complete' || (textReview !== 'outdated' && target?.fm.status === 'published'),
      );
    if (target)
      for (const field of ['seoTitle', 'seoDescription'] as const)
        if (source.fm[field] && !target.fm[field]?.trim())
          add('locale.seo', targetFile, field, `Missing ${field}`, 'Translate the existing independent SEO text.');
    if (target)
      for (const key of Object.keys(source.fm.reasons ?? {}))
        if (!target.fm.reasons?.[key]?.trim())
          add(
            'locale.reason',
            targetFile,
            `reasons.${key}`,
            'Missing collection recommendation',
            'Translate the recommendation for this member.',
          );
    const prompt = content.prompts.get(unit.id);
    const template = content.templates.get(unit.id);
    if (
      policy.promptBodies === 'source-only' &&
      (prompt?.promptLocales.has(locale) ||
        [...(template?.versions.values() ?? [])].some((v) => v.promptLocales.has(locale)))
    )
      add(
        'locale.prompt-variant',
        targetFile,
        'prompt-locales',
        'Existing localized prompt body conflicts with the original-body launch policy',
        'Explicitly resolve this conflict; do not delete or silently switch the variant.',
      );
    items.push({
      key: unit.key,
      kind: unit.kind,
      sourceFile: path.relative(root, source.file),
      targetFile,
      sourceLocale,
      sourceHash: source.contentHash,
      sourceFingerprint,
      targetHash,
      pageStatus,
      localStatus,
      presentation: published.has(unit.key) ? (target?.fm.status === 'published' ? 'local' : 'fallback') : null,
      indexable: localStatus === 'current',
      declaredStatus: target?.fm.status ?? null,
      reviewStatus,
      dependencies: dependencies.map((f) => f.key),
      dependencyGaps: [],
    });
  }
  for (const saved of scope?.items ?? [])
    if (!removedKeys.has(saved.key) && !units.some((unit) => unit.key === saved.key)) {
      items.push({
        key: saved.key,
        kind: saved.key.split('/')[0]!,
        sourceFile: '',
        targetFile: '',
        sourceLocale: '',
        sourceHash: saved.sourceHash,
        sourceFingerprint: saved.sourceHash,
        targetHash: null,
        pageStatus: 'invalid',
        localStatus: 'invalid',
        presentation: null,
        indexable: false,
        declaredStatus: null,
        reviewStatus: 'unreviewed',
        dependencies: saved.dependencies,
        dependencyGaps: saved.dependencies,
      });
      add(
        'content.invalid',
        path.relative(root, scopeFile),
        saved.key,
        'A historical target has no readable source unit',
        'Restore it or provide formal removal evidence.',
        saved.key,
      );
    }
  // Message reviews use the same field-level contract as shared YAML. JSON is intentionally not importable.
  let sourceCatalog: ReturnType<typeof readCatalog> = {};
  try {
    sourceCatalog = readCatalog(root, config.defaultLocale);
  } catch {
    /* Shared validation already reports malformed source messages. */
  }
  for (const ns of listNamespaces(root, config.defaultLocale)) {
    const source = sourceCatalog[ns];
    if (source === undefined) continue;
    const targetPath = path.join(catalogDir(root, locale), `${ns}.json`);
    let target: unknown = null;
    try {
      target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    } catch {
      /* Message validation reports this. */
    }
    const walk = (value: unknown, translated: unknown, parts: string[]) => {
      if (value && typeof value === 'object') {
        for (const [key, v] of Object.entries(value))
          walk(v, translated && typeof translated === 'object' ? (translated as Record<string, unknown>)[key] : null, [
            ...parts,
            key,
          ]);
        return;
      }
      const file = path.relative(root, targetPath);
      const field: Field = {
        key: `${file}#${parts.join('.')}`,
        file,
        sourceFile: path.relative(root, path.join(catalogDir(root, config.defaultLocale), `${ns}.json`)),
        sourceField: parts,
        targetField: parts,
        sourceLocale: config.defaultLocale,
        source: value,
        target: translated ?? null,
        sourceHash: fingerprint({ field: parts, value }),
        targetHash: translated == null ? null : fingerprint({ field: parts, value: translated }),
      };
      allFields.set(field.key, field);
    };
    walk(source, target, []);
  }
  for (const field of allFields.values()) {
    const present =
      typeof field.target === 'string'
        ? !!field.target.trim()
        : Array.isArray(field.target) &&
          field.target.length > 0 &&
          field.target.every((v) => typeof v === 'string' && v.trim());
    const required =
      policy.coverage === 'complete' ||
      field.file.startsWith('src/i18n/') ||
      globalFields.some((global) => global.key === field.key) ||
      publishedDependencies.includes(field.key);
    if (!present)
      add(
        field.file.startsWith('src/i18n/') ? 'locale.message' : 'locale.field',
        field.file,
        field.targetField.join('.'),
        'Required translated field is missing or empty',
        'Add a translation at this exact field; source fallback is not coverage.',
        field.key,
        required && (policy.review === 'fingerprint' || field.file.startsWith('src/i18n/')),
      );
    if (policy.review === 'fingerprint' && !reviewed(field.key, field.sourceHash, field.targetHash))
      add(
        'locale.field-review',
        field.file,
        field.targetField.join('.'),
        'No current field review',
        'Review the exact source and target and record both fingerprints.',
        field.key,
        required &&
          (policy.coverage === 'complete' ||
            field.file.startsWith('src/i18n/') ||
            globalFields.some((global) => global.key === field.key) ||
            reviewState(field.key, field.sourceHash, field.targetHash, reviews.records) !== 'outdated'),
      );
  }
  const knownKeys = new Set([
    ...targetKeys,
    ...allFields.keys(),
    ...(scope?.fields.map((field) => field.key) ?? []),
    ...(scope?.removals.map((removal) => removal.key) ?? []),
  ]);
  for (const record of reviews.records)
    if (!knownKeys.has(record.key) || Date.parse(record.completedAt) > Date.now())
      add(
        'content.invalid',
        path.relative(root, reviewFile),
        record.key,
        'Review has an unknown key or future completion time',
        'Use actual completed review evidence for a current or historical scope key.',
        record.key,
      );
  for (const item of items)
    item.dependencyGaps = item.dependencies.filter((key) => {
      const field = allFields.get(key);
      return (
        !field ||
        !field.targetHash ||
        (policy.review === 'fingerprint' && !reviewed(key, field.sourceHash, field.targetHash))
      );
    });
  const otherReviews = new Map([[locale, reviews.records]]);
  const recordsFor = (code: string) => {
    if (!otherReviews.has(code)) {
      const file = path.join(root, 'production/localization', code, 'reviews.json');
      otherReviews.set(
        code,
        fs.existsSync(file) ? reviewSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8'))).records : [],
      );
    }
    return otherReviews.get(code)!;
  };
  for (const item of items) {
    const unit = units.find((unit) => unit.key === item.key);
    if (!unit) continue;
    item.localStatus = classifyLocalization({
      declaredStatus: item.declaredStatus,
      publishable: published.has(item.key),
      review:
        item.reviewStatus === 'approved' ? 'current' : item.reviewStatus === 'outdated' ? 'outdated' : 'unreviewed',
      dependencies:
        policy.review === 'fingerprint'
          ? item.dependencies.map((key) => {
              const field = allFields.get(key);
              return field ? reviewState(key, field.sourceHash, field.targetHash, reviews.records) : 'unreviewed';
            })
          : [],
    });
    const versions = new Map(
      config.locales.map((entry) => {
        const file = unit.locales.get(entry.code);
        const state = localeStates(unit.locales).get(entry.code);
        const versionKey = `${entry.code}:${unit.key}`;
        const status =
          entry.code === locale
            ? item.localStatus
            : (statesByVersion!.get(versionKey) ??
              classifyLocalization({
                declaredStatus: file?.fm.status ?? null,
                publishable: !!file && unitPublishProblems(content, unit, entry.code).length === 0,
                review:
                  entry.localization.review === 'fingerprint' && file?.fm.status === 'published'
                    ? reviewState(
                        unit.key,
                        pageFingerprint(unit.locales.get(sourceLocaleOf(unit.locales)!)!),
                        file ? pageFingerprint(file) : null,
                        recordsFor(entry.code),
                      )
                    : state?.review === 'machine-draft'
                      ? 'unreviewed'
                      : state?.outdated
                        ? 'outdated'
                        : 'current',
                dependencies:
                  entry.localization.review === 'fingerprint' && file?.fm.status === 'published'
                    ? dependencyFields(root, content, unit, entry.code, config.defaultLocale).map((field) =>
                        reviewState(field.key, field.sourceHash, field.targetHash, recordsFor(entry.code)),
                      )
                    : [],
              }));
        statesByVersion!.set(versionKey, status);
        return [entry.code, { status, published: file?.fm.status === 'published' }] as const;
      }),
    );
    const selected = selectDescription({
      locale,
      defaultLocale: config.defaultLocale,
      sourceLocale: item.sourceLocale,
      registry: config.locales.map((l) => l.code),
      preview: false,
      standalone: item.kind === 'page',
      versions,
    });
    item.presentation = selected?.presentation ?? null;
    item.indexable = item.localStatus === 'current' && !!selected;
  }
  const byKey = new Map(items.map((item) => [item.key, item]));
  for (const item of items) {
    let members: CheckItem[] | null = null;
    let minimum = 0;
    if (item.kind === 'collection') {
      members = (content.collections.get(item.key.slice('collection/'.length))?.data.items ?? []).flatMap(
        (id) => byKey.get(`prompt/${id}`) ?? byKey.get(`template/${id}`) ?? [],
      );
      minimum = COLLECTION_MIN_ITEMS;
    } else if (item.kind === 'topic') {
      const topic = content.topics.find((topic) => `topic/${topic.taxonomy}/${topic.termId}` === item.key);
      members = [...content.prompts.values()]
        .filter(
          ({ data }) =>
            topic &&
            (topic.taxonomy === 'category'
              ? data.categoryId === topic.termId
              : (topic.taxonomy === 'style' ? data.styleIds : data.useCaseIds).includes(topic.termId)),
        )
        .flatMap(({ data }) => byKey.get(`prompt/${data.id}`) ?? []);
      minimum = TOPIC_MIN_PROMPTS;
    }
    if (members) {
      const visible = members.filter((member) => member.presentation !== null);
      if (visible.length < minimum) item.presentation = null;
      item.indexable &&= visible.length >= minimum && visible.every((member) => member.indexable);
    }
  }
  const scopeFingerprint = fingerprint({
    items: items.map((i) => [i.key, i.sourceFingerprint]),
    fields: [...allFields.values()].sort((a, b) => a.key.localeCompare(b.key)).map((f) => [f.key, f.sourceHash]),
    home: config.home,
    feed: config.feed,
    locales: config.locales.filter((l) => l.enabled && l.code !== locale).map((l) => l.code),
  });
  const changes: LocaleReport['changes'] = {
    added: [],
    changed: [],
    changedFields: [],
    changedTargets: [],
    changedDependencies: [],
    removed: [],
  };
  changes.changedTargets = items
    .filter(
      (item) =>
        reviews.records.some((record) => record.key === item.key && record.targetHash !== item.targetHash) &&
        item.reviewStatus !== 'approved',
    )
    .map((item) => item.key);
  if (scope) {
    const before = new Map(scope.items.map((i) => [i.key, i.sourceHash]));
    changes.changedDependencies = items
      .filter((item) => {
        const previous = scope.items.find((saved) => saved.key === item.key);
        return (
          previous && fingerprint([...previous.dependencies].sort()) !== fingerprint([...item.dependencies].sort())
        );
      })
      .map((item) => item.key);
    const previousFields = new Map(scope.fields.map((f) => [f.key, f.sourceHash]));
    changes.changedFields = [...allFields.values()]
      .filter((f) => previousFields.get(f.key) !== f.sourceHash)
      .map((f) => f.key)
      .sort();
    changes.added = items.filter((i) => !before.has(i.key)).map((i) => i.key);
    changes.changed = items
      .filter((i) => before.has(i.key) && before.get(i.key) !== i.sourceFingerprint)
      .map((i) => i.key);
    for (const key of before.keys())
      if (!declaredKeys.has(key)) {
        const reason = scope.removals.find((r) => r.key === key)?.reason ?? null;
        changes.removed.push({ key, reason });
        if (!removedKeys.has(key))
          add(
            'locale.scope-removal',
            path.relative(root, scopeFile),
            key,
            'Target removed without documented formal archival',
            'Restore the public source or document and archive the content explicitly.',
          );
      }
  } else {
    changes.added = items.map((i) => i.key);
    add(
      'locale.scope-missing',
      path.relative(root, scopeFile),
      'items',
      'No initial scope snapshot is recorded',
      'Record the initial target keys and source fingerprints before release.',
      locale,
      policy.review === 'fingerprint',
    );
  }
  let sourceRevision = 'unknown';
  try {
    sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    /* Fixtures need no git repository. */
  }
  const counts: Record<string, number> = {
    target: items.length,
    visible: items.filter((item) => item.presentation !== null).length,
    fallback: items.filter((item) => item.presentation === 'fallback').length,
    localCurrent: items.filter((item) => item.localStatus === 'current').length,
    indexable: items.filter((item) => item.indexable).length,
    fieldsTotal: allFields.size,
    fieldsCurrent: [...allFields.values()].filter(
      (field) =>
        field.targetHash && (policy.review === 'metadata' || reviewed(field.key, field.sourceHash, field.targetHash)),
    ).length,
    total: items.length,
    published: items.filter((i) => i.pageStatus === 'published').length,
    approved: items.filter((i) => i.reviewStatus === 'approved').length,
    fields: allFields.size,
  };
  for (const status of ['missing', 'draft', 'outdated', 'unreviewed', 'archived', 'invalid'])
    counts[status] = items.filter((item) => item.localStatus === status).length;
  for (const item of items) counts[item.kind] = (counts[item.kind] ?? 0) + 1;
  return {
    schemaVersion: 2,
    policy,
    policyFingerprint: fingerprint(policy),
    evaluationMode: 'candidate-production',
    locale,
    sourceRevision: `${sourceRevision}:${fingerprint({ sources: scopeFingerprint, targets: items.map((item) => [item.key, item.targetHash, item.declaredStatus]), fields: [...allFields.values()].map((field) => [field.key, field.targetHash]) }).slice(7)}`,
    scopeFingerprint,
    counts,
    countsByKind: Object.fromEntries(
      [...new Set(items.map((item) => item.kind))].map((kind) => {
        const group = items.filter((item) => item.kind === kind);
        return [
          kind,
          {
            target: group.length,
            visible: group.filter((item) => item.presentation !== null).length,
            fallback: group.filter((item) => item.presentation === 'fallback').length,
            indexable: group.filter((item) => item.indexable).length,
            localCurrent: group.filter((item) => item.localStatus === 'current').length,
            ...Object.fromEntries(
              ['missing', 'draft', 'outdated', 'unreviewed', 'archived', 'invalid'].map((status) => [
                status,
                group.filter((item) => item.localStatus === status).length,
              ]),
            ),
          },
        ];
      }),
    ),
    ready: !findings.some((finding) => finding.blockingForRelease),
    blocking:
      loaded.findings.blocking > 0 ||
      findings.some((f) => f.code === 'content.invalid') ||
      items.some((item) => item.declaredStatus === 'published' && item.localStatus === 'unreviewed'),
    items,
    publishedDependencies,
    fields: [...allFields.values()]
      .map((field) => ({
        ...field,
        reviewStatus:
          policy.review === 'fingerprint'
            ? reviewState(field.key, field.sourceHash, field.targetHash, reviews.records)
            : field.targetHash
              ? 'current'
              : 'unreviewed',
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    findings: findings.sort(
      (a, b) =>
        a.file.localeCompare(b.file) || (a.field ?? '').localeCompare(b.field ?? '') || a.code.localeCompare(b.code),
    ),
    changes,
  };
}

/** Release invariant shared by direct, CI and manual builds. */
export function validateEnabledLocale(root: string, findings: Findings): void {
  const snapshot = readLocalizationSnapshot(root);
  for (const entry of snapshot.config.locales.filter((entry) => entry.enabled)) {
    const report = analyzeLocale(snapshot, entry.code);
    for (const finding of report.findings)
      if (finding.blockingForRelease) findings.add({ ...finding, level: 'publish' });
  }
}
