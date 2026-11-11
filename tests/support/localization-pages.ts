import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { sourceHashOf } from '../../scripts/lib/content/read';

/** Minimal required editorial pages for isolated content-pipeline fixtures. */
export function writeRequiredPages(root: string, locales: string[], pages = ['about', 'license']) {
  for (const slug of pages) {
    const fm = { title: slug, description: `${slug} fixture.`, status: 'published', updatedAt: '2026-01-01' };
    const body = `## ${slug}\n\nFixture editorial content.\n`;
    for (const locale of locales) {
      const file = path.join(root, 'content/pages', slug, 'locales', `${locale}.mdx`);
      if (fs.existsSync(file)) continue;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const translation =
        locale === locales[0]
          ? {}
          : {
              translation: {
                sourceLocale: locales[0],
                sourceHash: sourceHashOf({ fm, body }),
                reviewStatus: 'reviewed',
              },
            };
      fs.writeFileSync(file, `---\n${YAML.stringify({ ...fm, ...translation })}---\n\n${body}`);
    }
  }
}
