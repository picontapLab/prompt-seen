# Russian implementation status

Worktree: `russian-localization/prompt-seen`. Branch: `codex/russian-localization`.
Base: `53cbc8efce854f8f067acef8372daf49be82f9c3`. The source checkout's unrelated
uncommitted edits were not copied or modified. Scope is recomputed from this worktree.

## Implemented — preview only

- Complete/fingerprint/source-only policy; `preview: true`, `enabled: false`.
- All 427 UI messages in 14 namespaces, Russian cardinal forms and formatting tests.
- Russian ё/е compatibility with distinct й/и, original UTF-16 highlighting,
  finite domain/inflection aliases, analyzer version 7 and keyboard chord support.
- Russian Storybook catalogs, samples and toolbar entry.
- R0 About, License and all 34 taxonomy fields passed source-comparison review;
  import and promote use the existing transactional CLI. UI review is recorded
  as AI review, not native-speaker certification.
- R1: eight Prompt pages (`p_005`, `p_012`, `p_111`, `p_115`, `p_151`,
  `p_217`, `p_224`, `p_290`), three templates (`t_001`, `t_002`, `t_017`),
  two collections (`c_001`, `c_002`) and all three topic pages, with their
  required shared fields. Imported and promoted through the generic CLI.
- Exact original-file SHA-256 matches reuse existing visual observations for
  23 assets. All nine Fuji GIF frames were additionally inspected; metadata
  confirms 360×480, 2 seconds and infinite looping. Historical source review
  claims remain attributed source statements, not new provenance certification.
- 24 frozen pilot search queries, actual Worker tests, original Chinese Prompt
  preservation and Cyrillic template input/copy/download checks.

## Current readiness

The post-pilot report has **18/381 current content units** and **574/2,220
current fields** (427 UI messages and 147 shared fields). There are **363
missing content units** and **1,646 remaining fields**. Russian strict readiness
fails as expected; this is not a complete production candidate. Candidate
indexability is only 13 units: translated collection/topic text does not make
its untranslated linked contents indexable. Preview remains noindex throughout.

Existing enabled languages en, zh-Hans, es, pt-BR, ja, ko and de remain ready.
Arabic remains unfinished and preview-only; no all-language strict bypass was used.

## Verification

- Full unit suite: 67 files, 651 tests passed. TypeScript and ESLint passed.
- Disabled production build at `/`: Russian routes/search/sitemap entries absent;
  HTTP and Chromium/Firefox/WebKit keyboard/Worker checks passed (7 tests,
  28 Russian-page checks intentionally skipped because ru was disabled).
- Foundation preview at `/prompt-seen`: 35 HTTP/browser tests passed.
- Pilot preview at `/prompt-seen`: see `evidence/verification.json` for final
  test results and evidence hashes. Clipboard verification uses Chromium;
  Firefox/WebKit verify the edited preview and downloaded bytes.
- Source invariant audit: all 46 modified content YAML files preserve every
  non-ru value when parsed, including Prompt data, template values, source and
  model facts, run metadata, media hashes and licensing.
- The narrow-screen template test expands the bottom sheet before inspecting
  its below-fold controls. A Firefox measurement found the collapsed sample
  button at y=1509–1553 outside the 900px viewport; after expansion and scrolling
  it is fully visible at y=604–648. This corrects a test-state mismatch, not CSS.

Next.js reported an existing security-version warning and stopped initial preview
build attempts. Retrying the same build succeeded. Dependencies were not upgraded
as part of localization; the security upgrade remains separate work.

## In progress

- Complete the remaining 363 content units and 1,646 fields with source comparison
  and asset evidence, using the scope and batch plan. Preserve all original bodies.
- Extend search acceptance from the reviewed pilot to the complete corpus, including
  ranking/negative cases and performance thresholds in the specification.
- Complete full browsing, popup, favorites, reference-input, font and performance
  acceptance; pilot checks are not a substitute for RU01–RU12 release coverage.
- Reach strict ready before enabling ru in an isolated production candidate; then
  run the full root-production, subpath-production and subpath-preview matrix.
  No production enablement, merge or deployment has been performed.

Initial local machine-translation samples were rejected for mistranslating technical
image descriptions (for example “cartoon treatment” and scale cues). Those drafts
are not approved content. Exact reviewed inputs, fingerprints and test results are
recorded under `batches/` and `evidence/` as work proceeds.
