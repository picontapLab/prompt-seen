# CI reliability tracking

Owner: repository maintainers. A retry passing is a flaky result, not a clean pass. Keep the
three browsers, both paths, one retry and failed-attempt evidence while investigating.

Each browser job publishes `test-results/reliability.json`, a Markdown summary and the
Playwright HTML report. The JSON records every test's stable ID (browser, relative file and
title), outcome, each attempt's status/duration, worker count, run ID and run attempt. Use the
stable ID to group repeat occurrences across jobs/runs; path coverage is identified by the
artifact name (`playwright-root-*` or `playwright-subpath-*`). Downloads expire after 7 days,
so retain evidence needed for an investigation before expiry.

## Resource baseline

The latest attempt available on 2026-11-11 for
[run 42999951948](https://github.com/picontapLab/prompt-seen/actions/runs/42999951948)
reports all six jobs successful. The subpath/WebKit job 130492175374 ran 396 tests with two
workers in 13.2 minutes (370 passed, one flaky, the remainder skipped). This is a measured
baseline for an explicit two-worker budget, not evidence that concurrency caused a failure.
That measurement originally set a 30-minute suite and 40-minute job budget. HTTP-only tests
run in the Chromium job once per path.

The six-language production and eight-language preview matrices in
[run 43159104156](https://github.com/picontapLab/prompt-seen/actions/runs/43159104156),
attempt 1 at `fb87dd22`, both reached the 30-minute WebKit suite limit. Root completed 509
passes with 17 cases left to run. Subpath completed 479 passes, with one failed search case
and 137 cases left to run. WebKit now has 45 minutes for the suite and 55 minutes for the job,
allowing the measured remainder and setup/report upload. Chromium and Firefox use 30-minute
suite and 40-minute job budgets. Fresh runs must record actual completion durations.

## Open investigations

| Tracking key | Evidence | Status / next action |
| --- | --- | --- |
| `explore.browser.spec.ts` / WebKit / `the list links to explore with its conditions, and works open in the popup there` | Review of an earlier attempt of run 42999951948 reported failure after retry. Local subpath replay on 2026-11-11, two workers, five repetitions: 5/5 passed (20.3 s total). | Open; no root cause assigned. Retain the original attempt's trace, console and DOM snapshot; compare popup navigation, hydration and history state on an Ubuntu WebKit replay. Local macOS success cannot close this. |
| Earlier-attempt retry passes in run 42999951948 | Review reported eight retry-passing executions across the six jobs. | Open; import identities from that attempt's HTML/log evidence, deduplicate by browser/file/title, and attach reproduction + regression check per case. Do not guess identities from the newer attempt. |
| `social-adaptations.browser.spec.ts` / subpath WebKit | Latest job 130492175374 reports one flaky result with artifact prefix `social-adaptations.browser-16ddb-iginal-collection-at-1440px-webkit`. | Open; inspect the retained first-attempt screenshot/context and retry trace, then reproduce independently. This observation does not explain the earlier popup failure. |
| `search.browser.spec.ts:162` / subpath WebKit / cross-language no-results suggestions | Runs 43159104156 and 43164756860 failed the Chinese suggestion-link assertion on both attempts. All eight index requests returned 200 within 308 ms in the first retry trace. A controlled third-language index pause reproduced the missing Chinese link for 15 seconds. | Open pending repeated Ubuntu verification. The UI awaited all foreign indexes before publishing any counts. It now requests and merges each language independently in registry order. The paused-index regression passes with the fix. Local eight-language subpath search suites passed 45 Chromium/WebKit cases with one existing IME capability skip; 623 unit tests passed. Repository maintainers retain the CI traces and contexts. |

For each new flaky ID, add a row here with run/attempt, path/browser, evidence, owner, hypothesis,
and next experiment. Close it only after a cause-specific fix and a regression test at the real
failure boundary pass, followed by repeated CI runs without recurrence. Do not remove a browser,
skip the test, increase retries, or claim an application/test defect before reproducing it.
