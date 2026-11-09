# Japanese release acceptance

Status: release candidate; Japanese is enabled in the candidate commit after content, local artifact and user-reported IME acceptance. At the user’s explicit request, delivery stops at the committed/pushed candidate; hosted CI and actual deployment are deferred. This record distinguishes text review, generated-artifact checks, user-reported manual acceptance, and deployment.

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


## Final committed-candidate handoff

Code/config/content candidate: `a4d4b964e3e244ae5a4d929642ed04f59e96897a` on `codex/seo-geo-evidence`. Later handoff-document commits do not change runtime inputs. Scope fingerprint: `sha256:4f83e2c0cdc62520dd8b117528c607ee87074c733428caaf4743f6d63ed74bdc`.

Validation from a source tree exported from Git, without the workspace’s unrelated uncommitted work:

- All 409 committed unit tests pass. The earlier working-tree count of 411 included two existing uncommitted tests from another task.
- Content validation: zero errors / zero publish errors; the ten existing non-Japanese warnings remain nonblocking.
- Typecheck, lint and formatting pass. Token contrast and Storybook were also verified; there were no subsequent runtime UI changes.
- Root production build `a4d4b964`: 132 HTTP/SEO tests pass, 2 conditionally inapplicable cases skipped.
- Enabled-Japanese subpath preview build `a4d4b964-subpath`: 166 HTTP/SEO tests pass.
- The same subpath artifact: 106 Japanese-search/layout/native-new-tab checks pass across Chromium, Firefox and WebKit. The two skips are explicitly Chromium-only CDP composition cases in Firefox/WebKit; actual Safari desktop/mobile IME acceptance is separately recorded.
- The earlier complete browser runs and follow-up evidence remain available. These results do not mean the complete suite passed in one attempt.

Evidence: `committed-unit-tests.log`, `committed-content-validate.log`, `committed-typecheck.log`, `committed-lint.log`, `committed-format.log`, `committed-production-build.log`, `committed-http.log`, `committed-subpath-build.log`, `committed-subpath-http.log`, `committed-subpath-browser.log`, and `release-inputs.json` under `.artifacts/localization/ja/`.

## Standards

Final review passed with no remaining findings. The latest test changes preserve product expectations: actual line rectangles for wrapped links, exact recent-search labels, foreground observation of a new tab, explicit real-corpus fixture timeouts, and registry-driven publication checks.

## Spec

The reviewed candidate is deliverable with no newly identified undisclosed specification error. Original text/rendering invariants, dynamic coverage and actual review records are intact. Full remote CI, deployment, and canonical-domain Japanese `check:live`, page/export/sitemap checks remain release work; this candidate has not been deployed.

## Deferred release steps

1. Authenticate a GitHub account with repository collaborator/PR/Actions permissions, or grant those permissions to the existing account. The connector returned `Resource not accessible by integration`; local `gh` returned `must be a collaborator`. SSH branch push works, but no direct push to `main` was attempted.
2. Open the prepared PR from [the candidate branch](https://github.com/picontapLab/prompt-seen/compare/main...codex/seo-geo-evidence?expand=1). Its prepared body is `.artifacts/localization/ja/pr-body.md`.
3. Run full CI on the final reviewed commit, then merge and use the existing production deployment workflow. Repeat checks if runtime inputs change; do not reuse old build results after such changes.
4. Verify the actual deployment build ID, `check:live`, Japanese pages/exports/sitemap and the recorded rollback baseline. Then perform day 1/7/28 follow-up under the normal operations process.

No PR was created, no merge was performed, and the live site remains on the previous production build. Unrelated preexisting workspace changes are preserved. Necessary source-content prerequisites were committed separately with the user’s explicit approval.
