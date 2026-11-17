import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { importTranslations } from '../../../scripts/lib/localization/import.ts';
import { promoteTranslations } from '../../../scripts/lib/localization/promote.ts';
const base = 'production/localization/zh-Hant/';
const plan = JSON.parse(fs.readFileSync(base + 'batch-plan.json'));
const approved = JSON.parse(fs.readFileSync(base + 'review/approved.json'));
const results = [];
for (const item of plan.batches) {
  const batch = JSON.parse(fs.readFileSync(item.file));
  const imported = await importTranslations(process.cwd(), batch, true);
  if (imported.conflicts.length) throw new Error(JSON.stringify(imported.conflicts));
  const reviews = { ...approved, records: approved.records.filter((r) => item.keys.includes(r.key)) };
  const promoted = await promoteTranslations(process.cwd(), 'zh-Hant', imported.batchId, reviews, true);
  results.push({
    name: item.name,
    batchId: imported.batchId,
    changes: promoted.changes.map(({ file, after }) => ({
      file,
      afterHash: after === null ? null : createHash('sha256').update(after).digest('hex'),
    })),
  });
  fs.writeFileSync(base + 'evidence/promotion.json', JSON.stringify(results, null, 2) + '\n');
  console.log(item.name, promoted.changes.length);
}
