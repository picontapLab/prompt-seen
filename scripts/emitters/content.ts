import { detailFile, localeIndexFile, manifestFile } from '../../src/modules/content/files';
import { defineEmitter } from './_types';

// The content model for pages (design doc §3.5, §7): one manifest, one summary index per
// locale and one detail model per visible entry and locale, in .generated/content/. Pages read
// it through `@/modules/content`; other emitters read `ctx.content` directly.

const json = (value: unknown) => `${JSON.stringify(value)}\n`;

export default defineEmitter({
  name: 'content',
  description: '.generated/content/: manifest, per-locale indexes and detail models',
  order: 10,
  run({ content, write }) {
    const root = (file: string) => `content/${file}`;
    write('internal', root(manifestFile()), json(content.manifest));
    for (const [locale, index] of content.locales) write('internal', root(localeIndexFile(locale)), json(index));
    for (const d of content.details) write('internal', root(detailFile(d.locale, d.kind, d.key)), json(d.model));
  },
});
