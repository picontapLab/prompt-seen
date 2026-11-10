# Incremental image content

`content:produce` freezes the exact submitted prompt and ordered reference bytes, records the actual image returned by the image tool, and publishes an accepted result through a staged content validation and transaction journal. It never calls an image provider, invents a model ID, or automatically retries a running job.

```sh
npm run content:produce -- plan --campaign top50-2026-10 --file job.json
npm run content:produce -- claim --campaign top50-2026-10 --key example-default
# Generate the returned prompt with the returned reference files, then save the actual receipt.
npm run content:produce -- record --campaign top50-2026-10 --key example-default --file receipt.json
npm run content:produce -- review --campaign top50-2026-10 --key example-default --file review.json
# Review all recipe copy, input labels and alt text; get the hash and add the attestation.
npm run content:produce -- recipe-hash --file recipe.json
npm run content:produce -- prepare --campaign top50-2026-10 --key example-default --file recipe.json
npm run content:produce -- apply --key example-default --hash HASH_RETURNED_BY_PREPARE
npm run content:produce -- status --campaign top50-2026-10
```

- Job: `key`, `candidateId`, `prompt`, `references: [{slotId, path}]`, `targetAspectRatio` (or `null` when no aspect setting was submitted).
- Receipt: `outputPath`, `provider`, `model` (record the known model family/name; keep `null` only when the model identity is genuinely unknown).
- Review: `accepted`, `notes`, `reviewer`. Review pixels, specified text, reference roles and small-image readability before accepting.
- Editorial review: after checking the complete recipe in both languages, add `editorialReview: {reviewer, reviewedAt, contentHash}` using the hash from `recipe-hash`. This is separate from image review. Any recipe change invalidates the attestation.
- Recipe: see the concrete files in `top50-2026-10/recipes/`. An additional run supplies `target: {promptId, sampleName}` and its actual `values`. Used template bodies, fields, input contracts and existing sample values are immutable. Create a new version for semantic changes.
- A recipe may supply `source: {author, url, license}` for prompt attribution. For `source-prompt` without an explicit source, the publisher uses the sole inspiration source's author and URL (or leaves them unknown when ambiguous), and leaves the license unknown. It never assigns the site's license to a quoted author prompt by default.
- `--root` and `--job-dir` allow isolated fixture libraries. Without a campaign, jobs live under `.artifacts/content-production/jobs`.

`status` reports job state and prepared/applied state. A campaign's `campaign.json` supplies expected cases, outputs and the reviewed `acceptedExampleIds` for each case. Coverage reports recorded and accepted counts separately; only accepted runs count toward completion. Keep this acceptance list in sync with the editorial review and content map. Historical runs may include a weaker earlier result.

## Resume safely

If the provider returned an error without an image, reconcile the claimed attempt with `content:produce fail --campaign <campaign> --key <key> --file failure.json`. The file contains `provider`, the actual `message`, and `requestId` (or `null` when absent). The job becomes `needs_attention` without an output receipt and cannot be reviewed, published, or silently reclaimed. Preserve the failure before deciding on a new attempt key.

Frozen attempts live under `.artifacts/content-production/<campaign>/jobs/`. A running job must be reconciled against the returned image before another attempt. A changed prompt, input or setting needs a new key. This campaign limits a recipe/sample to three attempts before reconsidering the recipe; there is no automatic retry loop. Failed-attempt records may remain in the ignored local campaign workspace while a run is being diagnosed.

Preparation writes `.artifacts/content-production/prepared/<key>/prepared.json` with a plan hash and hashes of every destination. Apply aborts if any destination changed. After interruption, rerun apply with the same hash: the existing transaction journal resumes or rolls back safely and refuses external-edit conflicts. An already applied, unchanged plan is idempotent. Do not reuse an applied plan after later editorial changes. Local failed-attempt records are disposable and are not runtime inputs.

Content writes and `content:new` share `.artifacts/content-production/.content.lock`. If a process was killed, inspect its recorded PID and verify it is no longer running before manually removing the stale lock. Never remove a live writer's lock.

Published receipts are in `production/applied/`; run snapshots and referenced media are in `content/` and `public/media/`. The first case (#40) predates this incremental CLI and is traced through `content/examples/x_146/` and the campaign mapping. Original generated files are copied, never moved. Display variants contain source metadata; previously published variant keys stay available for rollback; unused derivatives created during this unpublished batch were removed.

## Top 50 provenance

The collection is an editorial selection, not a cross-platform popularity leaderboard. Source metrics belong to original posts and keep their observation dates and evidence method. All website prompts are independent adaptations; generated examples and synthetic references are Prompt Seen demonstrations. The map reference uses Natural Earth public-domain data with explicit attribution. The campaign uses OpenAI GPT Image. The known family is recorded as `displayName: GPT Image`; exact version IDs were not returned, so `providerModelId` remains `null`. See `top50-2026-10/model-annotation.json` for the correction of earlier missing family names; original receipts retain their historical values.

The live site is not deployed by these commands. Build and verify the packaged artifact, then use the repository's deployment workflow with its real `SITE_ORIGIN` and configured credentials.
