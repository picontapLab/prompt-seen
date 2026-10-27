// content:validate (design doc §14.3): the instance configuration, the UI message catalogs,
// and every content file: schemas, references, template rules, media files, redirects and the
// publishing rules of each locale version. Exit code 1 on errors or publish errors.
//
//   npm run content:validate             everything
//   npm run content:validate -- --quiet  without info-level maintenance hints
import fs from 'node:fs';
import path from 'node:path';
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { ConfigError, loadConfig } from '../src/config/load';
import { catalogDir, listNamespaces, readCatalog, type Messages } from '../src/i18n/catalog';
import { createUrlModule, urlConfigOf } from '../src/modules/url/create';
import { Findings, printFindings } from './lib/content/findings';
import { loadContent } from './lib/content/load';
import { ROOT } from './lib/paths';

const findings = new Findings(ROOT);
const report = (level: 'error' | 'warning', file: string, message: string) => findings.add({ level, file, message });

/** Flattens nested message objects into dotted keys. */
function flatten(value: unknown, prefix = '', out: Record<string, unknown> = {}): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else out[prefix] = value;
  return out;
}

/** Names of ICU arguments ({name}, plural, select, tags) used by a message. */
function argumentsOf(elements: MessageFormatElement[], names = new Set<string>()): Set<string> {
  for (const el of elements) {
    if (el.type === TYPE.literal || el.type === TYPE.pound) continue;
    names.add(el.value);
    if (el.type === TYPE.plural || el.type === TYPE.select)
      for (const opt of Object.values(el.options)) argumentsOf(opt.value, names);
    if (el.type === TYPE.tag) argumentsOf(el.children, names);
  }
  return names;
}

function validateMessages(defaultCode: string, codes: string[]) {
  const reference = new Map<string, Map<string, Set<string>>>(); // namespace -> key -> arguments

  const check = (code: string, catalog: Messages) => {
    for (const [ns, tree] of Object.entries(catalog)) {
      const file = path.join(catalogDir(ROOT, code), `${ns}.json`);
      for (const [key, message] of Object.entries(flatten(tree))) {
        if (typeof message !== 'string') {
          report('error', file, `${key}: messages must be strings`);
          continue;
        }
        let args: Set<string>;
        try {
          args = argumentsOf(parse(message));
        } catch (error) {
          report('error', file, `${key}: invalid ICU message (${(error as Error).message})`);
          continue;
        }
        if (code === defaultCode) {
          if (!reference.has(ns)) reference.set(ns, new Map());
          reference.get(ns)!.set(key, args);
          continue;
        }
        const expected = reference.get(ns)?.get(key);
        if (!expected) report('warning', file, `${key}: not in ${defaultCode}; remove it or add it to ${defaultCode}`);
        else if ([...expected].sort().join() !== [...args].sort().join()) {
          report(
            'error',
            file,
            `${key}: arguments {${[...args].join(', ')}} differ from ${defaultCode} {${[...expected].join(', ')}}`,
          );
        }
      }
    }
  };

  if (!listNamespaces(ROOT, defaultCode).length)
    report('error', catalogDir(ROOT, defaultCode), 'default locale has no message files');
  check(defaultCode, readCatalog(ROOT, defaultCode));

  for (const code of codes.filter((c) => c !== defaultCode)) {
    const catalog = readCatalog(ROOT, code);
    check(code, catalog);
    for (const [ns, keys] of reference) {
      const file = path.join(catalogDir(ROOT, code), `${ns}.json`);
      if (!(ns in catalog)) {
        report('error', file, `missing namespace "${ns}"`);
        continue;
      }
      const present = flatten(catalog[ns]);
      for (const key of keys.keys()) if (!(key in present)) report('error', file, `${key}: missing translation`);
    }
  }
}

try {
  const config = loadConfig(ROOT);
  // Every locale that any build can generate needs a complete catalog: enabled and preview ones.
  const buildable = config.locales.filter((l) => l.enabled || l.preview).map((l) => l.code);
  validateMessages(config.defaultLocale, buildable);
  for (const l of config.locales.filter((l) => !l.enabled && !l.preview)) {
    if (fs.existsSync(catalogDir(ROOT, l.code))) validateMessages(config.defaultLocale, [config.defaultLocale, l.code]);
  }

  // Content (step 1b). Findings do not depend on the build mode; what each build shows does.
  const url = createUrlModule(urlConfigOf(config));
  for (const f of loadContent({ root: ROOT, config, url }).findings.list) findings.add(f);
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;
  findings.add({
    level: 'error',
    file: error.file,
    message: error.issues.map((i) => `${i.path || '(root)'}: ${i.message}`).join('; '),
  });
}

printFindings(findings.list, 'content:validate', { quietInfo: process.argv.includes('--quiet') });
process.exit(findings.blocking ? 1 : 0);
