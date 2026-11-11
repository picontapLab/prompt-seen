# Portuguese localization acceptance

Status: implementation in progress. No production release has been approved or deployed by this work.

The isolated worktree starts at `0306b74b66ab9bf1f76eb5061bc466c3ebf86325`; unrelated main-worktree edits are excluded. The baseline has 381 content targets and 2,220 fields (427 UI messages and 1,793 shared prose fields). Policy is complete/fingerprint/source-only; production and preview are disabled until their respective gates pass.

## Frozen pilot and search scope

The 32 source-grounded search cases were frozen before corpus search tuning. They include accented, plain and NFD input, mixed English/Portuguese terms, singular/plural forms, semantic exclusions, stable ID and a genuinely empty result assertion. Search uses top five within each displayed kind.

Pilot Prompt keys: p_001, p_004, p_012, p_022, p_067, p_101, p_102, p_107, p_108, p_110, p_111, p_115, p_122, p_134, p_140, p_151, p_152, p_154, p_200, p_209, p_221, p_227, p_273, p_315. Templates: t_001, t_002, t_003, t_004. Collections: c_001, c_002. Topic: style/ink. Aggregate members expand the pilot's dependency closure; scope.json retains the full corpus.

The pilot spans English/Chinese source descriptions, literal and template-derived prompts, editable fields, multiple references, annotations, GIF, older runs, source-evidence limitations, and long prose. Full content coverage remains the release requirement.

## Executed checks

Search TDD: the first serialized-engine test failed because cartaz could not find pôster. A second failure exposed model/template confusion through synthetic kind tokens; Portuguese multiword aliases now require an actual source-text phrase. All 23 engine tests pass after the change.

UI TDD: the Portuguese count test first failed with a missing catalog. The complete 14-namespace, 427-message draft then passed all nine catalog tests, including literal expected Portuguese output for zero, one and two and cross-formatter equivalence. Text and visual review are separate pending gates.

Candidate builds, browser checks, media review, exact-hash approvals and deployment results will be appended only after they are actually performed.

## Full content gate and production baseline

All 381 pages and 2,220 fields reached current review status; locale:check strict passed with ready=true. All 32 frozen actual-corpus search cases passed after collection publication. The interim corpus test had 29 passes and three missing collection cases while collections were not yet imported; no expectations changed. An earlier missing builtLocales test setup was corrected before actual-corpus verification.

The complete import/promotion history is retained in batch-results.jsonl. Each batch ran dry import, applied import, dry promotion and applied promotion through the repository APIs with exact reviews and all enabled-language gates. Three inherited incorrect media source descriptions were repaired with explicit EN/ZH/JA changes and actual Japanese/German visual re-review; see source-media-corrections.md. The independent preservation-audit.md verifies all 601 original prompt/template bodies and 2,377 media files byte-for-byte, and generation values structurally.

The disabled production baseline passed packaging with four locales in 61.65 seconds. The Portuguese disabled-state HTTP check passed (one test). Artifact sizes are in artifact-disabled.json. Actual first-load/no-prefetch measurements: root 193.9/263.2 KiB gzip; English search 187.3/251.2 KiB gzip. Runtime is Node 24.19.0 and installed Playwright 1.64.1, the validated Firefox-compatible runtime; Chromium 156, Firefox 157, WebKit 27.2.

The first disabled build failed with local ENOSPC. Inactive, regenerable .next/out intermediates in three older /private/tmp build copies were removed after checking no using processes; source, final dist and evidence were retained. The successful retry used the ordinary build command. Failed logs remain under .artifacts/localization/pt-BR/.

Content validation has zero errors and zero publish errors (ten existing translation warnings). Lint and formatting passed. The full unit run had 482 passes and timeout failures in five corpus/generation test files under concurrent load; these are being rerun serially before acceptance.

The isolated codex/portuguese-localization branch is now a production candidate with enabled=true and preview=true. It has not been merged or deployed. Candidate root/subpath/preview builds, browser checks, native zoom and final code review remain in progress.
