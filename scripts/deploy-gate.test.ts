import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { checkRelease, requiredJobs } from './deploy-gate';

const sha = 'a'.repeat(40);
const liveSha = 'b'.repeat(40);
const green = { id: 10, head_sha: sha, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' };
function fixture(overrides: Record<string, unknown> = {}) {
  const responses: Record<string, unknown> = {
    'commits/release-tag': { sha },
    'commits/main': { sha },
    [`actions/workflows/ci.yml/runs?head_sha=${sha}&branch=main&event=push&per_page=100`]: { workflow_runs: [green] },
    'actions/runs/10/jobs?filter=latest&per_page=100&page=1': {
      jobs: requiredJobs.map((name) => ({ name, conclusion: 'success' })),
    },
    [`compare/${liveSha}...${sha}`]: { status: 'ahead' },
    ...overrides,
  };
  return {
    ref: 'release-tag',
    liveSha,
    get: async <T>(path: string): Promise<T> => {
      if (!(path in responses)) throw new Error(`Unexpected API request: ${path}`);
      return responses[path] as T;
    },
  };
}
const runsPath = `actions/workflows/ci.yml/runs?head_sha=${sha}&branch=main&event=push&per_page=100`;

describe('production release gate', () => {
  it('matches the two builds and all six isolated browser jobs in CI, with secret-gated preview', () => {
    const { jobs } = YAML.parse(fs.readFileSync('.github/workflows/ci.yml', 'utf8'));
    const builds = jobs.build.strategy.matrix.include.map((entry: { name: string }) => `build (${entry.name})`);
    const browsers = jobs['build-and-test'].strategy.matrix;
    const checks = browsers.name.flatMap((name: string) =>
      browsers.browser.map((browser: string) => `build-and-test (${name}, ${browser})`),
    );
    expect(builds).toHaveLength(2);
    expect(checks).toHaveLength(6);
    expect([...requiredJobs].sort()).toEqual(['check', 'secrets', ...builds, ...checks].sort());
    expect(jobs.preview.needs).toEqual(expect.arrayContaining(['check', 'secrets', 'build-and-test']));
  });
  it('pins a mutable ref to its verified SHA and allows a forward release', async () => {
    await expect(checkRelease(fixture())).resolves.toEqual({ sha, runId: 10 });
  });
  it('rejects a rerun of old CI after main has advanced, including at the pre-upload recheck', async () => {
    await expect(checkRelease(fixture({ 'commits/main': { sha: liveSha } }))).rejects.toThrow('main HEAD');
  });
  it.each(['failure', 'cancelled', null])('does not let manual dispatch bypass CI (%s)', async (conclusion) => {
    await expect(checkRelease(fixture({ [runsPath]: { workflow_runs: [{ ...green, conclusion }] } }))).rejects.toThrow(
      'successful push CI',
    );
  });
  it('rejects a newer failed run even when an older run succeeded', async () => {
    await expect(
      checkRelease(fixture({ [runsPath]: { workflow_runs: [green, { ...green, id: 11, conclusion: 'failure' }] } })),
    ).rejects.toThrow('successful push CI');
  });
  it.each([{ head_sha: liveSha }, { event: 'pull_request' }, { head_branch: 'feature' }, { status: 'in_progress' }])(
    'rejects CI for the wrong SHA, event, branch or state (%j)',
    async (fields) => {
      await expect(checkRelease(fixture({ [runsPath]: { workflow_runs: [{ ...green, ...fields }] } }))).rejects.toThrow(
        'successful push CI',
      );
    },
  );
  it('fails closed with no CI history', async () => {
    await expect(checkRelease(fixture({ [runsPath]: { workflow_runs: [] } }))).rejects.toThrow('successful push CI');
  });
  it.each(['secrets', 'build-and-test (subpath, webkit)'])(
    'requires %s to pass even if the workflow reports success',
    async (name) => {
      await expect(
        checkRelease(
          fixture({
            'actions/runs/10/jobs?filter=latest&per_page=100&page=1': {
              jobs: requiredJobs.filter((job) => job !== name).map((job) => ({ name: job, conclusion: 'success' })),
            },
          }),
        ),
      ).rejects.toThrow(name);
    },
  );
  it.each(['behind', 'diverged'])('rejects a %s main after a force push', async (status) => {
    await expect(checkRelease(fixture({ [`compare/${liveSha}...${sha}`]: { status } }))).rejects.toThrow(
      'Use Rollback',
    );
  });
  it('allows a first deployment or redeployment of the current commit', async () => {
    for (const current of [null, sha])
      await expect(checkRelease({ ...fixture(), liveSha: current })).resolves.toEqual({ sha, runId: 10 });
  });
  it('rejects unverifiable live metadata', async () => {
    await expect(checkRelease({ ...fixture(), liveSha: 'unknown' })).rejects.toThrow('verifiable commit');
  });
  it('checks required jobs beyond the first API page', async () => {
    await expect(
      checkRelease(
        fixture({
          'actions/runs/10/jobs?filter=latest&per_page=100&page=1': {
            jobs: Array.from({ length: 100 }, () => ({ name: 'unrelated', conclusion: 'success' })),
          },
          'actions/runs/10/jobs?filter=latest&per_page=100&page=2': {
            jobs: requiredJobs.map((name) => ({ name, conclusion: 'success' })),
          },
        }),
      ),
    ).resolves.toEqual({ sha, runId: 10 });
  });
  it('does not release during an API outage', async () => {
    await expect(
      checkRelease({
        ...fixture(),
        get: async () => {
          throw new Error('unavailable');
        },
      }),
    ).rejects.toThrow('unavailable');
  });
});
