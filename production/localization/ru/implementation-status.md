# Russian implementation status

> Integration update (2026-11-17): the corrected combined candidate is enabled and independently AI-reviewed. See [integration acceptance](../review-2026-11-17/acceptance.json) for current results. The original candidate results below are historical; human acceptance and deployment remain pending.

Worktree: `russian-localization/prompt-seen`. Branch: `codex/russian-localization`.
Original engineering baseline: `53cbc8efce854f8f067acef8372daf49be82f9c3`.
The source checkout's unrelated uncommitted edits were not copied or modified.

## Full content milestone

**381/381 content units and 2,220/2,220 fields are current.** The candidate report
has 381 indexable units, zero fallback, missing, draft, outdated, unreviewed or
invalid units, and `ready: true`. `locale:check --locale ru --strict` passes.

The completed scope is 285 Prompt descriptions, 75 templates, 16 collections,
three topics, About and License; 1,793 shared fields and all 427 UI messages.
Original Prompt bodies, template values/constraints, media, generation records,
model facts, source links and licensing remain unchanged.

Configuration remains `coverage: complete`, `review: fingerprint`,
`promptBodies: source-only`, `preview: true`, `enabled: false`. This work completes
content preparation and review, not production enablement or deployment.

## Independent review

All 1,666 deduplicated content text units and 427 UI strings were independently
source-compared by subagents. Authors did not approve their own translation
partitions. The review records contain exact source/target hashes and corrections:

- `subagent-existing-review.json`: 249 existing R0/R1 text units, including a
  separately approved correction for the broad Editorial category.
- `subagent-full-a-review.json`: 182 units reviewed by `ru_batch_d`.
- `subagent-full-b-review.json`: 521 units reviewed by `ru_batch_c`.
- `subagent-full-c-review.json`: 441 units reviewed by `ru_batch_a`.
- `subagent-full-d-review.json`: 273 units reviewed by `ru_batch_a`.
- `subagent-ui-review.json`: 427 UI messages and 33 ICU plural nodes reviewed by
  `ru_batch_d`, including the `maxLength` grammar correction.
- `subagent-integration-review.json`: independent completeness, field identity,
  array order, MDX structure and protected-data-boundary audit by `ru_batch_c`.

A context-specific field override distinguishes a brand name (`Название`) from a
person's name (`Имя`). The assembler checks its exact source and target repository
fingerprints. All 4,769 unit bindings are recorded in `full-review-bindings.json`;
only exact approved targets entered the generic import/promote batch.

These are explicitly AI reviews, not native-speaker or human certification.

## Media and source preservation

All 363 original media SHA-256 values match the existing visual-review evidence
and actual files. Its original limitations are preserved. The primary agent also
viewed all frames of all 26 composed nine-frame GIFs in nine contact sheets and
checked dimensions, delays, distinct-frame counts and loop metadata. These checks
are recorded in `full-media-review.json`; they do not claim live playback or new
provider/provenance certification. A subagent additionally viewed the actual
caption images for units 162 and 166 to resolve source wording ambiguities.

`full-source-invariants.json` confirms that all 843 modified content YAML files
preserve every non-ru value relative to the original engineering baseline. No
original Prompt/body files changed. The source MDX-to-corpus extraction preserves
all 381 source documents' AST/text; the translated pages retain all links and
format structure.

## Verification and release boundary

- Russian strict completeness passes; all seven existing enabled languages remain
  ready. Arabic remains unfinished and preview-only; no all-language strict
  bypass was used.
- Content validation: zero errors and publish errors, with the same ten existing
  zh-Hans warnings and one unused-media maintenance notice.
- TypeScript, ESLint, preview build and all 651 unit tests (67 files) pass.
  The serial unit run passed with unchanged timeouts after concurrent runs hit
  timeouts under machine contention. Actual commands and log hashes are in
  `evidence/full-verification.json`.
- Final acceptance: 45 distinct passing checks across HTTP and Chromium, Firefox,
  WebKit; one fallback-only check intentionally skips because there is no fallback.
  The full HTTP test passed after correcting its frozen-scope comparison.
- Full HTTP acceptance visits every Russian page and compares the entry set with
  the frozen 381-item scope (also checking English contains those entries), checks
  Russian HTML/title/noindex behavior, and verifies all 285 actual HTML and popup
  Prompt texts/languages against original literal files or raw template rendering.
- Browser checks cover the actual Worker, 24 frozen pilot queries against the
  complete corpus, keyboard behavior, four widths and two themes, accessible
  templates, Cyrillic input, downloads and Chromium clipboard readback.

The earlier foundation/pilot results are retained in `evidence/verification.json`.
The full production build matrix, broader ranking/performance release acceptance,
production enablement, merge and deployment are separate outstanding release
steps from the specification. No production deployment has been performed.

The build emitted a known Next.js security vulnerability warning. A dependency
upgrade remains separate outstanding work; no dependency version was changed.
