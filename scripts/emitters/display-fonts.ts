import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { readCatalog } from '../../src/i18n/catalog';
import { DISPLAY_CJK, displayFontCss } from '../../src/styles/fonts/display-cjk';
import {
  contentHash,
  cjkCharacters,
  fontFaceCss,
  planSlices,
  sliceFile,
  subsetSlice,
  type FaceFile,
} from '../lib/fonts/subset';
import { ROOT } from '../lib/paths';
import { defineEmitter } from './_types';

// CJK display font subsets (design doc §11.1.2): for every built Chinese, Japanese or Korean
// locale, the characters of its titles and interface text, cut from bold Noto Sans into small
// per-slice files with a stylesheet at public/generated/fonts/{code}.css. Dynamic text (search
// results, user input) is not covered and falls back to the system fonts in the stack.

const require = createRequire(import.meta.url);

/** Every string value in a message catalog. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

export default defineEmitter({
  name: 'display-fonts',
  description: 'public/generated/fonts/: CJK display font subsets of titles and interface text',
  async run({ locales, content, write }) {
    for (const locale of locales) {
      const face = DISPLAY_CJK[locale.code];
      if (!face) continue;
      let dir: string;
      try {
        dir = path.dirname(require.resolve(`${face.package}/package.json`));
      } catch {
        throw new Error(
          `display-fonts: ${locale.code} needs ${face.package}; add it with npm install -D -E ${face.package}`,
        );
      }
      const slices = JSON.parse(fs.readFileSync(path.join(dir, 'unicode.json'), 'utf8')) as Record<string, string>;

      const index = content.locales.get(locale.code);
      const titles = index
        ? [...index.prompts, ...index.templates, ...index.collections, ...index.topics, ...index.pages].map(
            (e) => e.title,
          )
        : [];
      const chars = cjkCharacters([...titles, ...strings(readCatalog(ROOT, locale.code))]);
      const { bySlice } = planSlices(chars, slices);

      const files: FaceFile[] = [];
      for (const [slice, codePoints] of bySlice) {
        const source = fs.readFileSync(path.join(dir, 'files', sliceFile(face.id, slice)));
        const data = await subsetSlice(source, codePoints);
        const name = `${face.id}-${slice.replace(/[[\]]/g, '')}-${contentHash(data)}.woff2`;
        write('public', `fonts/${locale.code}/${name}`, data);
        // Relative to the stylesheet, so it works under any base path.
        files.push({ url: `./${locale.code}/${name}`, codePoints });
      }
      write('public', displayFontCss(locale.code), fontFaceCss(face.family, files));
    }
  },
});
