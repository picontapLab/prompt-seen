import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { loadConfig } from '../src/config/load';
import { promoteTranslations } from './lib/localization/promote';
import { ROOT } from './lib/paths';

let values: { locale?: string; batch?: string; reviews?: string; apply?: boolean };
try {
  ({ values } = parseArgs({
    options: {
      locale: { type: 'string' },
      batch: { type: 'string' },
      reviews: { type: 'string' },
      apply: { type: 'boolean' },
    },
  }));
  if (
    !values.locale ||
    !loadConfig(ROOT).locales.some((entry) => entry.code === values.locale) ||
    !values.batch ||
    !/^[a-f0-9]{64}$/.test(values.batch) ||
    !values.reviews
  )
    throw new Error('Usage: locale:promote --locale CODE --batch BATCH_ID --reviews records.json [--apply]');
} catch (error) {
  console.error((error as Error).message);
  process.exit(2);
}
try {
  const result = await promoteTranslations(
    ROOT,
    values.locale!,
    values.batch!,
    JSON.parse(fs.readFileSync(values.reviews!, 'utf8')),
    values.apply,
  );
  console.log(JSON.stringify({ mode: values.apply ? 'applied' : 'dry-run', changes: result.changes }, null, 2));
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
