import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { importTranslations } from './lib/localization/import';
import { ROOT } from './lib/paths';

let values;
try {
  ({ values } = parseArgs({
    options: { locale: { type: 'string' }, file: { type: 'string' }, apply: { type: 'boolean' } },
  }));
  if (values.locale !== 'ja' || !values.file)
    throw new Error('Usage: locale:import --locale ja --file translations.json [--apply]');
} catch (error) {
  console.error((error as Error).message);
  process.exit(2);
}
try {
  const input = JSON.parse(fs.readFileSync(values.file!, 'utf8'));
  if (input.locale !== values.locale) throw new Error('Batch locale differs from --locale');
  const result = await importTranslations(ROOT, input, values.apply);
  console.log(
    JSON.stringify(
      {
        mode: values.apply ? (result.pendingReview ? 'pending-review' : 'applied') : 'dry-run',
        files: result.changes.map((c) => c.file),
        fields: result.fields,
        conflicts: result.conflicts,
      },
      null,
      2,
    ),
  );
  process.exitCode = result.conflicts.length ? 1 : 0;
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
