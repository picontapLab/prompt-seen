import type { ResolvedConfig } from '../../../src/config/schema';
import type { Findings } from './findings';
import type { Content } from './read';

// The home first screen's works on show in site.yaml (`home.featured`, design doc §11.8.1):
// every ID must exist, and only annotated prompts can be on show, since the first screen shows
// what each phrase does (§5.2). Called by validateContent.

const FILE = 'content/site.yaml';

export function validateHomeSettings(content: Content, config: ResolvedConfig, findings: Findings): void {
  const seen = new Set<string>();
  config.home.featured.forEach((item, i) => {
    const field = `home.featured.${i}.prompt`;
    const prompt = content.prompts.get(item.prompt);
    if (!prompt) {
      findings.error(FILE, `prompt ${item.prompt} does not exist`, {
        field,
        fix: 'use the ID of an existing prompt, e.g. "p_045"',
      });
      return;
    }
    if (prompt.data.annotations.length === 0)
      findings.error(FILE, `the featured work ${item.prompt} has no annotations`, {
        field,
        fix: 'feature an annotated prompt (annotations in its entry.yaml); the first screen shows what each phrase does',
      });
    if (seen.has(item.prompt))
      findings.warning(FILE, `${item.prompt} is featured more than once; only its first entry counts`, { field });
    seen.add(item.prompt);
  });
}
