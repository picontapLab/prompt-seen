import { createHash } from 'node:crypto';
import { catalogTranslator } from '../../src/i18n/translator';
import { DATASET_DIRECTORY, DATASET_LOCALES } from '../../src/modules/geo/datasets';
import { pageSections } from '../../src/ui/navigation/sections';
import { builtReader, EXPORT_FORMAT, EXPORT_VERSION, exportJson, serializeExport } from '../lib/export';
import { ROOT } from '../lib/paths';
import { defineEmitter } from './_types';

export default defineEmitter({
  name: 'datasets',
  description: 'public/generated/datasets/v2: indexed prompt and template records',
  run({ config, content, locales, url, write }) {
    if (config.buildMode !== 'production') return;
    const sources = {
      buildMode: config.buildMode,
      siteName: config.siteName,
      defaultLocale: config.defaultLocale,
      locales,
      reader: builtReader(content),
      url,
      absoluteImageUrl: (variant: { key: string }) => url.absoluteMediaUrl(variant.key),
      translator: (code: string) => catalogTranslator(ROOT, code),
      sections: pageSections(),
    };
    const files = locales
      .filter((locale) => locale.enabled && DATASET_LOCALES.has(locale.code))
      .map((locale) => {
        const data = exportJson(sources, config.buildId, locale, ['prompt', 'template']);
        const bytes = Buffer.from(serializeExport(data), 'utf8');
        const path = `${DATASET_DIRECTORY}/${locale.code}.json`;
        write('public', path, bytes);
        return {
          locale: locale.code,
          url: url.absoluteUrl(url.paths.generated(path)),
          prompts: data.prompts.length,
          templates: data.templates.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        };
      });
    write(
      'public',
      `${DATASET_DIRECTORY}/manifest.json`,
      serializeExport({
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        buildId: config.buildId,
        files,
      }),
    );
  },
});
