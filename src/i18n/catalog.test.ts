import fs from 'node:fs';
import path from 'node:path';
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { compileMessages, MESSAGES_DIR, readCatalog, type Messages } from './catalog';
import { formatLocale } from './format-locale';
import { catalogTranslator } from './translator';

// Precompiled messages (§16.1) must read exactly as the runtime ICU formatter wrote them before.
// Vitest does not alias use-intl's formatter, so createTranslator here still parses at runtime.

const ROOT = process.cwd();
const CODES = fs.readdirSync(path.join(ROOT, MESSAGES_DIR));

function leaves(tree: unknown, prefix = ''): [string, string][] {
  if (typeof tree === 'string') return [[prefix, tree]];
  return Object.entries(tree as Record<string, unknown>).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}

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

describe('compileMessages', () => {
  it('keeps Arabic messages free of hidden bidi controls and formats all six plural categories', () => {
    const raw = readCatalog(ROOT, 'ar');
    for (const [key, value] of leaves(raw))
      expect(value, key).not.toMatch(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u);
    const t = catalogTranslator(ROOT, 'ar');
    for (const [count, expected] of [
      [0, 'لا نتائج'],
      [1, 'نتيجة واحدة'],
      [2, 'نتيجتان'],
      [3, '3 نتائج'],
      [10, '10 نتائج'],
      [11, '11 نتيجة'],
      [99, '99 نتيجة'],
      [100, '100 نتيجة'],
      [101, '101 نتيجة'],
      [102, '102 نتيجة'],
      [103, '103 نتائج'],
      [111, '111 نتيجة'],
      [1.5, '1.5 نتيجة'],
    ] as const)
      expect(t('search.count', { count })).toBe(expected);
  });

  it('formats Brazilian Portuguese zero, singular and plural UI messages', () => {
    const t = catalogTranslator(ROOT, 'pt-BR');
    expect(t('search.count', { count: 0 })).toBe('Nenhum resultado');
    expect(t('search.count', { count: 1 })).toBe('1 resultado');
    expect(t('search.count', { count: 2 })).toBe('2 resultados');
    expect(t('detail.sheet.characters', { count: 0 })).toBe('0 caracteres');
    expect(t('detail.sheet.characters', { count: 1 })).toBe('1 caractere');
    expect(t('templates.tokens.remaining', { count: 0 })).toBe('Não é possível adicionar mais itens.');
  });

  it.each(['Producto', 'Fruta', 'Etiquetas'])('formats Spanish required-field errors for %s', (label) => {
    const message = catalogTranslator(ROOT, 'es')('templates.editor.errors.required', { label });
    expect(message).toBe(`El campo «${label}» está vacío. Complétalo para terminar el prompt.`);
  });

  it('returns plain data, which client components accept as props', () => {
    const plain = (v: unknown): boolean =>
      v === null || typeof v !== 'object'
        ? true
        : (Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype) && Object.values(v).every(plain);
    expect(plain(compileMessages(readCatalog(ROOT, 'en')))).toBe(true);
  });

  for (const code of CODES)
    it(`${code}: every message formats as the runtime formatter does`, () => {
      const raw: Messages = readCatalog(ROOT, code);
      const runtime = createTranslator({ locale: formatLocale(code), messages: raw, timeZone: 'UTC' }) as unknown as (
        key: string,
        values?: Record<string, number>,
      ) => string;
      const compiled = catalogTranslator(ROOT, code);
      for (const [key, message] of leaves(raw)) {
        const names = [...argumentsOf(parse(message))];
        // Plural forms and selects by count: one, few and other in every catalog's languages.
        for (const n of names.length ? [1, 3, 12] : [0]) {
          const values = Object.fromEntries(names.map((name) => [name, n]));
          expect(compiled(key, values), `${key} ${n}`).toBe(runtime(key, values));
        }
      }
    });
});
