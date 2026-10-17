import type { ResolvedConfig } from '../../../src/config/schema';
import type { Findings } from './findings';
import type { Content } from './read';

// The list's editorial settings in site.yaml (`feed`, design doc §11.8.2): every ID must exist,
// and the showcase band's lead work must carry annotations, since the band shows its annotated
// quote (§5.2: only annotated works lead a showcase). Called by validateContent.

const FILE = 'content/site.yaml';

export function validateFeedSettings(content: Content, config: ResolvedConfig, findings: Findings): void {
  const prompt = (id: string, field: string) => {
    if (content.prompts.has(id)) return content.prompts.get(id)!;
    findings.error(FILE, `prompt ${id} does not exist`, { field, fix: 'use the ID of an existing prompt, e.g. "p_012"' });
    return null;
  };

  config.feed.showcase.forEach((group, i) => {
    const lead = prompt(group.lead, `feed.showcase.${i}.lead`);
    if (lead && lead.data.annotations.length === 0)
      findings.error(FILE, `the showcase lead ${group.lead} has no annotations`, {
        field: `feed.showcase.${i}.lead`,
        fix: 'lead with an annotated prompt (annotations in its entry.yaml), or move it to works',
      });
    group.works.forEach((id, j) => prompt(id, `feed.showcase.${i}.works.${j}`));
  });

  config.feed.interludes.forEach((item, i) => {
    const field = `feed.interludes.${i}`;
    if (item.type === 'feature') prompt(item.prompt, `${field}.prompt`);
    else if (item.type === 'templates')
      (item.templates ?? []).forEach((id, j) => {
        if (!content.templates.has(id))
          findings.error(FILE, `template ${id} does not exist`, { field: `${field}.templates.${j}` });
      });
    else if (!content.collections.has(item.collection))
      findings.error(FILE, `collection ${item.collection} does not exist`, { field: `${field}.collection` });
  });
}
