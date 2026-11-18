# CI reliability tracking

Owner: repository maintainers. A retry passing is a flaky result, not a clean pass. Keep the
three browsers, both paths, one retry and failed-attempt evidence while investigating.

Each browser job publishes `test-results/reliability.json`, a Markdown summary and the
Playwright HTML report. The JSON records every test's stable ID (browser, relative file and
title), outcome, each attempt's status and duration, worker count, run ID and run attempt.
The JSON and summary include the suite status, WebKit shard and count of tests that had no
attempt. Use the stable ID to group repeat occurrences across jobs and runs. The artifact
name identifies the build and browser. WebKit artifacts end in `-shard-1` or `-shard-2`.
Downloads expire after 7 days, so retain evidence needed for an investigation before expiry.

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
and 137 cases left to run. WebKit uses a 45-minute suite budget to allow for the measured remainder.

In the 12-language [run 44206561285](https://github.com/picontapLab/prompt-seen/actions/runs/44206561285),
root Firefox reached the 30-minute suite limit with 68 cases left. The root WebKit job took
nearly 33 minutes to reach the first test step, including 29 minutes to install browsers.
Firefox has 40 minutes for the suite and 50 for its job. WebKit has 85 minutes for its job,
including setup and report upload. Chromium retains its 30-minute suite and 40-minute job budgets.

In [run 44213557265](https://github.com/picontapLab/prompt-seen/actions/runs/44213557265),
root and preview WebKit reached the 45-minute suite limit. The root report listed 981 tests,
including 292 without an attempt. WebKit now runs in two parallel shards per build with two
workers per shard. Both shards must pass the release gate. The first complete sharded CI run
will provide the new timing baseline.

A local Ubuntu 26.04 ARM64 replay of the root build reproduced the home showcase and feed
scroll timeouts and the missing first-save toast in headless WebKit. An Xvfb replay passed
the showcase and scroll cases, but the WebKit target crashed during the favorites case.
The interaction failures remain open.

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
