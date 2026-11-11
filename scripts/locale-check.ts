import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from '../src/config/load';
import { analyzeLocale, readLocalizationSnapshot } from './lib/localization/check';
import { ROOT } from './lib/paths';

let values: { locale?: string; strict?: boolean; json?: boolean; all?: boolean };
try {
  ({ values } = parseArgs({
    options: {
      locale: { type: 'string' },
      strict: { type: 'boolean' },
      json: { type: 'boolean' },
      all: { type: 'boolean' },
    },
  }));
  if (!!values.locale === !!values.all) throw new Error('Provide exactly one of --locale or --all');
  if (values.locale && !loadConfig(ROOT).locales.some((l) => l.code === values.locale))
    throw new Error('--locale must name a registered locale');
} catch (error) {
  console.error((error as Error).message);
  process.exit(2);
}
try {
  const snapshot = readLocalizationSnapshot(ROOT);
  const locales = values.all
    ? snapshot.config.locales
        .filter(
          (locale) =>
            locale.enabled || locale.preview || fs.existsSync(path.join(ROOT, 'production/localization', locale.code)),
        )
        .map((locale) => locale.code)
    : [values.locale!];
  const reports = locales.map((locale) => analyzeLocale(snapshot, locale));
  if (values.json) console.log(JSON.stringify(values.all ? { schemaVersion: 2, reports } : reports[0], null, 2));
  else
    for (const report of reports) {
      console.log(
        `${report.locale}: ${report.counts.localCurrent}/${report.counts.target} current; ${report.counts.fallback} fallback; ${report.counts.fieldsCurrent}/${report.counts.fieldsTotal} fields; ready=${report.ready}`,
      );
      for (const f of report.findings)
        console.error(`${f.code} ${f.file}${f.field ? '#' + f.field : ''}: ${f.reason}\n  ${f.fix}`);
    }
  process.exitCode = reports.some((report) => report.blocking || (values.strict && !report.ready)) ? 1 : 0;
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
