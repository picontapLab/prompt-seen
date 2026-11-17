import { describe, expect, it } from 'vitest';
import { highlightParts } from '../../ui/search/highlight-parts';
import { normalizeTerm, queryTerms, spans } from './tokenize';
import { domainAliases } from './profiles';
import { russianFixtureCases, russianSearchFixture } from '../../../tests/support/russian-search';
import { loadEngine, search } from './engine';

describe('Russian orthography and original positions', () => {
  it('folds ё spellings and stress, but preserves й in composed and decomposed text', () => {
    for (const word of ['съёмка', 'съемка', 'СЪЁМКА', 'съёмка'.normalize('NFD')]) {
      expect(normalizeTerm(word, 'ru')).toBe('съемка');
    }
    for (const word of ['й', 'Й', 'и\u0306']) expect(normalizeTerm(word, 'ru')).toBe('й');
    expect(normalizeTerm('по́ртрет', 'ru')).toBe('портрет');
    for (const [a, b] of [
      ['май', 'маи'],
      ['и', 'й'],
      ['объект', 'обьект'],
      ['a', 'а'],
      ['c', 'с'],
    ]) {
      expect(normalizeTerm(a!, 'ru')).not.toBe(normalizeTerm(b!, 'ru'));
    }
  });
  it('keeps original UTF-16 spans including marks after an emoji', () => {
    const text = '🖼 маи\u0306, съе\u0308мка и по́ртрет!';
    for (const span of spans(text, 'ru')) {
      expect(normalizeTerm(text.slice(span.start, span.end), 'ru')).toBe(span.term);
    }
    const parts = highlightParts(text, 'ru', ['май', 'съемка', 'портрет']);
    expect(parts.map((part) => part.text).join('')).toBe(text);
    expect(parts.filter((part) => part.mark).map((part) => part.text)).toEqual([
      'маи\u0306',
      'съе\u0308мка',
      'по́ртрет',
    ]);
    expect(highlightParts('маи май', 'ru', ['май'])).toEqual([
      { text: 'маи ', mark: false },
      { text: 'май', mark: true },
    ]);
  });
  it('shares token boundaries for hyphens and nonbreaking spaces', () => {
    for (const separator of ['-', '—', ' ', '\u00a0', '\u202f']) {
      expect(queryTerms(`научно${separator}фантастический`, 'ru')).toEqual(['научно', 'фантастический']);
    }
    expect(queryTerms('GPT Image p_111', 'ru')).toEqual(['gpt', 'image', 'p', '111']);
  });
});

describe('Russian controlled aliases', () => {
  it('expands finite inflections and kinds without modifying visible prose', () => {
    expect(domainAliases('Неонового портрета', 'ru')).toContain('портрет');
    expect(domainAliases('шаблон постера', 'ru', 'template')).toContain('постеров');
    expect(domainAliases('', 'ru', 'collection')).toContain('подборки');
  });
  it('requires a product-photography phrase and never broadens generic photography backwards', () => {
    for (const text of ['предметная съёмка', 'предметной съёмки', 'product photography']) {
      expect(domainAliases(text, 'ru')).toContain('packshot');
    }
    for (const text of [
      'портретная фотография',
      'предметная композиция, затем съёмка',
      'предметная. Съёмка',
      'предметная\nсъёмка',
      'модель ИИ',
    ]) {
      expect(domainAliases(text, 'ru', 'prompt')).not.toContain('packshot');
      expect(domainAliases(text, 'ru', 'prompt')).not.toContain('шаблон');
    }
  });
});

describe('serialized Russian search semantics', () => {
  const engine = loadEngine(russianSearchFixture('russian-fixture'));
  it.each(russianFixtureCases)('$query', ({ query, ids }) => {
    const result = search(engine, query);
    expect(result.total).toBe(ids.length);
    expect(result.groups.flatMap((group) => group.hits.map((hit) => hit.id)).sort()).toEqual([...ids].sort());
  });
});
