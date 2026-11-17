import fs from 'node:fs';
import type { LocalizationSearchCase } from './localization-search';

// Frozen against the R1 source-compared pilot before checking its built index.
// These are pilot regressions; full-corpus ranking/performance acceptance is separate.
export const russianCorpusCases = [
  { query: 'неоновый портрет', id: 'p_005' },
  { query: 'неонового портрета', id: 'p_005' },
  { query: 'контровым светом', id: 'p_005' },
  { query: 'ветка сливы', id: 'p_012' },
  { query: 'тушью', id: 'p_012' },
  { query: 'журнальный портрет', id: 'p_111' },
  { query: 'обложки', id: 'p_111' },
  { query: 'свадебная съёмка', id: 'p_115' },
  { query: 'свадебная съемка', id: 'p_115' },
  { query: 'свадебная съёмка'.normalize('NFD'), id: 'p_115' },
  { query: 'двух человек', id: 'p_115' },
  { query: 'студийный товар', id: 'p_151' },
  { query: 'минималистичный', id: 'p_151' },
  { query: 'рыночных возможностей', id: 'p_217' },
  { query: 'слайд питча', id: 'p_217' },
  { query: 'обезьянка фонарь', id: 'p_224' },
  { query: 'поднимает', id: 'p_224' },
  { query: 'Фудзи', id: 'p_290' },
  { query: 'собранный GIF', id: 'p_290' },
  { query: 'шаблон постера', id: 't_001' },
  { query: 'шаблоны постеров', id: 't_001' },
  { query: 'длинный свиток', id: 't_002' },
  { query: 'шаблон кампании', id: 't_017' },
  { query: 'zxqvnonexistent', id: null },
] as const;

/** Full-corpus ranking cases from the specification, frozen before the integration fix. */
export const russianRankingCases: LocalizationSearchCase[] = JSON.parse(
  fs.readFileSync(new URL('../../production/localization/ru/search-cases.json', import.meta.url), 'utf8'),
).cases;
