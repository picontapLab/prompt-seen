import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import { loadConfig } from '../../../src/config/load';
import { createUrlModule, urlConfigOf } from '../../../src/modules/url/create';
import { catalogDir, listNamespaces, readCatalog } from '../../../src/i18n/catalog';
import { loadContent } from '../content/load';
import { buildIndex } from '../content/build-index';
import { localeStates, sourceLocaleOf } from '../content/rules';
import { type Finding, Findings } from '../content/findings';
import { type LocaleFile } from '../content/read';
import { dependencyFields, unitsOf, type Field } from './dependencies';
import { fingerprint } from './fingerprint';
import { validateBuildMessages } from './messages';

export type LocaleFinding = Finding & { code: string; reason: string; fix: string };
const reviewSchema = z
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
const scopeSchema = z
  .object({
    schemaVersion: z.literal(1),
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
    removals: z.array(z.object({ key: z.string(), reason: z.string().trim().min(1) })).default([]),
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
  reviewStatus: string;
  dependencies: string[];
  dependencyGaps: string[];
};
export type LocaleReport = {
  schemaVersion: 1;
  locale: string;
  sourceRevision: string;
  scopeFingerprint: string;
  counts: Record<string, number>;
  ready: boolean;
  blocking: boolean;
  items: CheckItem[];
  fields: Field[];
  findings: LocaleFinding[];
  changes: {
    added: string[];
    changed: string[];
    changedFields: string[];
    removed: { key: string; reason: string | null }[];
  };
};

export const pageFingerprint = (file: LocaleFile) =>
  fingerprint({
    title: file.fm.title,
    description: file.fm.description,
    body: file.body,
    seoTitle: file.fm.seoTitle ?? null,
    seoDescription: file.fm.seoDescription ?? null,
    reasons: file.fm.reasons ?? {},
  });

/** Fresh production models, including a simulated enabled locale; never writes build output. */
export function checkLocale(root: string, locale: string): LocaleReport {
  const config = loadConfig(root, { ...process.env, BUILD_MODE: 'production' });
  if (!config.locales.some((l) => l.code === locale)) throw new Error(`Unknown locale: ${locale}`);
  const loaded = loadContent({ root, config, url: createUrlModule(urlConfigOf(config)) });
  validateBuildMessages(root, config, loaded.findings);
  const findings: LocaleFinding[] = loaded.findings.list
    .filter((f) => f.level === 'error' || f.level === 'publish')
    .map((f) => ({
      ...f,
      code: 'content.invalid',
      reason: f.message,
      fix: f.fix ?? 'Correct the source content before checking coverage.',
    }));
  const add = (code: string, file: string, field: string, reason: string, fix: string) =>
    findings.push({ code, file, field, reason, message: reason, fix, level: 'warning' });
  const metadataDir = path.join(root, 'production/localization', locale);
  const reviewFile = path.join(metadataDir, 'reviews.json');
  const reviews = fs.existsSync(reviewFile)
    ? reviewSchema.parse(JSON.parse(fs.readFileSync(reviewFile, 'utf8')))
    : { locale, records: [] };
  if (reviews.locale !== locale) throw new Error('Review locale does not match');
  const reviewed = (key: string, sourceHash: string, targetHash: string | null) => {
    const record = reviews.records
      .filter((r) => r.key === key)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
    return (
      !!record &&
      record.conclusion === 'approved' &&
      record.sourceHash === sourceHash &&
      record.targetHash === targetHash &&
      Date.parse(record.completedAt) <= Date.now()
    );
  };
  const content = loaded.content;
  const units = unitsOf(content);
  // Do not let global structural errors turn an invalid build into an apparently ready empty set.
  const actual =
    loaded.built ??
    (loaded.findings.count('error') === 0 ? buildIndex(content, config, createUrlModule(urlConfigOf(config))) : null);
  const targetKeys = new Set(actual?.details.filter((d) => d.locale !== locale).map((d) => `${d.kind}/${d.key}`) ?? []);
  const simulatedConfig = {
    ...config,
    locales: config.locales.map((l) => (l.code === locale ? { ...l, enabled: true } : l)),
  };
  simulatedConfig.builtLocales = simulatedConfig.locales.filter((l) => l.enabled);
  const simulated = actual ? buildIndex(content, simulatedConfig, createUrlModule(urlConfigOf(simulatedConfig))) : null;
  const published = new Set(
    simulated?.details.filter((d) => d.locale === locale).map((d) => `${d.kind}/${d.key}`) ?? [],
  );
  const allFields = new Map<string, Field>();
  const items: CheckItem[] = [];
  for (const unit of units.filter((u) => targetKeys.has(u.key)).sort((a, b) => a.key.localeCompare(b.key))) {
    const sourceLocale = sourceLocaleOf(unit.locales)!;
    const source = unit.locales.get(sourceLocale)!;
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
    if (!published.has(unit.key) || state?.outdated)
      add(
        'locale.page',
        targetFile,
        'status',
        `${unit.key}: ${pageStatus}; requires a current production-publishable translation`,
        'Translate and review this page, including its dependencies.',
      );
    const reviewStatus = reviewed(unit.key, sourceFingerprint, targetHash) ? 'approved' : 'unreviewed';
    if (reviewStatus !== 'approved')
      add(
        'locale.review',
        targetFile,
        'translation',
        `${unit.key}: no current approval bound to both fingerprints`,
        'Complete a language review and record the actual reviewer, time and fingerprints.',
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
      prompt?.promptLocales.has(locale) ||
      [...(template?.versions.values() ?? [])].some((v) => v.promptLocales.has(locale))
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
      reviewStatus,
      dependencies: dependencies.map((f) => f.key),
      dependencyGaps: [],
    });
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
    if (!present)
      add(
        'locale.field',
        field.file,
        field.targetField.join('.'),
        'Required translated field is missing or empty',
        'Add a translation at this exact field; source fallback is not coverage.',
      );
    if (!reviewed(field.key, field.sourceHash, field.targetHash))
      add(
        'locale.field-review',
        field.file,
        field.targetField.join('.'),
        'No current field review',
        'Review the exact source and target and record both fingerprints.',
      );
  }
  for (const item of items)
    item.dependencyGaps = item.dependencies.filter((key) => {
      const field = allFields.get(key)!;
      return !field.targetHash || !reviewed(key, field.sourceHash, field.targetHash);
    });
  const scopeFingerprint = fingerprint({
    items: items.map((i) => [i.key, i.sourceFingerprint]),
    fields: [...allFields.values()].sort((a, b) => a.key.localeCompare(b.key)).map((f) => [f.key, f.sourceHash]),
    home: config.home,
    feed: config.feed,
    locales: config.locales.filter((l) => l.enabled && l.code !== locale).map((l) => l.code),
  });
  const changes: LocaleReport['changes'] = { added: [], changed: [], changedFields: [], removed: [] };
  const scopeFile = path.join(metadataDir, 'scope.json');
  if (fs.existsSync(scopeFile)) {
    const scope = scopeSchema.parse(JSON.parse(fs.readFileSync(scopeFile, 'utf8')));
    if (scope.locale !== locale) throw new Error('Scope locale does not match');
    const before = new Map(scope.items.map((i) => [i.key, i.sourceHash]));
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
      if (!targetKeys.has(key)) {
        const reason = scope.removals.find((r) => r.key === key)?.reason ?? null;
        changes.removed.push({ key, reason });
        const unit = units.find((u) => u.key === key);
        if (!reason || !unit || ![...unit.locales.values()].every((f) => f.fm.status === 'archived'))
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
    total: items.length,
    published: items.filter((i) => i.pageStatus === 'published').length,
    approved: items.filter((i) => i.reviewStatus === 'approved').length,
    fields: allFields.size,
  };
  for (const item of items) counts[item.kind] = (counts[item.kind] ?? 0) + 1;
  return {
    schemaVersion: 1,
    locale,
    sourceRevision,
    scopeFingerprint,
    counts,
    ready: findings.length === 0,
    blocking: loaded.findings.blocking > 0,
    items,
    fields: [...allFields.values()].sort((a, b) => a.key.localeCompare(b.key)),
    findings: findings.sort(
      (a, b) =>
        a.file.localeCompare(b.file) || (a.field ?? '').localeCompare(b.field ?? '') || a.code.localeCompare(b.code),
    ),
    changes,
  };
}

/** Enabled Japanese is a release invariant, including direct/manual builds. */
export function validateEnabledLocale(root: string, findings: Findings): void {
  const config = loadConfig(root);
  if (!config.locales.some((l) => l.code === 'ja' && l.enabled)) return;
  const report = checkLocale(root, 'ja');
  for (const finding of report.findings) findings.add({ ...finding, level: 'publish' });
}
