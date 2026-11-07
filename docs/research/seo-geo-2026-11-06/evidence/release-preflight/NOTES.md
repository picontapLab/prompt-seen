# Release preflight

The user subsequently authorized commit, merge, deployment and necessary search submissions. The original audit report describes the local baseline before that authorization.

PR: https://github.com/picontapLab/prompt-seen/pull/1

Initial PR CI (42338354334) reproduced the same three 5-second timeouts already present on production main in CI 42223891215: one mixed-language search test, and the PNG/GIF migration integration cases. The initial PR run passed 381/384 assertions/tests and failed those three time limits. See `ci-initial-failure.txt` and the linked source job. The first local full suite passed 384/384 (`unit-tests.txt`).

The minimum release-blocker correction reuses one loaded Chinese search index for six assertions instead of rebuilding it six times, and gives only the two real-image migration integration cases a 20-second timeout. It does not change application code, remove assertions, add retries or skip tests. Targeted validation: 14/14 pass; search case 525 ms; PNG 4376 ms; GIF 4248 ms (`ci-timeout-fix.txt`). CI on the new head must still pass before merge.

This is a release prerequisite, separate from the SEO/GEO hypothesis. The original six-file implementation diff remains `../../implementation.patch`; `ci-fix.patch` records the two test-only changes.

The second PR run passed the complete check job (384 tests and Storybook), but reproduced an existing HTTP acceptance-test assumption: it demanded creator/credit in every media file even when the canonical source fields are null. Both a_373 and a_374 explicitly have no creator/credit. The schema and existing media unit tests permit this, and fabricated attribution would violate this audit's evidence rules. The HTTP check now requires each declared field, rejects undeclared creator/credit fields, and verifies the actual digital-source-type value. No image bytes, media records or attribution were changed. The affected real HTTP check passes across every current detail/OG variant (`iptc-test.txt`); the original failure is in `ci-iptc-failure.txt`.

The root runner was terminated during WebKit in both main CI 42223891215 and PR CI 42338704917: logs say "The runner has received a shutdown signal". The provider's reason is unknown; memory exhaustion is not established. CI now splits each existing root/subpath suite into three Playwright shards, retaining all browsers and tests, with unique test artifacts and only one preview build artifact. All six shards remain dependencies of preview, and production still waits for successful main CI. This limits a single runner's browser lifetime without weakening acceptance assertions. The corrected IPTC check traversed 392 assets / 784 current detail+OG variants; nine assets have genuinely empty creator and credit fields.
