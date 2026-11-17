# Arabic implementation status

Branch: `codex/arabic-localization`. Baseline: `53cbc8efce854f8f067acef8372daf49be82f9c3`. This is an isolated implementation worktree; unrelated changes in the original checkout were not copied.

## Content

All 381 target units (285 prompts, 75 templates, 16 collections, 3 topics, 2 standalone pages) and all 2220 fields (427 UI messages plus 1793 shared fields) are current. Strict locale analysis reports ready=true, blocking=false, and zero missing/draft/outdated/unreviewed/fallback. Every enabled locale remains ready. Exact reports are archived under evidence/.

The 2601 source/target approval records identify the actual AI reviewers. Three subagents translated and reviewed their assigned sources and viewed associated local media; a separate cross-batch review identified and closed two material translation errors before final import. No human identity, native-speaker approval or screen-reader session was fabricated. See the individual review and media evidence files.

The final content batch is `fb0d9ccf29f62abe75089199bae5e1ca1b8235ec9f85b2a2c3ba6ce43270fdd9`, input `final-content.json`, approvals `candidate-reviews.json`. Promotion was first rejected by automatic review; after source inspection and a successful dry-run proved that the operation only changes local content/reviews and retains disabled ar, the same operation was approved. Promotion does not enable or deploy a language.

## Engineering

Implemented Arabic digit normalization and controlled domain forms, contiguous phrase boundaries, analyzer version 7, Gregorian/Latin-digit formatting, physical Ctrl/Meta+KeyK support, automatic mixed-text input, DOM isolation for query/token/template variables and technical metadata, delivered Arabic display weight 600 and script-aware typography. UI fixes retain ICU argument contracts and remove the hidden download-label LRM.

Frozen full-corpus search: 30 scenarios plus model-number script equivalence. Serialized-engine and isolation regressions pass (71 tests). Preview HTTP/Worker/input/layout acceptance passed 137 tests across Chromium, Firefox and WebKit; additional 320px/language-switch/popup checks passed 12, recovery checks passed 6. These initial runs preceded final content promotion. Final committed-content verification passed 248 root candidate checks, 247 subpath candidate checks plus one German sitemap ECONNRESET check that passed isolated rerun, and 216 final preview checks. Production-disabled root/subpath runs each passed 86 HTTP checks with 4 expected Arabic-content skips. See production-acceptance.json and evidence/final for the complete matrix.

Typecheck, lint, formatting and token checks passed. Content validation has zero errors/publish errors; pre-existing Chinese source-hash warnings remain. The first full unit run exposed a CLI fixture collision with the new ar review ledger and two full-corpus setup timeouts under default local parallelism; the CLI now has its own fixture root, catalogs and review scope. All 68 files / 661 tests pass with `npm test -- --maxWorkers=2`; the original timeouts and behavioral assertions are unchanged.

## Release status

`enabled: false`, `preview: true`, complete/fingerprint/source-only. All translation candidates are prepared and reviewed locally; this is not a production launch. Native 200% browser zoom, actual Arabic screen-reader acceptance, first-release human linguistic signoff, deployment and live build-ID/rollback verification remain outside the completed AI/editorial checks. No production deployment was requested or performed. See production-acceptance.json for executed versus pending checks.

Independent Standards and Spec reviewers each found one P2 test robustness issue; both fixes were committed and rechecked, with zero remaining findings. See code-review.md.
