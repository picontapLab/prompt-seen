# Spanish local acceptance evidence

Tested implementation: `c73a2c9fc565f1faf38e16690c13050f29fae74f`. This directory is a later audit of that commit. It is not a release certificate and does not certify the later documentation-only audit SHA.

[production-acceptance.json](../../production-acceptance.json) indexes every command, exit code, original failed run, scoped rerun, build configuration and saved log. Logs are gzip-compressed without modification; JSON files preserve artifact, performance and browser diagnostics. `all-locales-findings.json.gz` retains every locale finding, including allowed preparation gaps. `coverage.json` is the strict es/ja/de summary.

Local runtime versions and browser revisions are in `candidate-toolchain.json`. The existing local Playwright 1.64.1 runtime was used consistently; this is not a claim that remote CI ran. Performance compares the same content/configuration and runtime with Next output/cache cleared; host load was uncontrolled. Existing list/editor JS budget overages are reported, not attributed to Spanish.

## Firefox native-tab limitation and reproduction

The default-profile subpath run retains one failed native modified-click case. Plain-anchor controls reproduce the missing new page without application handlers. A foreground-tab preference restores Meta flow in both controls. This does not establish a fix for default background tabs or verify middle-click recovery. Original default-profile and first foreground-profile failures remain in their logs; the successful scoped rerun kept the complete test and assertions.

Recreate the exact local configuration from the audit checkout’s repository root. Use Node 24 and the reference Docker/nginx setup. A separate checkout keeps BUILD_ID tied to the actual tested commit:

```sh
validation_dir="$(mktemp -d "${TMPDIR:-/tmp}/prompt-seen-es-verify.XXXXXX")"
git worktree add --detach "$validation_dir" c73a2c9fc565f1faf38e16690c13050f29fae74f
mkdir -p "$validation_dir/.artifacts/localization/es"
cp production/localization/es/evidence/candidate/firefox-foreground.config.ts.txt "$validation_dir/.artifacts/localization/es/firefox-foreground.config.ts"
cd "$validation_dir"
npm ci
npm install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund @playwright/test@1.64.1
npx playwright install chromium firefox webkit
BUILD_ID=c73a2c9fc565f1faf38e16690c13050f29fae74f BUILD_MODE=production BASE_PATH=/prompt-seen npm run build
BUILD_ID=c73a2c9fc565f1faf38e16690c13050f29fae74f BUILD_MODE=production PORT=8093 BASE_PATH=/prompt-seen PW_BROWSERS=firefox npm run test:e2e -- --config=.artifacts/localization/es/firefox-foreground.config.ts tests/e2e/popup.browser.spec.ts --grep 'modified clicks and pages without JavaScript' --project=firefox --workers=1 --repeat-each=3 --timeout=60000 --retries=0
```

The two `modified-click-*.mjs.txt` snapshots preserve the independent native-anchor diagnostic scripts. Header JSON explicitly identifies local HTTP and Host overrides; those rows are not live HTTPS evidence.

The committed config snapshot changes only Firefox's `browser.tabs.loadInBackground` preference and resolves the existing tests/server from the repository root. The 60-second budget applies only to that isolated rerun; the later preview full matrix retains its normal test budgets.

## Deferred release gates

The user requested local commits only. No remote CI, push, deployment, canonical/platform HTTPS live check or private production-hook execution occurred. Paid Pages capacity was confirmed by the owner, not independently inspected. All raw RSC files remain in the upload artifact. Keep these distinctions when using this candidate for a later release.
