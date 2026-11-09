import { parseArgs } from 'node:util';
import { loadConfig } from '../src/config/load';
import { checkLocale } from './lib/localization/check';
import { ROOT } from './lib/paths';

let values: { locale?: string; strict?: boolean; json?: boolean };
try {
  ({ values } = parseArgs({
    options: { locale: { type: 'string' }, strict: { type: 'boolean' }, json: { type: 'boolean' } },
  }));
  if (!values.locale || !loadConfig(ROOT).locales.some((l) => l.code === values.locale))
    throw new Error('--locale must name a registered locale');
} catch (error) {
  console.error((error as Error).message);
  process.exit(2);
}
try {
  const report = checkLocale(ROOT, values.locale!);
  if (values.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(
      `${report.locale}: ${report.counts.published}/${report.counts.total} production pages; ${report.counts.approved} approved; ${report.counts.fields} shared/message fields; ready=${report.ready}`,
    );
    for (const f of report.findings)
      console.error(`${f.code} ${f.file}${f.field ? `#${f.field}` : ''}: ${f.reason}\n  ${f.fix}`);
  }
  process.exitCode = report.blocking || (values.strict && !report.ready) ? 1 : 0;
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
