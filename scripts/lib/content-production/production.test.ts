import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { planJob, claimJob, recordJob, reviewJob, jobStatus } from './production';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));
it('resumes a frozen job and refuses unclaimed results, changed inputs and accidental retries', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-production-'));
  roots.push(root);
  const reference = path.join(root, 'portrait.png');
  fs.writeFileSync(reference, 'input-v1');
  const job = {
    key: 'wedding-default',
    candidateId: 'CN01',
    prompt: 'Two adults in a garden.',
    references: [{ slotId: 'personA', path: reference }],
    targetAspectRatio: '4:5',
  };
  const planned = planJob(root, job);
  expect(planJob(root, job).fingerprint).toBe(planned.fingerprint);
  expect(() => recordJob(root, job.key, { outputPath: reference, provider: 'tool', model: null })).toThrow(/running/);
  const claimed = claimJob(root, job.key);
  expect(claimed.prompt).toBe(job.prompt);
  expect(() => claimJob(root, job.key)).toThrow(/already/);
  fs.writeFileSync(reference, 'input-v2');
  expect(() => recordJob(root, job.key, { outputPath: reference, provider: 'tool', model: null })).toThrow(/changed/);
  fs.writeFileSync(reference, 'input-v1');
  const output = path.join(root, 'result.png');
  fs.writeFileSync(output, 'output-v1');
  recordJob(root, job.key, { outputPath: output, provider: 'tool', model: null });
  expect(jobStatus(root, job.key).status).toBe('generated');
  reviewJob(root, job.key, {
    accepted: true,
    notes: 'Two identities and natural proportions checked.',
    reviewer: 'editor',
  });
  expect(jobStatus(root, job.key).status).toBe('accepted');
});
