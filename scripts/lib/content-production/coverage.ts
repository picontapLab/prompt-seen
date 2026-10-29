import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';

const campaignSchema = z.object({
  cases: z.array(
    z.object({
      candidateId: z.string(),
      expectedOutputs: z.number().int().positive(),
      acceptedExampleIds: z.array(z.string()).default([]),
    }),
  ),
});
const entries = (dir: string, file: string) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((name) => fs.existsSync(path.join(dir, name, file)))
        .map((name) => YAML.parse(fs.readFileSync(path.join(dir, name, file), 'utf8')))
    : [];

/** Coverage is derived from content records, never from the number of generation calls. */
export function campaignCoverage(root: string, campaign: string) {
  const definition = campaignSchema.parse(
    JSON.parse(fs.readFileSync(path.join(root, 'production', campaign, 'campaign.json'), 'utf8')),
  );
  const prompts = entries(path.join(root, 'content/prompts'), 'entry.yaml');
  const runs = entries(path.join(root, 'content/examples'), 'run.yaml');
  const cases = definition.cases.map(({ candidateId, expectedOutputs, acceptedExampleIds }) => {
    const prompt = prompts.find((prompt) => prompt.inspirationSources?.[0]?.candidateId === candidateId);
    const outputs = prompt
      ? runs.filter((run) => run.promptId === prompt.id).reduce((sum, run) => sum + run.outputAssetIds.length, 0)
      : 0;
    const acceptedOutputs = prompt
      ? runs
          .filter((run) => run.promptId === prompt.id && acceptedExampleIds.includes(run.id))
          .reduce((sum, run) => sum + run.outputAssetIds.length, 0)
      : 0;
    return {
      candidateId,
      promptId: prompt?.id ?? null,
      outputs,
      expectedOutputs,
      acceptedOutputs,
      complete: acceptedOutputs >= expectedOutputs,
    };
  });
  return {
    cases,
    recordedCases: cases.filter((item) => item.outputs > 0).length,
    targetCases: cases.length,
    acceptedCases: cases.filter((item) => item.complete).length,
    acceptedOutputs: cases.reduce((sum, item) => sum + item.acceptedOutputs, 0),
    recordedOutputs: cases.reduce((sum, item) => sum + item.outputs, 0),
    targetOutputs: cases.reduce((sum, item) => sum + item.expectedOutputs, 0),
  };
}
