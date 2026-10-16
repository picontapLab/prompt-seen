import { defineEmitter } from './_types';

// One build identifier shared by pages, data files and indexes (design doc §13.3, §14.4).
// Client code compares it with the build of data it loads; tests read it to learn what
// configuration the artifact was built with.
export default defineEmitter({
  name: 'build-info',
  description: 'public/generated/build.json: build id, mode, base path and locales',
  order: 0,
  run({ config, locales, write }) {
    const info = {
      buildId: config.buildId,
      buildMode: config.buildMode,
      origin: config.origin,
      basePath: config.basePath,
      urlPattern: config.urlPattern,
      defaultLocale: config.defaultLocale,
      locales: locales.map(({ code, pathPrefix, htmlLang, direction }) => ({ code, pathPrefix, htmlLang, direction })),
    };
    write('public', 'build.json', `${JSON.stringify(info, null, 2)}\n`);
  },
});
