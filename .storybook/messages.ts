// UI catalogs for stories: the namespaces client components receive on the site, plus the
// feature namespaces their stories need (detail: Prompt detail, template detail, showcase;
// feed: the list's cards and interludes; templates: the template editor).
import arCommon from '../src/i18n/messages/ar/common.json';
import arDetail from '../src/i18n/messages/ar/detail.json';
import arFeed from '../src/i18n/messages/ar/feed.json';
import arPrimitives from '../src/i18n/messages/ar/primitives.json';
import arShell from '../src/i18n/messages/ar/shell.json';
import arTemplates from '../src/i18n/messages/ar/templates.json';
import enCommon from '../src/i18n/messages/en/common.json';
import enDetail from '../src/i18n/messages/en/detail.json';
import enFeed from '../src/i18n/messages/en/feed.json';
import enPrimitives from '../src/i18n/messages/en/primitives.json';
import enShell from '../src/i18n/messages/en/shell.json';
import enTemplates from '../src/i18n/messages/en/templates.json';
import jaCommon from '../src/i18n/messages/ja/common.json';
import jaDetail from '../src/i18n/messages/ja/detail.json';
import jaFeed from '../src/i18n/messages/ja/feed.json';
import jaPrimitives from '../src/i18n/messages/ja/primitives.json';
import jaShell from '../src/i18n/messages/ja/shell.json';
import jaTemplates from '../src/i18n/messages/ja/templates.json';
import zhCommon from '../src/i18n/messages/zh-Hans/common.json';
import zhDetail from '../src/i18n/messages/zh-Hans/detail.json';
import zhFeed from '../src/i18n/messages/zh-Hans/feed.json';
import zhPrimitives from '../src/i18n/messages/zh-Hans/primitives.json';
import zhShell from '../src/i18n/messages/zh-Hans/shell.json';
import zhTemplates from '../src/i18n/messages/zh-Hans/templates.json';
import { config } from '../src/config';

export type StoryLocale = 'en' | 'zh-Hans' | 'ja' | 'ar';

export const catalogs: Record<StoryLocale, Record<string, unknown>> = {
  en: {
    common: enCommon,
    primitives: enPrimitives,
    shell: enShell,
    detail: enDetail,
    feed: enFeed,
    templates: enTemplates,
  },
  'zh-Hans': {
    common: zhCommon,
    primitives: zhPrimitives,
    shell: zhShell,
    detail: zhDetail,
    feed: zhFeed,
    templates: zhTemplates,
  },
  ja: {
    common: jaCommon,
    primitives: jaPrimitives,
    shell: jaShell,
    detail: jaDetail,
    feed: jaFeed,
    templates: jaTemplates,
  },
  ar: {
    common: arCommon,
    primitives: arPrimitives,
    shell: arShell,
    detail: arDetail,
    feed: arFeed,
    templates: arTemplates,
  },
};

export const storyLocales = Object.fromEntries(
  (Object.keys(catalogs) as StoryLocale[]).map((code) => [code, config.locales.find((l) => l.code === code)!]),
) as Record<StoryLocale, (typeof config.locales)[number]>;
