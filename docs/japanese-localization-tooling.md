# Japanese localization tooling

This implements the preparation workflow in [the launch specification](japanese-localization-spec.md). A passing engineering check does not mean the Japanese launch is approved. Keep `ja.enabled: false` until the content, review, browser, production artifact and live checks pass.

## Coverage

```sh
npm run locale:check -- --locale ja
npm run locale:check -- --locale ja --strict
npm run --silent locale:check -- --locale ja --strict --json > .artifacts/localization/ja/report.json
```

Use npm's `--silent` when piping JSON: npm itself otherwise prints its command banner before the script's JSON. The script writes diagnostics to stderr. Exit codes are 0 for a completed ordinary report (which can have `ready: false`), 1 for content errors or a failed strict check, and 2 for invalid command arguments.

Every call loads fresh production content. Public pages in enabled locales other than Japanese form the target union. The normal production index is also computed with Japanese enabled in memory. No locale configuration or generated website is written. Outdated pages and missing fingerprint-bound reviews are gaps even if the existing publishing rules would otherwise show them.

`items` contains page keys such as `prompt/p_111`, the actual source locale, source and target files, the existing `sourceHashOf` hash, a complete prose fingerprint (including independent SEO text and collection reasons), page/review status and dependency gaps. `fields` contains deduplicated message and shared YAML fields, their source file/path and target file/path, values and fingerprints. Shared field sources prefer the default locale when it explicitly exists; otherwise they use an explicit locale key in sorted order. They are not inferred separately for each referring page.

`scope.json` records the initial target. Reports compare current targets with that snapshot. A removed target requires documented formal archival; disabling a source locale or hiding a page does not silently waive it. Reviews must match the current source and target fingerprints. YAML mapping order and nontranslated metadata do not change field fingerprints.

When Japanese is enabled, both `content:validate` and `content:build` run the strict gate. The deployment workflow, including manual dispatch, runs `npm run build`, so it shares the gate. Messages are validated before generated directories are replaced in all builds. CI retains the preparation report as an artifact.

## Import batches

```sh
npm run locale:import -- --locale ja --file translations.json
npm run locale:import -- --locale ja --file translations.json --apply
```

A batch has `schemaVersion: 1`, `locale: "ja"` and an `operations` array. Every operation has:

- `key`: an exact page key or dependency key from the current report.
- `sourceField` and `targetField`: arrays copied from a field report; use `["$page"]` for a complete page translation.
- `expectedSourceHash`: the field's `sourceHash`, or the page's **`sourceFingerprint`** (not the shorter MDX source hash).
- `expectedTargetHash`: the current `targetHash`, explicitly `null` when absent.
- `translation`: a string, an alias string array, or a page object with `title`, `description`, `body` and optional `seoTitle`, `seoDescription`, `reasons`.

No operation accepts a caller-selected filesystem path. Keys resolve against the current public target and its dependencies. Only Japanese explanatory YAML keys and `locales/ja.mdx` are writable. Message JSON is maintained directly in the existing dictionary files. Status, source metadata, prompt bodies, template values, model facts and locale enablement are not batch fields.

Dry-run does not acquire a lock or create artifacts. Apply acquires the existing content writer lock, re-reads fingerprints, merges only selected YAML fields, validates a complete staged content tree, then applies with the existing journaled transaction and rollback. Duplicate operations and stale fingerprints are conflicts; an already-identical result is a no-op after verifying the source fingerprint.

New or changed unpublished pages are `draft / machine-draft`. If a batch changes an already-published Japanese page or one of its dependencies, the entire candidate stays under `.artifacts/localization/ja/pending/<batch-fingerprint>/`. Published files remain intact. Inspect the candidate, perform the language review, and promote it as an explicit reviewed content change. The importer cannot promote a batch by accepting a status field.

## Review records

`reviews.json` contains `schemaVersion`, `locale` and `records`. Each record names one exact page/field `key`, `sourceHash`, `targetHash`, `reviewer`, actual ISO `completedAt`, and `conclusion` (`approved` or `changes-requested`). A page record uses its complete `sourceFingerprint`. A field record uses its `sourceHash`. The latest record for a key controls approval; a changed fingerprint invalidates it. `reason` may document a precise exception. No broad directory-level waiver is supported.

Translation generation alone is not approval. Record only reviews actually performed, and identify AI review as AI review. Browser/IME, image description, source and licensing checks still need the corresponding evidence before release.
