import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { campaignCoverage } from './coverage';

it('counts only accepted runs toward the campaign target and retains historical totals', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-'));
  const write = (file: string, value: unknown) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), JSON.stringify(value));
  };
  try {
    write('production/test/campaign.json', {
      cases: [{ candidateId: 'case', expectedOutputs: 2, acceptedExampleIds: ['x_002'] }],
    });
    write('content/prompts/p_001/entry.yaml', { id: 'p_001', inspirationSources: [{ candidateId: 'case' }] });
    for (const id of ['x_001', 'x_002'])
      write(`content/examples/${id}/run.yaml`, { id, promptId: 'p_001', outputAssetIds: [id] });
    expect(campaignCoverage(root, 'test')).toMatchObject({
      recordedOutputs: 2,
      acceptedOutputs: 1,
      acceptedCases: 0,
      cases: [{ complete: false }],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
