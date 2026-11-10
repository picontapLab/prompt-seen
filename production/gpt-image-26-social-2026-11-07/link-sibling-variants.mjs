// Patch the editorial sibling list only. Keep generation prompts, runs and applied receipts intact.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { splitFrontmatter } from '../../scripts/lib/content/mdx.ts';
import { sourceHashOf } from '../../scripts/lib/content/read.ts';
import { acquireContentLock } from '../../scripts/lib/content-production/lock.ts';
const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, '../..');
const items = JSON.parse(fs.readFileSync(path.join(base, 'adaptations/content-map.json'), 'utf8')).filter((i) => i.ids);
const release = acquireContentLock(root);
try {
  for (const item of items) {
    const siblings = items.filter((s) => s.sourceCase === item.sourceCase && s.unitId !== item.unitId);
    if (!siblings.length) continue;
    const dir = path.join(root, 'content/prompts', item.ids.prompt, 'locales');
    let source;
    for (const locale of ['en', 'zh-Hans']) {
      const file = path.join(dir, locale + '.mdx');
      const { frontmatter, body } = splitFrontmatter(fs.readFileSync(file, 'utf8'));
      const fm = YAML.parse(frontmatter);
      const prefix = locale === 'en' ? 'Variants from the same source post: ' : '同帖变体：';
      const links = siblings
        .map((s) => {
          const recipe = JSON.parse(fs.readFileSync(path.join(base, s.folder, 'recipe.json'), 'utf8'));
          const title = recipe.locales[locale].title.replace(/ — composed GIF$| · 合成 GIF$/, '');
          return `[${title}](prompt:${s.ids.prompt})`;
        })
        .join(' · ');
      const pattern = locale === 'en' ? /^Variants from the same source post: .*$/m : /^同帖变体：.*$/m;
      if (!pattern.test(body)) throw new Error(`Missing expected sibling list: ${file}`);
      const next = body.replace(pattern, prefix + links);
      if (locale === 'en') source = { fm, body: next };
      else fm.translation.sourceHash = sourceHashOf(source);
      fs.writeFileSync(file, `---\n${YAML.stringify(fm)}---\n\n${next.trim()}\n`);
    }
  }
} finally {
  release();
}
