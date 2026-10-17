import fs from 'node:fs';
import path from 'node:path';
import type { PromptDetail, TemplateDetail } from '../../src/modules/content/types';
import { composeFeed } from '../../src/modules/feed/compose';
import { feedBandFile, feedIndexFile, feedPageFile } from '../../src/modules/feed/files';
import { aspectRatioLabel } from '../lib/content/build-index';
import { ROOT } from '../lib/paths';
import { defineEmitter } from './_types';

// The continuous list (design doc §3.5, §9.4, §11.8.2): per locale, the newest-first pages that
// /{locale}/prompts/ and /page/{n}/ render and the browser appends, the slim metadata index
// for filters, and the showcase band. Settings come from `feed` in site.yaml.

const json = (value: unknown) => `${JSON.stringify(value)}\n`;

/**
 * Collection banners link to collection pages, which step 3e adds; until its route exists the
 * banners are left out, so the list never links to a missing page (engineering conventions).
 */
const collectionPagesExist = () =>
  fs.existsSync(path.join(ROOT, 'src/app/[locale]/(public)/collections/[slug]/page.tsx'));

export default defineEmitter({
  name: 'feed',
  description: 'public/generated/{locale}/feed/: list pages and filter index; .generated/feed/: showcase band',
  run({ config, locales, content, write }) {
    const details = new Map(content.details.map((d) => [`${d.locale}/${d.kind}/${d.key}`, d.model]));
    const collectionsLinked = collectionPagesExist();
    const today = new Date().toISOString().slice(0, 10);

    for (const locale of locales) {
      const index = content.locales.get(locale.code);
      if (!index) continue;
      const feed = composeFeed({
        locale: locale.code,
        buildId: config.buildId,
        today,
        prompts: index.prompts,
        promptDetail: (id) => (details.get(`${locale.code}/prompt/${id}`) as PromptDetail | undefined) ?? null,
        templates: index.templates,
        templateDetail: (id) => (details.get(`${locale.code}/template/${id}`) as TemplateDetail | undefined) ?? null,
        collections: index.collections,
        collectionsLinked,
        terms: index.terms,
        settings: config.feed,
        ratioLabel: aspectRatioLabel,
      });
      for (const page of feed.pages) write('public', feedPageFile(locale.code, page.page), json(page));
      write('public', feedIndexFile(locale.code), json(feed.index));
      if (feed.band) write('internal', feedBandFile(locale.code), json(feed.band));
    }
  },
});
