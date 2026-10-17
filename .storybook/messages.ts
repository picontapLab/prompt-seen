// UI catalogs for stories: the namespaces client components receive on the site, plus the
// feature namespaces their stories need (detail: Prompt detail, template detail, showcase).
import arCommon from '../src/i18n/messages/ar/common.json';
import arDetail from '../src/i18n/messages/ar/detail.json';
import arPrimitives from '../src/i18n/messages/ar/primitives.json';
import arShell from '../src/i18n/messages/ar/shell.json';
import enCommon from '../src/i18n/messages/en/common.json';
import enDetail from '../src/i18n/messages/en/detail.json';
import enPrimitives from '../src/i18n/messages/en/primitives.json';
import enShell from '../src/i18n/messages/en/shell.json';
import jaCommon from '../src/i18n/messages/ja/common.json';
import jaDetail from '../src/i18n/messages/ja/detail.json';
import jaPrimitives from '../src/i18n/messages/ja/primitives.json';
import jaShell from '../src/i18n/messages/ja/shell.json';
import zhCommon from '../src/i18n/messages/zh-Hans/common.json';
import zhDetail from '../src/i18n/messages/zh-Hans/detail.json';
import zhPrimitives from '../src/i18n/messages/zh-Hans/primitives.json';
import zhShell from '../src/i18n/messages/zh-Hans/shell.json';
import { config } from '../src/config';

export type StoryLocale = 'en' | 'zh-Hans' | 'ja' | 'ar';

export const catalogs: Record<StoryLocale, Record<string, unknown>> = {
  en: { common: enCommon, primitives: enPrimitives, shell: enShell, detail: enDetail },
  'zh-Hans': { common: zhCommon, primitives: zhPrimitives, shell: zhShell, detail: zhDetail },
  ja: { common: jaCommon, primitives: jaPrimitives, shell: jaShell, detail: jaDetail },
  ar: { common: arCommon, primitives: arPrimitives, shell: arShell, detail: arDetail },
};

export const storyLocales = Object.fromEntries(
  (Object.keys(catalogs) as StoryLocale[]).map((code) => [code, config.locales.find((l) => l.code === code)!]),
) as Record<StoryLocale, (typeof config.locales)[number]>;
