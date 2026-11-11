# Final candidate validation commands

Application/content/configuration revision and all enabled build IDs: `b8e0e7e392ff8fd259a8ef91aa40817de35bca75`. Node 24.19.0; installed Playwright 1.64.1; Chromium 156, Firefox 157, WebKit 27.2. The later validation-only commit corrects the Portuguese preview sitemap assertion and records evidence; it does not change the application or content that produced these artifacts.

Commands ran in the isolated Portuguese worktree. The reference nginx binds only `127.0.0.1:8097`; it was stopped and restarted between builds so generated subpath rules could not remain stale. Playwright manages the nginx lifetime for test runs. Logs, JSON reports, failure screenshots and traces remain under `.artifacts/localization/pt-BR/` in that worktree.

## Builds

```sh
export PATH=/Users/hp/.nvm/versions/node/v24.19.0/bin:$PATH
export PT_BR_RELEASE_COMMIT=b8e0e7e392ff8fd259a8ef91aa40817de35bca75
BUILD_ID="$PT_BR_RELEASE_COMMIT" BUILD_MODE=preview BASE_PATH=/prompt-seen npm run build
BUILD_ID="$PT_BR_RELEASE_COMMIT" BUILD_MODE=production BASE_PATH='' npm run build
BUILD_ID="$PT_BR_RELEASE_COMMIT" BUILD_MODE=production BASE_PATH=/prompt-seen npm run build
```

Each build was tested and measured before replacing its `dist/`. Build exit codes, elapsed time and identities are recorded in `build-final-{preview,root,subpath}.json`. The disabled performance control used the same application/content revision and production root configuration, temporarily setting only Portuguese `enabled:false`; its runner restored the original registry in `finally`. Its build ID adds `-disabled`. This control is not a Portuguese acceptance artifact.

## Production root and production subpath

For each actual packaged artifact, the complete test set was partitioned into ordinary checks and the original native modified-click/no-JavaScript check. Every selected test retained its assertions. This avoids adding test-level skips; it does not establish that serial execution cures the recorded Firefox intermittency.

```sh
PORT=8097 PW_BROWSERS=chromium,firefox,webkit PT_BR_REQUIRE_ENABLED=1 \
  npx playwright test --workers=3 --retries=1 --reporter=line,json \
  --grep-invert 'modified clicks and pages without JavaScript reach the full page'

PORT=8097 PW_BROWSERS=chromium,firefox,webkit PT_BR_REQUIRE_ENABLED=1 \
  npx playwright test 'popup\.browser\.spec\.ts$' --workers=1 --retries=1 \
  --reporter=line,json \
  --grep 'modified clicks and pages without JavaScript reach the full page'
```

For each label `root` or `subpath`, `PLAYWRIGHT_JSON_OUTPUT_FILE` selected `e2e-final-LABEL.json` and `e2e-final-LABEL-native.json`; stdout went to corresponding `.txt` files. `--output` selected `final-LABEL-results/` or `final-LABEL-native-results/`. The partition covers 1,595 ordinary cases plus 3 native cases, matching the 1,598-case production inventory. Combined reports retain platform skips and actual retry outcomes separately.

## Preview and its retained retries

The first preview run executed the entire 1,780-case inventory with `--workers=3 --retries=1 --reporter=line,json`. It recorded 1,720 direct passes, 56 skips, 2 flaky passes and 2 failures. The sitemap expectation was then corrected to the existing preview contract; no application code changed.

The four affected titles were rerun across projects with the following selector (13 selected executions because the layout title also matches the existing German layout check):

```sh
PORT=8097 PW_BROWSERS=chromium,firefox,webkit PT_BR_REQUIRE_ENABLED=1 \
  npx playwright test --workers=1 --retries=0 --reporter=line,json \
  --grep 'machine-readable coverage includes every public target|Produktfoto Studio|768px dark: reviewed descriptions and controls fit|modified clicks and pages without JavaScript reach the full page'
```

This run had 12 passes and one Firefox native failure; it is not represented as green. After bounded diagnosis, the unchanged native test was formally verified across three browsers with `--workers=1 --retries=1 --repeat-each=3`: 9 passes, no actual retries or skips. Raw reports are `e2e-final-preview.json`, `e2e-final-preview-retry.json` and `e2e-final-preview-native.json`; their corresponding `final-preview*-results/` directories retain traces/screenshots. The combined report contains 1,724 successful distinct cases and 56 skips, including all 165 mandatory Portuguese cases without skips. See [the bounded Firefox diagnosis](firefox-modified-click/deep-diagnosis.md) for limitations; neither a product fix nor the precise failure cause is claimed.

## Other checks and measurements

Final logs include `unit-final-serial.txt` (`npm test -- --maxWorkers=1`, 61 files / 556 tests), `final-content-validate.txt`, `final-typecheck.txt`, `final-lint.txt`, `final-format-check.txt`, `final-tokens.txt` and `final-storybook.txt`. All completed successfully; content validation retains ten existing translation warnings. Full unit tests were not rerun solely for documentation or the corrected HTTP assertion.

First-load measurements use `scripts/measure-first-load.ts --no-prefetch`; the enabled run checks the HTTP build identity and all five routes before and after measuring. [Final first-load evidence](first-load-final/evidence.md) and [native zoom/font evidence](native-zoom-final/evidence.md) record actual data and screenshots. Measurements are byte counts, not latency/LCP benchmarks. Historical c82 measurements remain separately identified.

These are local candidate checks. No deployment, canonical-domain release check or verified Cloudflare rollback deployment ID is claimed.
