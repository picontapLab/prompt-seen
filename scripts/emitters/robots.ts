import { robotsTxt } from '../../src/modules/geo/robots';
import { defineEmitter } from './_types';

// The robots snippet a host merges into its root robots.txt when this site lives under a subpath
// (design doc §9.10.2, §15.4.3; site.yaml `robots.mode: snippet`). Crawlers never read
// /prompt-seen/robots.txt, so without this the AI crawler policy would not apply. In standalone
// mode, or at the root of a host, the exported robots.txt is the host's file and no snippet is
// written. Same rules as the robots.txt route (src/modules/geo/robots.ts).
export default defineEmitter({
  name: 'robots',
  description: 'deploy/generated/robots-snippet.txt: crawler rules for the host to merge (snippet mode)',
  run({ config, url, write }) {
    // At the root of a host the exported robots.txt is the host's file: nothing to merge.
    if (config.robots.mode !== 'snippet' || url.withBasePath('/') === '/') return;
    const root = new URL(url.absoluteUrl(url.paths.languageEntry()));
    write(
      'deploy',
      'robots-snippet.txt',
      robotsTxt({
        mode: 'snippet',
        scope: url.withBasePath('/'),
        aiTraining: config.robots.aiTraining,
        sitemapUrl: url.absoluteUrl(url.paths.sitemapIndex()),
        hostRobotsUrl: new URL('/robots.txt', root).href,
      }),
    );
  },
});
