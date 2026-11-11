import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { afterEach, expect, it } from 'vitest';
import { formatLocale } from '../../../src/i18n/format-locale';
import { checkLocale } from './check';

it('uses Brazilian decimal separators and a UTC long date without changing the calendar day', () => {
  const locale = formatLocale('pt-BR');
  expect(new Intl.NumberFormat(locale).format(1234.56)).toBe('1.234,56');
  expect(
    new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date('2026-11-11T00:00:00Z')),
  ).toBe('11 de novembro de 2026');
});

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));
function write(root: string, file: string, text: string) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), text);
}
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portuguese-policy-'));
  roots.push(root);
  write(root, 'content/site.yaml', 'siteName: Test\norigin: https://example.com\nbasePath: ""\n');
  write(
    root,
    'content/locales.yaml',
    YAML.stringify({
      defaultLocale: 'en',
      locales: [
        {
          code: 'en',
          pathPrefix: 'en',
          nativeName: 'English',
          htmlLang: 'en',
          direction: 'ltr',
          enabled: true,
          phase: 1,
          localization: { coverage: 'incremental', review: 'metadata', promptBodies: 'optional' },
        },
        {
          code: 'pt-BR',
          pathPrefix: 'pt-br',
          nativeName: 'Português (Brasil)',
          htmlLang: 'pt-BR',
          direction: 'ltr',
          enabled: false,
          phase: 1,
          localization: { coverage: 'complete', review: 'fingerprint', promptBodies: 'source-only' },
        },
      ],
    }),
  );
  for (const name of ['styles', 'use-cases', 'field-groups']) write(root, `content/taxonomy/${name}.yaml`, '[]\n');
  write(root, 'content/taxonomy/categories.yaml', '- { id: portrait, labels: { en: Portrait, pt-BR: Retrato } }\n');
  write(
    root,
    'content/prompts/p_001/entry.yaml',
    YAML.stringify({
      id: 'p_001',
      slug: 'portrait',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      promptSource: { type: 'literal', language: 'en' },
      categoryId: 'portrait',
      styleIds: [],
      useCaseIds: [],
      coverAssetId: null,
    }),
  );
  write(root, 'content/prompts/p_001/prompt.txt', 'A portrait in soft light.\n');
  write(
    root,
    'content/prompts/p_001/locales/en.mdx',
    '---\ntitle: Portrait\ndescription: A portrait.\nstatus: published\nupdatedAt: 2026-01-01\n---\n\nOriginal description.\n',
  );
  return root;
}

it('reports a localized Portuguese prompt as a source-only conflict while preserving both bodies byte for byte', () => {
  const root = fixture();
  const original = 'content/prompts/p_001/prompt.txt';
  const localized = 'content/prompts/p_001/prompt-locales/pt-BR/prompt.txt';
  expect(checkLocale(root, 'pt-BR').findings.filter((f) => f.code === 'locale.prompt-variant')).toEqual([]);
  write(root, localized, 'Um retrato sob luz suave.\n');
  const report = checkLocale(root, 'pt-BR');
  expect(report.findings).toContainEqual(
    expect.objectContaining({
      code: 'locale.prompt-variant',
      locale: 'pt-BR',
      field: 'prompt-locales',
      blockingForRelease: true,
      file: 'content/prompts/p_001/locales/pt-BR.mdx',
    }),
  );
  expect(report.ready).toBe(false);
  expect(fs.readFileSync(path.join(root, original), 'utf8')).toBe('A portrait in soft light.\n');
  expect(fs.readFileSync(path.join(root, localized), 'utf8')).toBe('Um retrato sob luz suave.\n');
});
