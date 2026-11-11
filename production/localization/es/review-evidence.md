# Spanish review evidence

## B0 foundation — 2026-11-11

Baseline: `ec6051f3ac7c0c066930eb49bc64d44dc619255c` plus the working tree; scope and policy fingerprints are in `scope.json` and `batch-plan.json`. This is preparation evidence, not a release-commit assertion.

AI Codex `standards_review` completed textual comparison at 2026-11-11T09:46:13Z. AI Codex `spec_review` independently completed comparison at 2026-11-11T09:46:16Z. Both read all 427 English/Spanish UI pairs, all 34 taxonomy fields, the complete About/License pages, glossary and style guide. No required textual corrections were found. `reviews.json` records the latter review with each actual source and target fingerprint.

The review preserves the historical 101-image statement, exact-model and usage uncertainty, qualification about lossless conversion, archived earlier runs, MIT and CC BY 4.0 terms, attribution/link requirements, and the name/logo exclusion. Orientation uses Vertical; subject labels use Retrato. Exact-field reasons explain unchanged Prompt terminology, brand/named terms and formatting-only messages. No original Prompt or template value was translated.

AI Codex `spec_review` rendered all 427 messages with `createTranslator`, using plural counts 0, 1, 2, 1234 and 1.5, without runtime errors. This is Node message evidence only; browser formatting and layout remain separate.

Importer/promoter batch: `fca03991cac3429370962a0697a4b4c3d6d6b2b98fefc5ea38195e7fe4ca28dd`. Dry-run and apply both succeeded. The batch contains two pages and 34 taxonomy operations; its promotion also merges the 427 current hash-bound UI approvals. The batch plan retains the ID; final translations and approved hashes are committed together. Transaction logs remain under `.artifacts/localization/es/`.

No media or animation description is approved in B0. References to historical image review in About translate the source claim; they do not claim that this review re-inspected those images. Foundation approval does not certify the remaining corpus, any of the 32 frozen real-content queries, browser interactions, production candidate or deployment.

## Foundation browser/build evidence

`BUILD_MODE=preview BASE_PATH=/prompt-seen npm run build` passed. All six preview languages were rebuilt, including es; generated search indexes carry analyzer version 3. This working-tree build uses baseline buildId `ec6051f3ac7c`, and is not a production candidate bound to a new release commit.

`PW_BROWSERS=chromium,firefox,webkit npm run test:e2e -- tests/e2e/spanish.browser.spec.ts --workers=2`: 24 passed. About and License were checked at widths 360, 768, 1024, 1440 in both light and dark themes; language/direction, actual Spanish headings/navigation, layout, serious/critical axe findings and uncaught page errors passed. No screenshot-only or native-zoom claim is made. Log: `.artifacts/localization/es/foundation-browser.log`.

43 focused search/tokenization/Worker/highlight tests and the 32 real German search scenarios passed. ESLint, changed-code formatting and typecheck passed. Full-corpus Spanish, browser search, native zoom, performance and release checks remain pending.
