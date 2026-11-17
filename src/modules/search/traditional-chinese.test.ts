import { describe, expect, it } from 'vitest';
import type { SearchDocument } from './types';
import { domainAliases } from './profiles';
import { traditionalChineseAliases, traditionalChineseKindQuery } from './traditional-chinese';
import { normalizeTerm, queryTerms, spans } from './tokenize';
import { createIndex, loadEngine, search } from './engine';
import {
  traditionalChineseFixtureCases,
  traditionalChineseSearchFixture,
} from '../../../tests/support/traditional-chinese-search';

describe('Traditional Chinese search vocabulary', () => {
  const engine = loadEngine(traditionalChineseSearchFixture('traditional-chinese-fixture'));
  it.each(traditionalChineseFixtureCases)('preserves serialized engine semantics: $query', ({ query, ids }) => {
    const result = search(engine, query, Number.MAX_SAFE_INTEGER);
    expect(result.groups.flatMap((group) => group.hits.map((hit) => hit.id))).toEqual(ids);
    expect(result.total).toBe(ids.length);
    if (!ids.length) expect(result.groups).toEqual([]);
  });
  it('browses bare kinds in stable order without changing compound or other-locale relevance', () => {
    const doc = (id: string, title: string, kind: SearchDocument['kind'] = 'template'): SearchDocument => ({
      id,
      title,
      kind,
      contentLocale: 'zh-Hant',
      description: '',
      path: '/',
      frame: null,
      thumb: null,
      tags: [],
      terms: '',
      model: '',
      body: '',
    });
    const documents = [
      doc('t_009', '海報 模板'),
      doc('t_001', 'portrait reference image product photography'),
      doc('p_001', '模板', 'prompt'),
    ];
    const fixture = traditionalChineseSearchFixture('bare-kind');
    const make = (locale: string) =>
      loadEngine({ ...fixture, locale, index: JSON.parse(JSON.stringify(createIndex(documents, locale))) });
    const traditional = make('zh-Hant');
    const templates = (query: string, limit = Infinity) =>
      search(traditional, query, limit)
        .groups.find((g) => g.kind === 'template')
        ?.hits.map((h) => h.id);
    expect(templates('模板')).toEqual(['t_001', 't_009']);
    expect(templates('模板', 1)).toEqual(['t_001']);
    expect(search(traditional, '模板').total).toBe(3);
    expect(search(traditional, '模板').groups.find((g) => g.kind === 'prompt')?.hits[0]?.id).toBe('p_001');
    expect(templates('海報 模板')).toEqual(['t_009']);
    expect(
      search(make('zh-Hans'), '模板')
        .groups.find((g) => g.kind === 'template')
        ?.hits.map((h) => h.id),
    ).toEqual(['t_009']);
    expect(traditionalChineseKindQuery(' ＴＥＭＰＬＡＴＥ ')).toBe('template');
    for (const query of ['水墨 模板', 'template poster', '模', '模型'])
      expect(traditionalChineseKindQuery(query)).toBeNull();
  });

  it('expands only the registered Traditional Chinese profile', () => {
    expect(domainAliases('商品攝影', 'zh-Hant')).toContain('产品摄影');
    for (const locale of ['zh-Hans', 'zh', 'en', 'ja', 'zh-Hant-TW'])
      expect(domainAliases('商品攝影', locale)).toBe('');
  });

  it('requires a contiguous phrase and expands photography in one direction', () => {
    expect(traditionalChineseAliases('極簡商品攝影棚拍')).toContain('packshot');
    expect(traditionalChineseAliases('PRODUCT PHOTOGRAPHY')).toContain('商品攝影');
    for (const text of ['商品在左方，攝影師在右方', '攝影', 'portrait photography', 'product\nphotography'])
      expect(traditionalChineseAliases(text)).not.toContain('packshot');
  });

  it('respects Latin word boundaries and does not recursively expand aliases', () => {
    expect(traditionalChineseAliases('a poster')).toContain('海報');
    expect(traditionalChineseAliases('posterior portraits')).toBe('');
    expect(traditionalChineseAliases('霓虹肖像')).toContain('portrait');
    expect(traditionalChineseAliases('參考圖片')).toContain('参考图');
    expect(traditionalChineseAliases('猴子提著燈籠')).toContain('灯笼');
  });

  it('labels templates by kind, without treating AI models as templates', () => {
    expect(traditionalChineseAliases('AI 模型', 'prompt')).not.toContain('template');
    expect(traditionalChineseAliases('海報', 'template')).toContain('範本 模板 template');
    expect(traditionalChineseAliases('', 'collection')).toBe('合集');
    expect(traditionalChineseAliases('', 'topic')).toBe('主題 主题');
  });

  it('preserves ambiguous characters instead of performing script conversion', () => {
    for (const [left, right] of [
      ['發', '髮'],
      ['後', '后'],
      ['乾', '幹'],
    ]) {
      expect(normalizeTerm(left!, 'zh-Hant')).not.toBe(normalizeTerm(right!, 'zh-Hant'));
      expect(traditionalChineseAliases(left!)).toBe('');
    }
  });

  it('keeps full-width input compatible and spans on original Unicode boundaries', () => {
    expect(queryTerms('ＧＰＴ Image 霓虹人像', 'zh-Hant')).toEqual(queryTerms('GPT Image 霓虹人像', 'zh-Hant'));
    const text = '🎨𠮷髮 cafe\u0301';
    const positions = spans(text, 'zh-Hant');
    expect(positions.find((span) => span.term === '𠮷')).toEqual({ term: '𠮷', start: 2, end: 4 });
    expect(positions.find((span) => span.term === 'cafe')).toEqual({ term: 'cafe', start: 6, end: 11 });
    for (const span of positions) expect(text.slice(span.start, span.end).isWellFormed()).toBe(true);
  });
});
