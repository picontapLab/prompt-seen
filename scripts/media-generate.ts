import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { ROOT } from './lib/paths';
import { claimNext, migrationStatus, recordResult, reviewJob } from './lib/media-generation/jobs';
import { planMigration, rebaseMigration } from './lib/media-generation/manifest';
import { prepareJob } from './lib/media-generation/prepare';
import { applyMigration, rollbackMigration } from './lib/media-generation/migrate';
import { verifyMigration } from './lib/media-generation/verify';

const help = `Usage: npm run media:generate -- <command> [options]
Commands: plan [--rebase], status, next, record, review, prepare, apply [--dry-run|--offline], verify, rollback
Options: --migration <id> --job <a_NNN> --attempt <NNN> --claim <token>
         --receipt <json-file> --file <review-json> --scope pilot|final --all --json
Generation is dispatched by the agent through image_gen; this CLI never calls a paid API.
Review phases: generation (raw hash and subject/count/text/style/composition/artifacts checks),
display (processed hashes and card/detail/mobile/alt/annotations/focus checks).
verify requires pilot-review.json or acceptance.json evidence in migrations/<id>/.
Use node --import tsx scripts/media-generate.ts directly when running without npm.`;
async function main() {
  const { positionals, values: v } = parseArgs({
    allowPositionals: true,
    options: {
      migration: { type: 'string', default: 'gpt-image-v1' },
      job: { type: 'string' },
      attempt: { type: 'string' },
      claim: { type: 'string' },
      receipt: { type: 'string' },
      file: { type: 'string' },
      scope: { type: 'string' },
      rebase: { type: 'boolean' },
      all: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      offline: { type: 'boolean' },
      json: { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });
  if (v.help) {
    console.log(help);
    return;
  }
  const need = (value: string | undefined, name: string) => {
    if (!value) throw new Error(`--${name} is required`);
    return value;
  };
  const jsonFile = (file: string | undefined, flag: string) => JSON.parse(fs.readFileSync(need(file, flag), 'utf8'));
  const id = v.migration;
  let result: unknown;
  switch (positionals[0]) {
    case 'plan':
      result = await (v.rebase ? rebaseMigration(ROOT, id) : planMigration(ROOT, id));
      break;
    case 'status':
      result = migrationStatus(ROOT, id);
      break;
    case 'next': {
      const next = await claimNext(ROOT, id);
      result = next;
      if ('reason' in next) process.exitCode = 2;
      break;
    }
    case 'record':
      result = await recordResult(
        ROOT,
        need(v.job, 'job'),
        need(v.attempt, 'attempt'),
        need(v.claim, 'claim'),
        jsonFile(v.receipt, 'receipt'),
        id,
      );
      break;
    case 'review':
      result = await reviewJob(ROOT, need(v.job, 'job'), jsonFile(v.file, 'file'), id);
      break;
    case 'prepare': {
      if (v.all) {
        result = [];
        for (const job of migrationStatus(ROOT, id).jobs.filter((j) => j.state.status === 'accepted'))
          (result as unknown[]).push(await prepareJob(ROOT, job.id, id));
      } else result = await prepareJob(ROOT, need(v.job, 'job'), id);
      break;
    }
    case 'apply':
      result = await applyMigration(ROOT, { id, dryRun: v['dry-run'], offline: v.offline });
      break;
    case 'verify': {
      if (v.scope !== 'pilot' && v.scope !== 'final') throw new Error('--scope must be pilot or final');
      result = await verifyMigration(ROOT, v.scope, id);
      break;
    }
    case 'rollback':
      result = await rollbackMigration(ROOT, id);
      break;
    default:
      throw new Error(help);
  }
  console.log(JSON.stringify(result, null, 2));
}
main().catch((error: unknown) => {
  console.error(`media:generate: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
