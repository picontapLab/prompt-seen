import type { SearchKind } from './types';

// Spec §6.1: index-side vocabulary, never a general Simplified/Traditional conversion.
// Chinese phrases can occur inside unspaced prose; Latin aliases need word boundaries.
const GROUPS = [
  ['人像', '肖像', 'portrait'],
  ['海報', '海报', 'poster'],
  ['參考圖片', '參考圖', '参考图片', '参考图', 'reference image'],
  ['燈籠', '灯笼'],
] as const;
const PRODUCT_PHOTOGRAPHY = [
  '商品攝影',
  '產品攝影',
  '商品摄影',
  '产品摄影',
  'product photography',
  'packshot',
] as const;
const KINDS: Record<SearchKind, string> = {
  prompt: '提示詞 提示词',
  template: '範本 模板 template',
  collection: '合集',
  topic: '主題 主题',
};

function phrasePattern(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ \\t]+');
  return /[a-z]/i.test(phrase)
    ? new RegExp(`(?<![\\p{L}\\p{N}\\p{M}])${escaped}(?![\\p{L}\\p{N}\\p{M}])`, 'u')
    : new RegExp(escaped, 'u');
}

const groups = GROUPS.map((words) => ({ words, patterns: words.map(phrasePattern) }));
const productPatterns = PRODUCT_PHOTOGRAPHY.map(phrasePattern);

/** Aliases have lower weight than visible prose; expanded words never trigger another group. */
export function traditionalChineseAliases(text: string, kind?: SearchKind): string {
  const normalized = text.normalize('NFKC').toLowerCase();
  const aliases: string[] = kind ? [KINDS[kind]] : [];
  for (const group of groups)
    if (group.patterns.some((pattern) => pattern.test(normalized))) aliases.push(...group.words);
  if (productPatterns.some((pattern) => pattern.test(normalized)))
    aliases.push(...PRODUCT_PHOTOGRAPHY, '攝影', '摄影', 'photography');
  return aliases.join(' ');
}

/** A bare kind label browses that group in stable catalog order, not alias-length order. */
export function traditionalChineseKindQuery(query: string): SearchKind | null {
  const normalized = query.normalize('NFKC').trim().toLowerCase();
  return (Object.entries(KINDS).find(([, words]) => words.split(' ').includes(normalized))?.[0] as SearchKind) ?? null;
}
