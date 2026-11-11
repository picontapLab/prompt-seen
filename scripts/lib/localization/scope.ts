import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { contentDir } from '../../../src/config/load';
import { acquireContentLock } from '../content-production/lock';
import { applyChanges } from '../media-generation/transaction';
import { within } from '../media-generation/files';
import { checkLocale, scopeSchema } from './check';

/** An explicit scope update never discards historical targets or supplies review evidence. */
export async function updateScope(root: string, locale: string, apply = false) {
  const release = apply ? acquireContentLock(root) : () => {};
  try {
    const report = checkLocale(root, locale);
    const file = `production/localization/${locale}/scope.json`;
    const target = within(root, file);
    const previous = fs.existsSync(target) ? scopeSchema.parse(JSON.parse(fs.readFileSync(target, 'utf8'))) : null;
    if (report.findings.some((finding) => finding.code === 'locale.scope-removal'))
      throw new Error('Scope removal requires verified archival or deletion evidence');
    if (report.findings.some((finding) => finding.code === 'content.invalid'))
      throw new Error('Fix structural errors before updating scope');
    const scope = {
      schemaVersion: 2,
      locale,
      sourceRevision: report.sourceRevision,
      scopeFingerprint: report.scopeFingerprint,
      policyFingerprint: report.policyFingerprint,
      items: report.items.map((item) => ({
        key: item.key,
        sourceHash: item.sourceFingerprint,
        dependencies: item.dependencies,
      })),
      fields: report.fields.map((field) => ({
        key: field.key,
        sourceHash: field.sourceHash,
        sourceFile: field.sourceFile,
        sourceField: field.sourceField,
      })),
      removals: previous?.removals ?? [],
    };
    if (apply) {
      if (contentDir(root) !== path.join(path.resolve(root), 'content'))
        throw new Error('Scope writes require the repository content directory');
      await applyChanges(
        root,
        path.join(root, '.artifacts/localization', locale, 'transactions', `${randomUUID()}.json`),
        [{ file, after: JSON.stringify(scope, null, 2) + '\n' }],
        () => {},
      );
    }
    return { scope, changes: report.changes };
  } finally {
    release();
  }
}
