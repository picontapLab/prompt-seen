import { promptJsonFile } from '../../src/modules/feed/files';
import { defineEmitter } from './_types';

// The detail model of every visible prompt as public JSON (design doc §3.5): the list
// prefetches it when a card shows intent (§11.8.2), and the popup of step 4a renders
// PromptDetailBody from it, the same model the full page renders on the server.

export default defineEmitter({
  name: 'prompt-json',
  description: 'public/generated/{locale}/prompts/{slug}.json: detail models for the popup',
  run({ content, write }) {
    for (const d of content.details) {
      if (d.kind !== 'prompt') continue;
      write('public', promptJsonFile(d.locale, d.model.slug), `${JSON.stringify(d.model)}\n`);
    }
  },
});
