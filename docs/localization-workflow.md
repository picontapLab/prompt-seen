# Localization workflow

The locale registry is the only policy source. Each registered language declares
`localization.coverage` (`incremental` or `complete`), `review` (`metadata` or
`fingerprint`) and `promptBodies` (`optional` or `source-only`). Complete coverage
requires fingerprint review. `enabled` and `preview` retain their existing meaning.

English and Simplified Chinese use incremental metadata review. Japanese and German
use complete fingerprint review and original Prompt bodies; both are enabled in the
registry. Spanish is preparing complete fingerprint coverage with original Prompt
bodies, and remains disabled with preview off. Other registered locales use
incremental fingerprint review. Registry enablement alone is not deployment evidence.

## Inspect and record scope

```sh
npm run locale:check -- --locale de
npm run locale:check -- --locale de --strict
npm run --silent locale:check -- --all --json
npm run locale:scope -- --locale de
npm run locale:scope -- --locale de --apply
```

Checks are read-only. `--locale` and `--all` are mutually exclusive. All-language
checks include enabled languages, preview languages and languages with preparation
directories. Reports use schema version 2; the all-language result is a versioned
`reports` envelope. Each report simulates production with its candidate language
enabled. This does not say that the language is live.

Targets come from published declarations and retained scope history, including
candidate-only publications. A fallback URL never counts as a translation. The
report identifies every missing page and deduplicates shared fields. It validates
the original source, target, dependencies and latest review. Source changes make an
unchanged approved translation outdated; target edits or a later rejection make it
unreviewed. Future or unknown review records are errors.

`localStatus` categories are mutually exclusive. `visible`, `fallback` and
`indexable` are separate projections and must not be added to obtain a total.
Collection and topic eligibility includes their visible members. Source and policy
fingerprints identify the actual working tree, including uncommitted text.

Scope v1 remains readable. Explicit `locale:scope --apply` writes v2 without creating
approvals. A removal needs a reason and fingerprinted evidence: either a matching
archived source file with all versions archived, or a repository-local deletion
manifest under `production/localization/`. A deletion manifest has
`{schemaVersion: 1, removals: [{key, reason}]}`. Drafting, hiding or deleting a target
without evidence cannot shrink coverage.

## Prepare, review and promote

```sh
npm run locale:import -- --locale de --file translations.json
npm run locale:import -- --locale de --file translations.json --apply
npm run locale:promote -- --locale de --batch BATCH_ID --reviews reviewed-records.json
npm run locale:promote -- --locale de --batch BATCH_ID --reviews reviewed-records.json --apply
```

Batch schema v1 accepts any registered language. Page operations address `[$page]`;
shared text operations use the exact paths and hashes in the report. Numeric array
paths also require `expectedIdentity` from the field report, binding the operation
to its stable owner. Targets must include an explicit `expectedTargetHash`, including
`null` for missing text. Translation imports cannot edit the source language itself,
Prompt bodies, model facts, identifiers, parameter values or arbitrary file paths.
UI dictionaries are maintained as complete JSON namespaces outside this importer.

Apply records a SHA-256 batch ID and manifest for both newly written drafts and
pending updates. A batch touching published translations or their shared dependencies
is entirely pending. Inspect the manifest and candidate files under
`.artifacts/localization/{code}/pending/{batchId}`. Changed candidates require a new
plan and review; retries never replace a reviewer's edits.

Review records retain schema v1 and actual reviewer, completion time, conclusion,
source hash and target hash. Identify AI reviews as AI. Translation generation is
not approval; image descriptions require inspecting the assets, and interaction
claims require testing the actual controls. An unchanged brand or model name needs
an exact-field reason when it is part of reviewable prose.

Promotion merges only the batch's fields, metadata and matching approvals. It checks
source/target identity and lifecycle inside the content lock, validates affected
published consumers and every enabled locale, then applies one rollback-capable
transaction. Disabled complete languages can promote reviewed batches before the
whole language is ready. Promotion never enables a language or deploys a site.
Legacy candidates without manifests are rejected by default. Re-run the original
import with `--migrate --apply` to rebuild its manifest against the current source
and target. Migration requires every existing candidate file to match that fresh
plan; edited or ambiguous candidates remain conflicts. Already written drafts can
be re-imported with their original batch to record a promotion manifest.

## Browsing and external outputs

Route `locale`, explanatory `contentLocale` and actual `promptLanguage` are separate.
Library descriptions may fall back to an eligible published version, preferring the
default language, then the source, then registry order. About and License have no
fallback. Archived versions retain removal behavior. Preview may show target drafts,
but never publishes indexable outputs.

Fallback and outdated routes remain browsable with self canonicals and
`noindex, follow` in production. They have no hreflang, structured data, Markdown twin
or sitemap entry. Browsing language links remain independent of SEO alternates.
Aggregate pages use their actual displayed items, including first-page showcase
content; browsing order and pagination do not change for SEO. Search indexes include
browsable content and retain its actual language. External exports use indexability.

## Build and content maintenance

Both production and preview builds enforce enabled complete-language release gates.
Structural and dictionary validation runs before replacing generated outputs. CI
retains all-language diagnostics and per-language reports even on failure. Manual
deployment uses the same build. Full regeneration updates build IDs and search
schema/analyzer versions; HTML and generated data must be deployed together.

Content production may prepare source-language candidates while translations are
outstanding. Application still enforces all enabled release policies and rolls back
on failure. New public content expands complete-language coverage: prepare its
translations and actual reviews before making a publishable commit.

German is enabled in the current registry. Its historical preparation and review
evidence remains under `production/localization/de/`; use a fresh strict report for
current coverage and separate production acceptance evidence for deployment status.
Spanish follows `docs/spanish-localization-spec.md`; its preparation state and
remaining gates are recorded under `production/localization/es/`.

### Search acceptance with localized prose

Prompt and template search documents include visible explanatory body text alongside
the unchanged model Prompt at the secondary body weight. Link URLs and image storage
paths are excluded. Maintained German compounds and domain aliases expand retrieval;
product-photography terms may emit the broader Fotografie alias, while generic
Fotografie does not imply a product image. Original-word matches retain higher weight.

Frozen acceptance cases use `topK` per displayed content-kind group, matching the
existing five-result quick-search groups and independently paginated search page.
Keep every frozen query and expected key. Validate both serialized-engine results
and the actual browser Worker. Record index-size changes for every affected locale;
these indexes must remain loaded on demand.
