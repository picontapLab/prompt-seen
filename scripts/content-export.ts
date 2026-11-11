// content:export (design doc §14.1, §9.10.4): the published content as JSON, or as the Markdown
// documents the site serves at index.md. Reads and validates content/ like content:build, so the
// export never comes from stale generated files; only versions a public page shows are exported.
//
//   npm run content:export                                  JSON for every public locale into export/
//   npm run content:export -- --format markdown             one .md per prompt and template
//   npm run content:export -- --locale en --kind template --out /tmp/x
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from '../src/config/load';
import { catalogTranslator } from '../src/i18n/translator';
import { createGeoDocuments, type GeoSources, type MarkdownKind } from '../src/modules/geo/documents';
import { createUrlModule, urlConfigOf } from '../src/modules/url/create';
import { pageSections } from '../src/ui/navigation/sections';
import { printFindings } from './lib/content/findings';
import { loadContent } from './lib/content/load';
import { builtReader, exportJson } from './lib/export';
import { ROOT } from './lib/paths';
import { validateBuildMessages } from './lib/localization/messages';

const { values } = parseArgs({
  options: {
    format: { type: 'string', default: 'json' },
    locale: { type: 'string' },
    kind: { type: 'string', default: 'all' },
    out: { type: 'string', default: 'export' },
  },
});

function fail(message: string): never {
  console.error(`content:export: ${message}`);
  process.exit(1);
}

if (values.format !== 'json' && values.format !== 'markdown') fail('--format is json or markdown');
const kinds: MarkdownKind[] =
  values.kind === 'all'
    ? ['prompt', 'template']
    : values.kind === 'prompt' || values.kind === 'template'
      ? [values.kind]
      : fail('--kind is prompt, template or all');

const config = loadConfig(ROOT);
const url = createUrlModule(urlConfigOf(config));
const { findings, built } = loadContent({ root: ROOT, config, url });
validateBuildMessages(ROOT, config, findings);
if (!built || findings.blocking) {
  printFindings(
    findings.list.filter((f) => f.level === 'error' || f.level === 'publish'),
    'content:export stopped',
  );
  process.exit(1);
}

const publicLocales = config.builtLocales.filter((l) => l.enabled);
const requested = values.locale?.split(',').map((code) => code.trim());
const locales = requested
  ? requested.map((code) => publicLocales.find((l) => l.code === code) ?? fail(`${code} is not a public locale`))
  : publicLocales;

const sources: GeoSources = {
  buildMode: config.buildMode,
  siteName: config.siteName,
  defaultLocale: config.defaultLocale,
  locales: config.builtLocales,
  reader: builtReader(built),
  url,
  absoluteImageUrl: (variant) => url.absoluteMediaUrl(variant.key),
  translator: (code) => catalogTranslator(ROOT, code),
  sections: pageSections(),
};

const out = path.resolve(ROOT, values.out!);
fs.mkdirSync(out, { recursive: true });
let files = 0;
const write = (file: string, contents: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  files++;
};

if (values.format === 'json') {
  for (const locale of locales)
    write(
      path.join(out, `${locale.code}.json`),
      `${JSON.stringify(exportJson(sources, config.buildId, locale, kinds), null, 2)}\n`,
    );
} else {
  const geo = createGeoDocuments(sources);
  for (const kind of kinds)
    for (const entry of geo.markdownEntries(kind).filter((e) => locales.includes(e.locale)))
      write(path.join(out, entry.locale.code, `${kind}s`, `${entry.slug}.md`), geo.markdown(entry)!);
}
console.log(
  `content:export: ${files} file(s) in ${path.relative(ROOT, out) || '.'}/ (${values.format}, ${locales.map((l) => l.code).join(', ')})`,
);
