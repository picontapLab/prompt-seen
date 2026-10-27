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
      siteName: config.siteName,
      buildMode: config.buildMode,
      origin: config.origin,
      basePath: config.basePath,
      urlPattern: config.urlPattern,
      // Where images are served from: null for files of this build, else the CDN (§10.1).
      mediaBaseUrl: config.media.baseUrl,
      defaultLocale: config.defaultLocale,
      // `enabled`: public; a built locale that is not is a preview-only draft (§8.2), which gets no
      // sitemap, Markdown versions or llms.txt lines (§9.10.4).
      locales: locales.map(({ code, pathPrefix, nativeName, htmlLang, direction, enabled }) => ({
        code,
        pathPrefix,
        nativeName,
        htmlLang,
        direction,
        enabled,
      })),
    };
    write('public', 'build.json', `${JSON.stringify(info, null, 2)}\n`);
  },
});
