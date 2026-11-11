# Follow-up diagnosis: limited conclusions, no new fix

Candidate remains b8e0e7e392ff8fd259a8ef91aa40817de35bca75, preview `/prompt-seen`. No product/test change, rebuild, browser preference change, increased test timeout, changed modifier or weakened assertion was retained.

## Counterevidence and exact failure boundary

The parent’s subsequent serial retry (`--workers=1 --retries=0`) had 12 passes and one Firefox failure of this native modified-click test. This disproves treating parallel workers or `bringToFront()` as a sufficient explanation/fix. [Serial trace extraction](serial-refailure.json) preserves the original error and timings. In that attempt the first recorded action started at 29724.958 ms, click started at 30205.078 ms, and the timeout was recorded at 60570.097 ms. The native page wait had about 30 seconds; initial navigation/hydration did not exhaust the test budget. The full-suite first/retry attempts likewise left approximately 30 seconds after the click.

The original, unchanged test then passed twice in one diagnostic invocation (38.3 seconds total), and three times in a protocol-instrumented invocation (16.5 seconds total). The [three-test log](native-real-diagnostic-run.txt) is diagnostic evidence, not a replacement for the parent’s formally reported final matrix or its failures. Intermittency remains.

## Protocol observation

In one slow successful baseline the modified mouseup was sent at 15:50:02.138Z; Firefox attached a new target with the gallery as opener at 02.262Z (124 ms later). Navigation started at 03.278Z, committed at 07.189Z and `Page.ready` arrived at 07.418Z. Thus absence of the public context `page` event does not establish that no native tab was created. Installed Playwright’s Firefox implementation waits for `Page.ready` before reporting the page. The [protocol event extraction](native-protocol-events.json) includes target/opener IDs, timestamps and original log hashes.

This protocol example is a successful delayed case; we did not capture the exact original 30 second failure at protocol level. It must not be presented as proof of the original failure’s internal cause. Preferring foreground tabs gave quicker navigation-to-ready in two diagnostic samples but did not establish a stable overall improvement; no such preference was retained. Explicitly holding Meta also had a 12 second no-ready sample, so modifier release is not a sufficient explanation. [Variants](native-variants.json) and [protocol variants](native-protocol-variants.json) preserve the observations. Their `tabAfterMs` measures completion of the click-plus-page-wait sequence, not exclusively target creation latency.

An accelerated 10-run loop used a 3 second page-event budget and timed out in every run. This was an invalid surrogate for the original 30 second boundary: later baseline observations delivered the event after 4–7 seconds. Those short-budget runs are exploratory latency observations, not ten reproductions of the original failure, and do not justify a regression fix.

## Environment and handoff

Read-only process inspection at approximately 15:52Z found two other active Playwright workers under `/private/tmp/prompt-seen-es-release`, PIDs 78249/78250, parent 75616, started 15:45:28–29Z, with Firefox children 78253/78252. Both were consuming substantial CPU during this task’s nominally single-worker runs. We did not modify or stop these unrelated processes. Consequently `--workers=1` only controls this invocation; it does not prove host isolation. This is an observed confounder, not a demonstrated root cause.

All diagnostic browser processes completed and this task’s `prompt-seen-nginx-8097` container was stopped. The bounded formal validation has now completed; see the result below. We have not identified a sufficient root cause and do not call the issue fixed.

## Formal final-preview acceptance result

The original test was executed across Chromium, Firefox and WebKit with `--workers=1 --repeat-each=3 --retries=1`: **9 passed in 44.7 seconds, 0 actual retries, 0 skipped**. This is three unique browser cases and nine repeated executions. [Retained formal result](final-preview-native-validation.json) includes each attempt and the original JSON SHA-256. All original modifier, new-tab, destination, unchanged-gallery and JavaScript-disabled assertions remained.

The [combined final-preview report](../../e2e-final-preview.json) records **1,724 unique passes, 56 mode/capability skips, 0 unresolved; Portuguese-specific 165 passes and 0 skips**. It retains the four initial failed/flaky cases and both follow-up invocations, including the earlier native serial failure. This closes the native case’s preview acceptance result; it does not prove a root cause, erase previous intermittency, or certify final production-root/subpath matrices or deployment. Those remain separately recorded.
