import fs from 'node:fs';
import path from 'node:path';
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import type { ResolvedConfig } from '../../../src/config/schema';
import { catalogDir, listNamespaces, type Messages } from '../../../src/i18n/catalog';
import type { Findings } from '../content/findings';

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

export function validateMessages(root: string, defaultCode: string, codes: string[], findings: Findings) {
  const report = (level: 'error' | 'warning', file: string, message: string, field?: string) =>
    findings.add({ level, file, message, field });
  const read = (code: string): Messages => {
    const catalog: Messages = {};
    for (const ns of listNamespaces(root, code)) {
      const file = path.join(catalogDir(root, code), `${ns}.json`);
      try {
        catalog[ns] = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (error) {
        report('error', file, `invalid JSON: ${(error as Error).message}`);
      }
    }
    return catalog;
  };
  const reference = new Map<string, Map<string, Set<string>>>(); // namespace -> key -> arguments

  const check = (code: string, catalog: Messages) => {
    for (const [ns, tree] of Object.entries(catalog)) {
      const file = path.join(catalogDir(root, code), `${ns}.json`);
      if (!tree || typeof tree !== 'object' || Array.isArray(tree)) {
        report('error', file, 'namespace must be a message object');
        continue;
      }
      for (const [key, message] of Object.entries(flatten(tree))) {
        if (typeof message !== 'string' || !message.trim()) {
          report('error', file, `${key}: messages must be nonempty strings`, key);
          continue;
        }
        let args: Set<string>;
        try {
          args = argumentsOf(parse(message));
        } catch (error) {
          report('error', file, `${key}: invalid ICU message (${(error as Error).message})`, key);
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
            key,
          );
        }
      }
    }
  };

  if (!listNamespaces(root, defaultCode).length)
    report('error', catalogDir(root, defaultCode), 'default locale has no message files');
  check(defaultCode, read(defaultCode));

  for (const code of codes.filter((c) => c !== defaultCode)) {
    const catalog = read(code);
    check(code, catalog);
    for (const [ns, keys] of reference) {
      const file = path.join(catalogDir(root, code), `${ns}.json`);
      if (!(ns in catalog)) {
        report('error', file, `missing namespace "${ns}"`);
        continue;
      }
      const present = flatten(catalog[ns]);
      for (const key of keys.keys()) if (!(key in present)) report('error', file, `${key}: missing translation`, key);
    }
  }
}

export function validateBuildMessages(root: string, config: ResolvedConfig, findings: Findings) {
  const codes = config.locales
    .filter((locale) => locale.enabled || locale.preview || fs.existsSync(catalogDir(root, locale.code)))
    .map((locale) => locale.code);
  validateMessages(root, config.defaultLocale, codes, findings);
}
