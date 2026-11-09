# Japanese release acceptance

Status: release preparation; Japanese is not enabled in the working repository yet. This record distinguishes text review, generated-artifact checks, user-reported manual acceptance, and deployment.

## Scope and immutable content

- Dynamic strict report: 329 published and approved units (243 prompts, 68 templates, 13 collections, 2 pages, 3 topics), 1,890 required fields including 426 UI messages. No missing/outdated/unreviewed findings.
- 2,421 existing content files checked against the pre-import snapshot. Only the documented contract migration explanation in `content/README.md` changes outside allowed Japanese text fields.
- 73 template versions, 75 existing prompt-language combinations, 100 samples render identically before/after translation. No Japanese prompt variant was added.
- 65 one-time compatibility baselines were generated from unchanged templates after checking all 75 recorded legacy contract hashes. Existing run hashes were not rewritten. Localized notes are the only permitted run-record changes.
- Review records describe actual AI text review. They do not claim a new visual review of generation outputs. Exact retained terms and the two source ambiguities are in `review-notes.json`.

## Validation

Evidence is under `.artifacts/localization/ja/` (ignored, suitable for CI artifact retention).

| Check | Current evidence |
| --- | --- |
| Strict coverage | `full-report.json`, ready true |
| Content schema/publication | `content-validate.log`, 0 errors and 0 publish errors; existing non-Japanese warnings retained |
| Type/lint/format | `typecheck.log`, `lint.log`, `format-check.log` |
| Token contrast | `tokens.log`, all required and supplementary pairs pass |
| Unit tests in working tree | `unit-tests.log`, 411 passed |
| Storybook | `storybook.log`, build passed |
| Root production candidate | `production-build.log`, Japanese enabled in isolated candidate |
| Subpath preview candidate | `subpath-build.log`, `/prompt-seen` |
| Full browser runs | `production-e2e.log`, `subpath-e2e.log`; failures and targeted reruns must be reconciled before release |
| Original text/semantics | `protected-content-result.json`, `rendering-result.json` |
| Real IME | `manual-acceptance.json`: user reports actual passing macOS/iOS Safari checks; device models and IME names were not supplied |

The first complete browser runs exposed an overbroad recent-search locator (the new first title starts with `A`), and the added phone checks exposed a false overlap in the test helper's bounding rectangle for wrapped inline links. Both assertions now measure the intended behavior exactly. The Firefox new-tab test now selects the opened background tab before asserting its document; the focused-tab case passes in all three browsers. Previously timed-out accessibility cases pass with one worker. All 51 selected subpath follow-up checks and all six corrected root phone-layout checks pass. Clean committed-source unit tests required a 30-second allowance for real-corpus migration fixtures; all eight fixture tests passed, and that suite now declares the allowance explicitly.

## Performance and release

The before build is `ja-before-full-content` (root preview). `baseline-first-load.md`, `baseline-lab.md`, and `baseline-assets.json` retain its measurements. The complete root production candidate is `ja-production-candidate`. Its ordinary first-load script totals remain approximately 193/202/187 KiB for home/list/search. Display-font subsets grow from 73,128 to 148,532 bytes as the full corpus replaces the small preview; these remain generated subsets. Search index growth reflects the complete public corpus and stays outside ordinary-page initial loads. Lab results are not real-user p75 measurements.

Previous live build: `2fb7029f63aa643af3a7a21673febda03cac390c`. Successful GitHub production deployment: `7617872887`, workflow run `42348927089`; platform URL `https://34c4851d.prompt-seen-dkj.pages.dev`. Keep this baseline until the new release's live checks succeed. Use the existing Rollback workflow with the recorded previous commit if rollback is required.

After release, the repository maintainer owns deployment checks and day 1/7/28 follow-up; text changes require fresh fingerprint-bound review. Normal builds already enforce the strict Japanese gate whenever Japanese is enabled. Search impressions/rankings and real-user p75 are follow-up observations, not claims established by this local acceptance.


### Same-condition performance comparison

Root preview, Chrome, cold cache, gzip, no prefetch; `ja-before-full-content` versus `ja-after-full-content`:

| Page | HTML JS before → after | Idle JS before → after | Slow 4G phone LCP before → after | Phone CLS before → after |
| --- | --- | --- | --- | --- |
| `/ja/` | 193.5 → 193.5 KiB | 262.4 → 262.4 KiB | 1.18 → 1.73 s | 0 → 0 |
| `/ja/prompts/` | 201.8 → 201.8 KiB | 269.3 → 269.3 KiB | 1.13 → 1.20 s | 0 → 0 |
| `/ja/search/` | 186.8 → 186.8 KiB | 250.3 → 250.3 KiB | 0.94 → 0.92 s | 0.112 → 0 |

The list retains its existing small first-load budget exception; localization adds no first-load JS. The search index grows from 119,383 to 1,053,729 uncompressed bytes with the full corpus and added stable identifiers. Search HTTP/browser checks confirm that ordinary pages do not request it. Mobile lab editor/popup event delays were 32/152 ms; these are individual lab interactions, not field INP. The initial search CLS result exceeded 0.1, while the final measurement did not; this single comparison does not establish a field CLS guarantee. Desktop and phone transferred bytes also increase because the complete corpus selects different images and generates more title glyphs.
