# Italian validation notes

## Scope

The local matrix runs the Italian HTTP and browser suites against packaged static output served by the repository's reference nginx. The repository-wide browser suite is configured in CI but is not represented as locally executed in this evidence. The full local unit run passed 66 files / 664 tests before the final ICU fix; the final language-label suite separately passed 10 tests, including four new Italian regressions.

Local installed Playwright is 1.64.1: Chromium 156.0.8078.4 (revision 1248), Firefox 157.0 (1555), WebKit 27.2 (2370), on macOS arm64 with Node 24.19.0. CI installs locked Playwright 1.65 for Chromium/WebKit and explicitly selects 1.64.1 for Firefox. The local matrix does not claim to have executed that different CI runtime; passing remote CI remains a release requirement. No dependency manifest or lockfile was changed for these local runs.

## Corrected test contracts

- The first `playwright test italian` invocation also matched the absolute worktree directory name, selecting unrelated suites. It was stopped and replaced by the filename pattern `italian[^/]*\.spec\.ts$`.
- Prompt pages expose Markdown exports in production. The text-download button belongs to the template editor. The initial Chinese-source browser test incorrectly attempted that template-only button on a Prompt page. Its corrected assertions cover display and Chromium clipboard; the HTTP suite verifies original Markdown bodies, and the template suite verifies text download.
- Safari does not focus anchors on pointer activation. The focus-return scenario now activates the launcher with the keyboard, as the existing generic search suite does; the assertion was retained.

## Actual Safari hydration defect

The initial WebKit layout run failed all eight width/theme combinations with React error 418. A separate direct browser probe isolated the error to the Italian home page. Node and WebKit returned identical UTC dates (`28 ott 2026`, `28 ott`) and numeric strings (`1000`, `10.000`, `100.000`), but `Intl.DisplayNames` differed:

| Language | Node | WebKit |
| --- | --- | --- |
| en | inglese | Inglese |
| zh-Hans | cinese semplificato | Cinese semplificato |
| ja | giapponese | Giapponese |

The shared `languageName` helper already normalized initial casing for Portuguese and Spanish. Italian now uses that same narrow rule, preserving the remainder of the label (including region names) and unknown language-code fallbacks. Four new tests failed before the fix (`italian-casing-red.log`) and passed afterward (`italian-casing-green.log`). Final artifact runs retain the page-error assertions, rather than suppressing hydration errors.

## Build interruptions

Next.js 16.4.2 emitted `SecurityFatalError` upgrade notices after otherwise completing static export. Original attempts are retained. The identical build command was retried as the tool advised; no dependency version, lockfile, or security setting was changed. This is an existing dependency maintenance risk, not evidence that a security upgrade has been performed.

## Evidence interpretation

Reports with `.json.gz` are lossless gzip archives of the original JSON. Import/promotion records bind reviewed candidates to actual fingerprints. Language review is same-agent AI review, not independent human or native-speaker approval. Media facts reuse prior documented visual review only for verified identical original bytes and scope; details are in `../review-evidence.md` and `../media-review-provenance.json`.

The disabled comparison uses the same candidate code with only `it.enabled=false` during its build; the registry is restored before enabled candidates. Timings are local observations, include warm caches, and are not controlled benchmarks. Browser performance samples use a fresh context, gzip level 6, and separate normal router prefetch from runs blocking router text prefetch. They are not real-user Core Web Vitals.
