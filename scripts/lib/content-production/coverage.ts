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
const appliedSchema = z.object({
  candidateId: z.string(),
  ids: z.object({ prompt: z.string(), example: z.string() }),
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
  const appliedDir = path.join(root, 'production/applied');
  const receipts = fs.existsSync(appliedDir)
    ? fs
        .readdirSync(appliedDir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => appliedSchema.parse(JSON.parse(fs.readFileSync(path.join(appliedDir, name), 'utf8'))))
    : [];
  const cases = definition.cases.map(({ candidateId, expectedOutputs, acceptedExampleIds }) => {
    const applied = receipts.filter((receipt) => receipt.candidateId === candidateId);
    const promptIds = [...new Set(applied.map((receipt) => receipt.ids.prompt))];
    if (promptIds.length > 1)
      throw new Error(`Candidate ${candidateId} has conflicting applied prompts: ${promptIds.join(', ')}`);
    const prompt = applied.length
      ? prompts.find((prompt) => prompt.id === promptIds[0])
      : prompts.find((prompt) =>
          prompt.inspirationSources?.some((source: { candidateId?: string }) => source.candidateId === candidateId),
        );
    for (const receipt of applied) {
      const run = runs.find((run) => run.id === receipt.ids.example);
      if (!prompt || !run || run.promptId !== prompt.id)
        throw new Error(
          `Candidate ${candidateId} has an invalid applied receipt: ${receipt.ids.prompt}/${receipt.ids.example}`,
        );
    }
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
