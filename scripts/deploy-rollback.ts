// Production rollback on Cloudflare Pages (design doc §15.3): put an earlier successful production
// deployment back in place. Pages keeps every deployment's files, and images keep their old
// keys (§10.4), so the earlier site comes back as it was, without a rebuild.
//
//   npm run deploy:rollback -- --list              recent production deployments
//   npm run deploy:rollback -- --yes               back to the one before the current deployment
//   npm run deploy:rollback -- --to <id | commit> --yes
//
// Needs CLOUDFLARE_API_TOKEN (Pages: Edit), CLOUDFLARE_ACCOUNT_ID and, unless the project is
// called prompt-seen, CLOUDFLARE_PAGES_PROJECT. The Rollback workflow runs it from GitHub.
import fs from 'node:fs';
import { parseArgs } from 'node:util';

type Deployment = {
  id: string;
  environment: 'production' | 'preview';
  created_on: string;
  url: string;
  latest_stage?: { name: string; status: string };
  deployment_trigger?: { metadata?: { commit_hash?: string; branch?: string; commit_message?: string } };
};

const API = 'https://api.cloudflare.com/client/v4';
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const project = process.env.CLOUDFLARE_PAGES_PROJECT || 'prompt-seen';

function fail(message: string): never {
  console.error(`deploy:rollback: ${message}`);
  process.exit(1);
}

async function api<T>(method: 'GET' | 'POST', path: string): Promise<T> {
  const res = await fetch(`${API}/accounts/${account}/pages/projects/${project}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    result?: T;
    errors?: { message: string }[];
  } | null;
  if (!res.ok || !body?.success)
    fail(`${method} ${path || '/'}: ${res.status} ${body?.errors?.map((e) => e.message).join('; ') ?? res.statusText}`);
  return body.result as T;
}

const succeeded = (d: Deployment) => d.latest_stage?.name === 'deploy' && d.latest_stage.status === 'success';
const commit = (d: Deployment) => d.deployment_trigger?.metadata?.commit_hash ?? '';
const line = (d: Deployment, current: string | undefined) =>
  `${d.id === current ? '*' : ' '} ${d.created_on.slice(0, 16).replace('T', ' ')}  ${commit(d).slice(0, 12).padEnd(12)}  ` +
  `${succeeded(d) ? 'ok    ' : (d.latest_stage?.status ?? '?').padEnd(6)}  ${d.id}  ${d.url}`;

async function main() {
  const { values } = parseArgs({
    options: { list: { type: 'boolean' }, to: { type: 'string' }, yes: { type: 'boolean' } },
  });
  if (!token || !account) fail('set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID (docs/operations.md)');

  const info = await api<{ canonical_deployment?: Deployment | null }>('GET', '');
  const current = info.canonical_deployment?.id;
  const deployments = (await api<Deployment[]>('GET', '/deployments?env=production&per_page=25')).sort((a, b) =>
    b.created_on.localeCompare(a.created_on),
  );

  if (values.list) {
    console.log(`Production deployments of ${project} (* = live):`);
    for (const d of deployments) console.log(line(d, current));
    return;
  }

  const live = deployments.find((d) => d.id === current) ?? deployments.find(succeeded);
  if (!live) fail('no successful production deployment yet');
  const target = values.to
    ? deployments.find((d) => d.id === values.to || (values.to!.length >= 7 && commit(d).startsWith(values.to!)))
    : deployments.find((d) => succeeded(d) && d.id !== live.id && d.created_on < live.created_on);
  if (!target)
    fail(
      values.to ? `no production deployment matches "${values.to}" (try --list)` : 'no earlier successful deployment',
    );
  if (!succeeded(target))
    fail(`${target.id} did not deploy successfully; Pages only rolls back to successful deployments`);
  if (target.id === live.id) fail(`${target.id} is already live`);

  console.log(`live:   ${line(live, current)}\ntarget: ${line(target, current)}`);
  if (!values.yes) {
    console.log('Run again with --yes to roll back.');
    return;
  }
  const done = await api<Deployment>('POST', `/deployments/${target.id}/rollback`);
  console.log(`deploy:rollback: production now serves ${done.id} (commit ${commit(done).slice(0, 12) || 'unknown'})`);
  // The Rollback workflow checks the live site for this build afterwards.
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `commit=${commit(done)}\n`);
  console.log(
    `::notice::Rolled back production to ${commit(done).slice(0, 12) || done.id}. Revert the commit on main too, or the next deploy brings it back.`,
  );
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
