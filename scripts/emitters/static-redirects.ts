import { hostRules, metaRefreshPage } from '../lib/hosts';
import { defineEmitter } from './_types';

// For hosts that cannot be configured (GitHub Pages, a bare bucket; design doc §9.5): a page at
// every old address that moves on at once. deploy/generated/static/ mirrors dist/: copy it over
// dist/ before publishing. Not part of dist/ itself, so configurable hosts answer real 301s.
// Removed addresses have no page and answer the host's 404.
export default defineEmitter({
  name: 'static-redirects',
  description: 'deploy/generated/static/: meta refresh pages for hosts without redirect rules',
  run({ content, locales, url, write }) {
    const base = url.withBasePath('/');
    for (const r of hostRules(content.manifest, url, locales).redirects) {
      const internal = `/${r.to.slice(base.length)}`;
      write('deploy', `static${r.from}index.html`, metaRefreshPage(r.to, url.absoluteUrl(internal)));
    }
  },
});
