# Korean implementation acceptance

Implementation branch: `codex/korean-localization`. Base revision: `0306b74b66ab9bf1f76eb5061bc466c3ebf86325`. [Specification](../../../docs/korean-localization-spec.md). Preparation uses `enabled: false`, `preview: true`, `complete / fingerprint / source-only`. Production activation and deployment remain pending.

## Content and review

The current candidate-production report is ready with no blocking findings: 381/381 pages current and indexable, 2220/2220 fields current (including 427 UI messages). Missing, draft, outdated, unreviewed and invalid counts are zero. Report source revision: `0306b74b66ab9bf1f76eb5061bc466c3ebf86325:abb7cd9cf3c3477b4878e17949cc156a554c49f177d8ae3d2539a6cec834ecb2`. Scope fingerprint: `sha256:0ce525489ba86cb2133fa38ba66e91d7f0360526844c1a62a67841f08c87fa9f`.

All 1,663 distinct content strings were translated and source-compared. Translation and review were separate steps; named AI reviewers and resolved corrections are recorded in [evidence](evidence/full-review-manifest.json). All 363 asset alts were checked against actual images; the per-asset animation inspection limits are recorded. No native-speaker review is claimed. Original quoted Japanese messages, depicted text and fictional proper names retain their original spelling with field/page reasons.

Pilot import/review/promote batch: `951092e20530119c28bd36fa64321e993082c63a0af478de13988ee0ad9119bc` (7 pages and dependencies). Full candidate batch: `ed3ecbf3852edfeb4685fb15e41b2c06179937436bea700c02ad55bc2a60428d` (2,084 operations). After separately reviewing the translation batches, their union was promoted in one dependency-complete transaction because the revised pilot alt is also shared by already-published content. No publication state was edited by hand.

The [source-invariant audit](evidence/source-invariants.json) verifies that 843 changed YAML files differ only in Korean fields; original Prompt/template bodies, constraints, other locale files and media bytes are unchanged. For a_269 only, the Korean alt uses neutral “interior space”: actual media is a study although the source reused “living room”. This correction is explicit in the image review.

## Verification status

| Requirement | Status | Evidence / remaining work |
| --- | --- | --- |
| KO-01 registration and routes | artifact checks passed | Preview `/prompt-seen` and isolated production root/subpath artifacts include the correct Korean registration; production branch activation remains pending |
| KO-02 complete coverage | passed | `full-report.json`: ready=true, blocking=false, zero gaps |
| KO-03 messages and formatting | passed for Korean | 427 current UI approvals; ICU validation; all Korean browser cases have no hydration errors |
| KO-04 original bodies and facts | passed | `evidence/source-invariants.json`; template preview/download/copy checks |
| KO-05 import/review/promote | passed | Both real batches used existing CLI dry-run/apply gates; no conflicts |
| KO-06 frozen search corpus | passed | Full-corpus serialized engine 20/20, including 18 frozen cases and NFC/NFD order; actual Worker cases passed in Chromium, Firefox and WebKit |
| KO-07 Hangul highlighting | passed | `search-red.log`, `search-green.log`, `aliases-green.log` |
| KO-08 IME | synthetic passed; real device pending | Three-browser composition transactions/cancellation; Safari-style compositionend → real Enter/keyCode229 regression reproduced red in all three browsers, then passed 3/3 after the submit guard fix; ordinary next Enter remains functional |
| KO-09 layout and interaction | Korean-specific checks passed; full-suite exceptions below; manual pending | Completed Korean browser suite: 93 passed; additional interactions: 36 passed. Four widths × two themes, axe, templates, copy/download, favorites, history and lazy font/index loading; native zoom and screen reader pending |
| KO-10 SEO and export | artifact checks passed | Korean raw HTML, canonical, hreflang, sitemap, exports, noindex/fallback and unknown-route checks passed in preview and both isolated production candidates |
| KO-11 versions/performance | measured; existing JS budget debt | Analyzer 4/schema 2; Korean 379 search documents, 1,893,296 raw bytes / 310,404 gzip(level 9). Existing en/zh-Hans/ja/de indexes grow 1.27–1.77% from cross-locale taxonomy aliases; unchanged documents with the new analyzer produce identical semantic indexes/results. See [comparison](evidence/index-comparison.json) |
| KO-12 deployment/rollback | pending | No deployment performed; production language remains disabled |

## Executed environment and evidence

macOS local worktree; Node 24.19.0; repository-pinned Playwright Chromium, Firefox and WebKit; reference Docker/nginx. Pilot artifact build ID `0306b74b66ab`, preview, base path `/prompt-seen`. Execution by AI Codex root and named child agents on 2026-11-11. Local raw logs and screenshots are under `.artifacts/localization/ko/`; exact source/target fingerprints and image hashes are committed under `evidence/` and `reviews.json`.

The first large browser run was interrupted by ENOSPC. The subsequent local Docker interruption was recovered. Repeat runs use two workers and `--trace=off`; failures and unexecuted cases are not counted as passes. A full-corpus hook timed out under high host load; separate timing measured loadContent ≈11.5s and Korean createIndex ≈1.75s, so the frozen expected ranking and hook timeout were not relaxed.

## Completed automated checks

[Static-check evidence](evidence/static-checks.json): content validation, typecheck, lint, Prettier, token checks and Storybook build passed. Full Vitest run: **58 files / 533 tests passed**. After the final IME change, typecheck and 11 focused search UI tests passed; the full unit suite was not rerun unnecessarily. Final screenshot-assertion changes also passed typecheck, targeted ESLint and evidence formatting.

Full preview artifact `ko-preview-20261111`, base path `/prompt-seen`: **1,683 passed / 57 skipped / 10 failed** out of 1,750 E2E cases. Korean-specific suites passed: browser 93, interactions 36, HTTP 5; the HTTP fallback fixture skipped once because the complete Korean corpus has no fallback page. The 10 failures are eight Spanish WebKit hydration cases and two English popup-history cases (Chromium/WebKit). Focused retries reproduce the Spanish mismatch and Chromium popup timeout; WebKit popup passed on retry. An independently built original baseline reproduced both classes: Spanish `Intl.DisplayNames` gives Node “inglés” versus WebKit “Inglés”; the popup close timed out in WebKit and in 2/5 Chromium repetitions. See [baseline diagnosis](evidence/preview-baseline-diagnosis.json). These failures remain open and are not counted as accepted.

Rebuilt preview `ko-preview-20261111-ime` includes the final IME fix. Its three-browser 229 Enter regression passed 3/3. The broader Korean + search regression passed 193 with two expected Chromium-only CDP skips on Firefox/WebKit (195 total). Original two-axis review findings are retained with resolution notes in [Standards](evidence/ko-standards-review.md) and [Spec](evidence/ko-spec-review.md).

## Isolated production candidate

A detached checkout at `/private/tmp/ko-production-candidate` contains the same implementation and content snapshot, with only Korean `enabled` changed to true. This is a local working snapshot based on `0306b74b66ab9bf1f76eb5061bc466c3ebf86325`, not an activated branch or deployed release. Both build and test outputs remain isolated from the preview worktree.

Root production artifact `ko-candidate-root-20261111`: build passed, 5 locales including Korean. Full Chromium/Firefox/WebKit and HTTP run: **1,464 passed / 97 skipped / 4 failed** (1,565 cases, 27.5 minutes). Korean-specific cases passed. Failures were Firefox modified-click new-tab timeout, WebKit loading-indicator timing, WebKit “Clear filters” position, and WebKit foreign-history popup close. All original failures remain recorded; focused retries do not erase them. Baseline diagnoses are retained in [additional root evidence](evidence/production-root-additional-diagnosis.json) and the preview baseline report. All four failure classes were reproduced on the original baseline. This does not mark the full run green or fix those existing defects.

Subpath production artifact `ko-candidate-subpath-20261111`, base `/prompt-seen`: build passed, 5 locales including Korean. Full three-browser and HTTP run: **1,465 passed / 97 skipped / 3 failed** (1,565 cases, 26.3 minutes). Korean-specific suites passed. The failures were the known Firefox modified-click timeout and two Firefox generic page-axe checks (`ja`/`ko`, light) that timed out in `page.evaluate` at 30 seconds before an accessibility violation assertion. The latter are recorded as timeouts, not assumed baseline defects; both unchanged checks passed in a single-worker rerun (2/2, 26.2 seconds), without changing thresholds. The original full-run timeouts remain recorded.

The final test-only improvement waits for actual Korean search results before the layout assertion and screenshot, and names screenshots by browser. The application was not rebuilt for this assertion change. On the rebuilt preview the strengthened layout suite passed **24/24**; [screenshot evidence](evidence/layout-screenshots.json) records hashes and the two visual samples actually inspected. Both full production runs used the earlier test snapshot; the strengthened production-subpath run also passed **24/24** (53.3 seconds). [Production artifact evidence](evidence/production-artifacts.json) records both full runs, focused retries, build metadata and exact source-snapshot hashes.

## Performance and unchanged-language comparison

[Browser measurements and method](evidence/browser-performance.md) record one cold visit per route/profile plus 12 warm queries. Desktop cold search took 231.5 ms; phone Slow 4G with 4× CPU slowdown took 2730.3 ms. Warm Worker medians were 0.7 / 9.5 ms. Ordinary home/list/detail pages requested no search index; the entire search sequence requested the Korean index only once. Sampled images were within the approximately 600 KiB first-screen budget.

Initial necessary JavaScript was 229.6–241.2 KiB, above the approximately 200 KiB guideline. Independent baseline comparison attributes this to existing shared application payload: this change adds only 134–160 bytes, and Korean differs from current English by 0–24 bytes. The existing budget shortfall remains open. These lab results do not verify real-user p75 LCP/INP/CLS after launch.

## Required manual release checks

- Real Korean two-set input on desktop and mobile: candidate confirmation, first/second Enter, backspace, cancellation and consecutive input; record OS, browser and IME.
- Native 200% zoom and screen-reader walkthrough; viewport-based reflow and automated axe do not replace these checks.
- Deploy only after all release conditions pass, retain prior artifact/build ID, run live checks on the canonical host, and record Naver submission status separately.

These pending checks are release conditions. Full content readiness and synthetic browser passes do not constitute a deployed or fully accepted Korean launch.
