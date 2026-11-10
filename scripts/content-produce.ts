import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { ROOT } from './lib/paths';
import { planJob, claimJob, recordJob, failJob, reviewJob, jobStatus } from './lib/content-production/production';
import { prepareContent, applyPrepared, recipeReviewHash } from './lib/content-production/publish';
import { campaignCoverage } from './lib/content-production/coverage';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    key: { type: 'string' },
    file: { type: 'string' },
    hash: { type: 'string' },
    'job-dir': { type: 'string' },
    root: { type: 'string' },
    campaign: { type: 'string' },
  },
});
const root = path.resolve(values.root ?? ROOT);
const campaign = values.campaign
  ? z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .parse(values.campaign)
  : null;
const jobRoot = path.resolve(
  values['job-dir'] ?? path.join(root, '.artifacts/content-production', ...(campaign ? [campaign] : []), 'jobs'),
);
const read = () => JSON.parse(fs.readFileSync(z.string().min(1).parse(values.file), 'utf8'));
async function main() {
  const key = values.key;
  if (positionals[0] === 'recipe-hash') return { contentHash: recipeReviewHash(read()) };
  if (positionals[0] === 'plan') return planJob(jobRoot, read());
  if (positionals[0] === 'status') {
    const keys = key
      ? [key]
      : fs.existsSync(jobRoot)
        ? fs.readdirSync(jobRoot).filter((k) => fs.existsSync(path.join(jobRoot, k, 'job.json')))
        : [];
    const jobs = keys.map((k) => {
      const job = jobStatus(jobRoot, k);
      return {
        key: k,
        candidateId: job.definition.candidateId,
        status: job.status,
        publication: fs.existsSync(path.join(root, 'production/applied', `${k}.json`))
          ? 'applied'
          : fs.existsSync(path.join(root, '.artifacts/content-production/prepared', k, 'prepared.json'))
            ? 'prepared'
            : 'not-prepared',
        fingerprint: job.fingerprint,
        review: job.review,
        failure: job.failure ?? null,
      };
    });
    return campaign ? { coverage: campaignCoverage(root, campaign), jobs } : jobs;
  }
  if (!key) throw new Error('--key is required');
  switch (positionals[0]) {
    case 'claim':
      return claimJob(jobRoot, key);
    case 'record':
      return recordJob(
        jobRoot,
        key,
        z.object({ outputPath: z.string(), provider: z.string(), model: z.string().nullable() }).strict().parse(read()),
      );
    case 'review':
      return reviewJob(
        jobRoot,
        key,
        z
          .object({ accepted: z.boolean(), notes: z.string().min(1), reviewer: z.string().min(1) })
          .strict()
          .parse(read()),
      );
    case 'prepare':
      return prepareContent(root, jobRoot, key, read());
    case 'fail':
      return failJob(jobRoot, key, read());
    case 'apply':
      return applyPrepared(root, key, z.string().min(1).parse(values.hash));
    default:
      throw new Error(
        'Usage: content:produce plan --file job.json | claim --key key | record|fail|review|prepare --key key --file input.json | apply --key key --hash sha256 | recipe-hash --file recipe.json | status [--key key]',
      );
  }
}
main()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
