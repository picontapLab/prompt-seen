// Imports frozen authored candidates into the existing review workflow. Never approves or enables a locale.
import fs from 'node:fs';
import path from 'node:path';
import { importTranslations } from '../../../scripts/lib/localization/import';

const root = path.resolve(import.meta.dirname, '../../..');
const dir = path.join(root, 'production/localization/it');
const input = JSON.parse(fs.readFileSync(path.join(dir, 'authoring/ready-batch.json'), 'utf8'));
const foundation = new Set(
  JSON.parse(fs.readFileSync(path.join(dir, 'batches/i0-foundation.json'), 'utf8')).operations.map(
    (op: { key: string }) => op.key,
  ),
);
const operations = input.operations.filter((op: { key: string }) => !foundation.has(op.key));
const batches: { name: string; keys: string[]; dependsOn: string[]; batchId?: string }[] = [];
for (const [group, size, pages] of [['shared', 100, false], ['pages', 20, true]] as const) {
  const selected = operations.filter((op: { sourceField: string[] }) => (op.sourceField[0] === '$page') === pages);
  for (let offset = 0; offset < selected.length; offset += size) {
    const name = `${group}-${String(offset / size + 1).padStart(2, '0')}`;
    const chunk = selected.slice(offset, offset + size);
    const batch = { schemaVersion: 1, locale: 'it', operations: chunk };
    fs.writeFileSync(path.join(dir, `batches/${name}.json`), JSON.stringify(batch, null, 2) + '\n');
    const result = await importTranslations(root, batch, true);
    if (result.conflicts.length) throw new Error(JSON.stringify({ name, conflicts: result.conflicts }));
    batches.push({ name, keys: chunk.map((op: { key: string }) => op.key), dependsOn: pages ? batches.filter((b) => b.name.startsWith('shared-')).map((b) => b.name) : ['i0-foundation'], batchId: result.batchId });
    fs.writeFileSync(path.join(dir, 'batch-plan.json'), JSON.stringify({ schemaVersion: 1, locale: 'it', state: 'pending-review', batches }, null, 2) + '\n');
    console.log(name, chunk.length, result.batchId);
  }
}
