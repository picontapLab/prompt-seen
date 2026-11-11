import { parseArgs } from 'node:util';
import { loadConfig } from '../src/config/load';
import { updateScope } from './lib/localization/scope';
import { ROOT } from './lib/paths';

let values: { locale?: string; apply?: boolean };
try {
  ({ values } = parseArgs({ options: { locale: { type: 'string' }, apply: { type: 'boolean' } } }));
  if (!values.locale || !loadConfig(ROOT).locales.some((locale) => locale.code === values.locale))
    throw new Error('Usage: locale:scope --locale CODE [--apply]');
} catch (error) {
  console.error((error as Error).message);
  process.exit(2);
}
try {
  console.log(JSON.stringify(await updateScope(ROOT, values.locale!, values.apply), null, 2));
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
