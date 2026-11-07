# Release preflight

The user subsequently authorized commit, merge, deployment and necessary search submissions. The original audit report describes the local baseline before that authorization.

PR: https://github.com/picontapLab/prompt-seen/pull/1

Initial PR CI (42338354334) reproduced the same three 5-second timeouts already present on production main in CI 42223891215: one mixed-language search test, and the PNG/GIF migration integration cases. The initial PR run passed 381/384 assertions/tests and failed those three time limits. See `ci-initial-failure.txt` and the linked source job. The first local full suite passed 384/384 (`unit-tests.txt`).

The minimum release-blocker correction reuses one loaded Chinese search index for six assertions instead of rebuilding it six times, and gives only the two real-image migration integration cases a 20-second timeout. It does not change application code, remove assertions, add retries or skip tests. Targeted validation: 14/14 pass; search case 525 ms; PNG 4376 ms; GIF 4248 ms (`ci-timeout-fix.txt`). CI on the new head must still pass before merge.

This is a release prerequisite, separate from the SEO/GEO hypothesis. The original six-file implementation diff remains `../../implementation.patch`; `ci-fix.patch` records the two test-only changes.
