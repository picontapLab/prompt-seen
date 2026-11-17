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
  it.each([0, 1, 2, 1_000, 1_000_000])('formats Traditional Chinese result counts: %s', (count) => {
    const t = catalogTranslator(ROOT, 'zh-Hant');
    const number = new Intl.NumberFormat(formatLocale('zh-Hant')).format(count);
    expect(t('search.count', { count })).toBe(count === 0 ? '沒有結果' : `${number} 個結果`);
  });

  it('formats Italian zero, singular, plural and million counts identically to runtime ICU', () => {
    const compiled = catalogTranslator(ROOT, 'it');
    const runtime = createTranslator({
      locale: formatLocale('it'),
      messages: readCatalog(ROOT, 'it'),
      timeZone: 'UTC',
    }) as unknown as (key: string, values: Record<string, number>) => string;
    for (const count of [0, 1, 2, 21, 1.5, 1000000]) {
      for (const key of ['search.count', 'detail.sheet.characters', 'templates.tokens.remaining'])
        expect(compiled(key, { count })).toBe(runtime(key, { count }));
    }
    expect(compiled('search.count', { count: 0 })).toBe('Nessun risultato');
    expect(compiled('search.count', { count: 1 })).toBe('1 risultato');
    expect(compiled('search.count', { count: 1000000 })).toBe('1.000.000 risultati');
    expect(compiled('templates.tokens.remaining', { count: 0 })).toBe('Non puoi aggiungere altri elementi.');
    expect(compiled('templates.editor.errors.required', { label: 'L’immagine' })).toBe(
      'Il campo «L’immagine» è vuoto. Compilalo per completare il prompt.',
    );
  });
  it('formats Russian cardinal forms and zero with the actual compiled UI messages', () => {
    const t = catalogTranslator(ROOT, 'ru');
    for (const n of [1, 21, 101]) expect(t('search.count', { count: n })).toBe(`${n} результат`);
    for (const n of [2, 4, 22]) expect(t('search.count', { count: n })).toBe(`${n} результата`);
    for (const n of [5, 11, 12, 14, 25, 111]) expect(t('search.count', { count: n })).toBe(`${n} результатов`);
    expect(t('search.count', { count: 0 })).toBe('Нет результатов');
    expect(t('search.count', { count: 1.5 })).toBe('1,5 результата');
    expect(t('templates.editor.missing', { count: 21 })).toBe('Осталось заполнить 21 поле');
    expect(t('templates.editor.missing', { count: 22 })).toBe('Осталось заполнить 22 поля');
    expect(t('templates.editor.missing', { count: 11 })).toBe('Осталось заполнить 11 полей');
    expect(t('favorites.page.count', { count: 22 })).toBe('22 сохранённые работы');
  });
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
        for (const n of names.length
          ? code === 'ru'
            ? [0, 1, 2, 4, 5, 11, 14, 21, 22, 101, 111, 1.5]
            : [1, 3, 12]
          : [0]) {
          const values = Object.fromEntries(names.map((name) => [name, n]));
          expect(compiled(key, values), `${key} ${n}`).toBe(runtime(key, values));
        }
      }
    });
});

it('formats French zero, plural, million and apostrophe-adjacent parameters', () => {
  const t = catalogTranslator(ROOT, 'fr');
  for (const [count, expected] of [
    [0, 'Aucun résultat'],
    [1, '1 résultat'],
    [2, '2 résultats'],
    [1000, '1\u202f000 résultats'],
    [1000000, '1\u202f000\u202f000 résultats'],
  ] as const) {
    expect(t('search.count', { count })).toBe(expected);
  }
  expect(t('templates.tokens.remaining', { count: 0 })).toBe('Aucun élément supplémentaire ne peut être ajouté.');
  expect(t('detail.image.show', { n: 2, total: 3 })).toBe('Afficher l’image 2 sur 3');
  expect(t('templates.editor.errors.required', { label: 'Éclairage' })).toBe(
    'Le champ «\u00a0Éclairage\u00a0» est vide. Remplissez-le pour compléter le prompt.',
  );
});
