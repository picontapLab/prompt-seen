import { hostRules, vercelConfig } from '../lib/hosts';
import { defineEmitter } from './_types';

// Vercel host file (design doc §9.5; subpath memo §3.3): deploy/generated/vercel/vercel.json goes
// beside the published directory. Redirects only: Vercel serves no 410 for static files.
export default defineEmitter({
  name: 'vercel',
  description: 'deploy/generated/vercel/vercel.json: redirects for Vercel',
  run({ content, locales, url, write }) {
    write('deploy', 'vercel/vercel.json', vercelConfig(hostRules(content.manifest, url, locales)));
  },
});
