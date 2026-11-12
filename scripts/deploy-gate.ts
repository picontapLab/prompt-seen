// Runs with Node's built-in TypeScript support, before installing or executing candidate code.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

type Run = {
  id: number;
  head_sha: string;
  head_branch: string;
  event: string;
  status: string;
  conclusion: string | null;
};
type Job = { name: string; conclusion: string | null };
type Get = <T>(path: string) => Promise<T>;

export const requiredJobs = [
  'check',
  'secrets',
  ...['root', 'subpath'].flatMap((path) => [
    `build (${path})`,
    ...['chromium', 'firefox', 'webkit'].map((browser) => `build-and-test (${path}, ${browser})`),
  ]),
];

/** Only the latest main revision with a successful, complete CI can move production forward. */
export async function checkRelease({
  get,
  ref,
  liveSha,
}: {
  get: Get;
  ref: string;
  liveSha: string | null;
}): Promise<{ sha: string; runId: number }> {
  const { sha } = await get<{ sha: string }>(`commits/${encodeURIComponent(ref)}`);
  const main = await get<{ sha: string }>('commits/main');
  if (sha !== main.sha) throw new Error('Candidate is no longer main HEAD. Use Rollback for an earlier release.');

  // Do not filter by success: a newer failed/in-progress run must override an older green run.
  const { workflow_runs: runs } = await get<{ workflow_runs: Run[] }>(
    `actions/workflows/ci.yml/runs?head_sha=${sha}&branch=main&event=push&per_page=100`,
  );
  const latest = runs
    .filter((run) => run.head_sha === sha && run.head_branch === 'main' && run.event === 'push')
    .sort((a, b) => b.id - a.id)[0];
  if (!latest || latest.status !== 'completed' || latest.conclusion !== 'success')
    throw new Error('The pinned SHA has no current successful push CI on main.');

  const jobs: Job[] = [];
  for (let page = 1; ; page++) {
    const result = await get<{ jobs: Job[] }>(`actions/runs/${latest.id}/jobs?filter=latest&per_page=100&page=${page}`);
    jobs.push(...result.jobs);
    if (result.jobs.length < 100) break;
  }
  for (const name of requiredJobs) {
    if (!jobs.some((job) => job.name === name && job.conclusion === 'success'))
      throw new Error(`Required CI job did not pass: ${name}`);
  }

  if (liveSha && liveSha !== sha) {
    if (!/^[a-f0-9]{40}$/.test(liveSha)) throw new Error('Live deployment has no verifiable commit. Use Rollback.');
    const comparison = await get<{ status: string }>(`compare/${liveSha}...${sha}`);
    if (comparison.status !== 'ahead')
      throw new Error('Candidate would move production backwards or to divergent history. Use Rollback.');
  }
  return { sha, runId: latest.id };
}

async function main() {
  const env = process.env;
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY || !env.CANDIDATE_REF)
    throw new Error('Missing release gate configuration.');
  const get: Get = async <T>(path: string) => {
    const response = await fetch(
      `${env.GITHUB_API_URL || 'https://api.github.com'}/repos/${env.GITHUB_REPOSITORY}/${path}`,
      {
        headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok) throw new Error(`GitHub release verification failed (${response.status}).`);
    return (await response.json()) as T;
  };

  // Cloudflare's canonical deployment is authoritative, including after a rollback or a failed live check.
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID || !env.PROJECT)
    throw new Error('Missing Cloudflare release verification configuration.');
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/pages/projects/${encodeURIComponent(env.PROJECT)}`,
    { headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` }, signal: AbortSignal.timeout(30_000) },
  );
  const body = (await response.json()) as {
    success: boolean;
    result?: { canonical_deployment?: { deployment_trigger?: { metadata?: { commit_hash?: string } } } | null };
  };
  if (!response.ok || !body.success || !body.result) throw new Error('Cannot verify the live production deployment.');
  const live = body.result.canonical_deployment;
  const liveSha = live?.deployment_trigger?.metadata?.commit_hash;
  if (live && !liveSha) throw new Error('Live deployment has no commit metadata. Use Rollback.');
  const release = await checkRelease({ get, ref: env.CANDIDATE_REF, liveSha: liveSha ?? null });
  if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, `sha=${release.sha}\nci_run=${release.runId}\n`);
  if (env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(
      env.GITHUB_STEP_SUMMARY,
      `Release gate: \`${release.sha}\`, CI run ${release.runId}; main HEAD and production ancestry verified.\n`,
    );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Release verification failed.');
    process.exitCode = 1;
  });
}
