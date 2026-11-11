// content:validate (design doc §14.3): the instance configuration, the UI message catalogs,
// and every content file: schemas, references, template rules, media files, redirects and the
// publishing rules of each locale version. Exit code 1 on errors or publish errors.
//
//   npm run content:validate             everything
//   npm run content:validate -- --quiet  without info-level maintenance hints
import { ConfigError, loadConfig } from '../src/config/load';
import { validateBuildMessages } from './lib/localization/messages';
import { createUrlModule, urlConfigOf } from '../src/modules/url/create';
import { Findings, printFindings } from './lib/content/findings';
import { loadContent } from './lib/content/load';
import { ROOT } from './lib/paths';

const findings = new Findings(ROOT);

try {
  const config = loadConfig(ROOT);
  validateBuildMessages(ROOT, config, findings);

  // Content (step 1b). Findings do not depend on the build mode; what each build shows does.
  const url = createUrlModule(urlConfigOf(config));
  for (const f of loadContent({ root: ROOT, config, url }).findings.list) findings.add(f);
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;
  findings.add({
    level: 'error',
    file: error.file,
    message: error.issues.map((i) => `${i.path || '(root)'}: ${i.message}`).join('; '),
  });
}

printFindings(findings.list, 'content:validate', { quietInfo: process.argv.includes('--quiet') });
process.exit(findings.blocking ? 1 : 0);
