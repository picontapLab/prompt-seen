import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { campaignCoverage } from './coverage';

function withCampaign(files: Record<string, unknown>, check: (root: string) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-'));
  try {
    for (const [file, value] of Object.entries(files)) {
      const target = path.join(root, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, JSON.stringify(value));
    }
    check(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

it('counts an original case through its applied receipt without requiring an external source', () => {
  withCampaign(
    {
      'production/test/campaign.json': {
        cases: [{ candidateId: 'original', expectedOutputs: 1, acceptedExampleIds: ['x_001'] }],
      },
      'production/applied/original.json': {
        candidateId: 'original',
        ids: { prompt: 'p_001', example: 'x_001' },
      },
      'content/prompts/p_001/entry.yaml': { id: 'p_001', inspirationSources: [] },
      'content/examples/x_001/run.yaml': { id: 'x_001', promptId: 'p_001', outputAssetIds: ['a_001'] },
    },
    (root) =>
      expect(campaignCoverage(root, 'test')).toMatchObject({
        recordedCases: 1,
        acceptedCases: 1,
        recordedOutputs: 1,
        acceptedOutputs: 1,
        cases: [{ promptId: 'p_001', complete: true }],
      }),
  );
});

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

it('rejects conflicting applied mappings instead of silently choosing the first prompt', () => {
  withCampaign(
    {
      'production/test/campaign.json': { cases: [{ candidateId: 'case', expectedOutputs: 1 }] },
      'production/applied/one.json': { candidateId: 'case', ids: { prompt: 'p_001', example: 'x_001' } },
      'production/applied/two.json': { candidateId: 'case', ids: { prompt: 'p_002', example: 'x_002' } },
      'content/prompts/p_001/entry.yaml': { id: 'p_001' },
      'content/prompts/p_002/entry.yaml': { id: 'p_002' },
      'content/examples/x_001/run.yaml': { id: 'x_001', promptId: 'p_001', outputAssetIds: ['a_001'] },
      'content/examples/x_002/run.yaml': { id: 'x_002', promptId: 'p_002', outputAssetIds: ['a_002'] },
    },
    (root) => expect(() => campaignCoverage(root, 'test')).toThrow(/case.*conflicting.*p_001.*p_002/i),
  );
});

it.each([
  ['missing prompt', 'p_missing', 'x_001'],
  ['missing run', 'p_001', 'x_missing'],
  ['run owned by another prompt', 'p_001', 'x_other'],
])('reports an invalid receipt with a %s even when a legacy source matches', (_label, prompt, example) => {
  withCampaign(
    {
      'production/test/campaign.json': {
        cases: [{ candidateId: 'case', expectedOutputs: 1, acceptedExampleIds: ['x_001'] }],
      },
      'production/applied/invalid.json': { candidateId: 'case', ids: { prompt, example } },
      'content/prompts/p_001/entry.yaml': { id: 'p_001', inspirationSources: [{ candidateId: 'case' }] },
      'content/examples/x_001/run.yaml': { id: 'x_001', promptId: 'p_001', outputAssetIds: ['a_001'] },
      'content/examples/x_other/run.yaml': { id: 'x_other', promptId: 'p_other', outputAssetIds: ['a_002'] },
    },
    (root) => expect(() => campaignCoverage(root, 'test')).toThrow(/case.*invalid applied receipt/i),
  );
});

it('finds a historical candidate in any inspiration source when there is no applied receipt', () => {
  withCampaign(
    {
      'production/test/campaign.json': {
        cases: [{ candidateId: 'legacy', expectedOutputs: 1, acceptedExampleIds: ['x_001'] }],
      },
      'content/prompts/p_001/entry.yaml': {
        id: 'p_001',
        inspirationSources: [{ candidateId: 'other' }, { candidateId: 'legacy' }],
      },
      'content/examples/x_001/run.yaml': { id: 'x_001', promptId: 'p_001', outputAssetIds: ['a_001'] },
    },
    (root) => expect(campaignCoverage(root, 'test')).toMatchObject({ acceptedCases: 1, acceptedOutputs: 1 }),
  );
});

it('merges repeated receipts without double counting and ignores foreign or deleted accepted runs', () => {
  withCampaign(
    {
      'production/test/campaign.json': {
        cases: [
          {
            candidateId: 'case',
            expectedOutputs: 3,
            acceptedExampleIds: ['x_001', 'x_001', 'x_002', 'x_other', 'x_deleted'],
          },
        ],
      },
      'production/applied/one.json': { candidateId: 'case', ids: { prompt: 'p_001', example: 'x_001' } },
      'production/applied/two.json': { candidateId: 'case', ids: { prompt: 'p_001', example: 'x_002' } },
      'production/applied/duplicate.json': { candidateId: 'case', ids: { prompt: 'p_001', example: 'x_001' } },
      'content/prompts/p_001/entry.yaml': { id: 'p_001', inspirationSources: [] },
      'content/examples/x_001/run.yaml': { id: 'x_001', promptId: 'p_001', outputAssetIds: ['a_001'] },
      'content/examples/x_002/run.yaml': { id: 'x_002', promptId: 'p_001', outputAssetIds: ['a_002'] },
      'content/examples/x_003/run.yaml': { id: 'x_003', promptId: 'p_001', outputAssetIds: ['a_003', 'a_004'] },
      'content/examples/x_other/run.yaml': { id: 'x_other', promptId: 'p_other', outputAssetIds: ['a_005'] },
    },
    (root) =>
      expect(campaignCoverage(root, 'test')).toMatchObject({
        recordedOutputs: 4,
        acceptedOutputs: 2,
        acceptedCases: 0,
        cases: [{ complete: false }],
      }),
  );
});
