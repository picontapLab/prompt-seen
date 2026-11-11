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

## B1 pilot — 2026-11-11

Text evidence: `evidence/pilot-text-review.json` (28 pages and 235 fields). Visual evidence: `evidence/pilot-visual-review.json` (43 original assets and all six GIF frames; asset hashes retained). Review corrections remove an inaccurate bamboo count, describe the actual frontal grayscale guide portrait, and use farol for the lantern. Original Prompt text and model/usage uncertainty are preserved.

25 standalone pages and 235 fields promoted through hash-bound approvals. c_001, c_017 and topic/style/ink remain draft until B4 member completion. Including foundation pages, the report has 27 current of 381 targets and 696 current of 2,220 fields, with zero unreviewed/outdated/invalid entries. B1 CLI IDs are retained in batch-plan.json.

Subpath preview rebuild passed. Complete pilot browser run: 96 passed across Chromium, Firefox and WebKit, four widths and both themes, with actual controls, template clipboard/download, favorites, popup and available frozen Worker scenarios. Log: `.artifacts/localization/es/pilot-browser-final.log`. A prior failure reproduced a WebKit Intl.DisplayNames hydration mismatch (`Prompt · inglés` versus `Prompt · Inglés`); Spanish display names now normalize only the initial localized letter. The browser home-label assertion and uncaught-error collection exercise the regression. Typecheck and serialized-corpus unit acceptance passed. Native zoom, full corpus and release acceptance remain pending.

## B2 templates — 2026-11-11

All 70 remaining template pages and 410 dependency fields were read against complete sources (`evidence/template-text-review.json`, `evidence/template-fields-text-review.json`). The separate visual review opened 87 new originals and verified three reused pilot hashes (`evidence/template-visual-review.json`). Corrections clarify side-profile input, an aerial coastal view, and the single visible ink swimmer. Current source/candidate hashes were matched to the importer manifest before composing approvals; fields promoted before pages. All 75 templates are now current.

P2 review follow-up: the Standards axis requested a hydration readiness wait before the preview-toggle click, as required by engineering-conventions.md. The shared browser helper now waits for the actual toggle before clicking. The Spec axis found no blocking issue in the localized display-name fix. These findings do not certify remaining release gates.

B2 validation: subpath preview build, typecheck and serialized Spanish corpus check passed; all 27 affected cross-browser layout/reflow checks passed after the hydration-wait change. Logs: `.artifacts/localization/es/B2-{build,typecheck,unit,browser}.log`. These are preparation checks, not production release certification.

## B3 late series — 2026-11-11

77 pages and 535 fields were textually reviewed (`evidence/late-text-review.json`, `evidence/late-fields-text-review.json`). A separate actual asset pass inspected 59 new stills and every frame of 37 GIFs (300 decoded frames); 11 assets reuse existing inspections only after matching their current hashes. `evidence/late-visual-review.json` records 107 assets, 77 runs, playback timing/counts, and source/candidate hashes. The fox GIF was also checked against light and dark backgrounds for real alpha. The translated dwarf description was corrected to specify a red beard and fur garments. No original Prompt, image, frame count or playback setting was changed.

This batch could promote before early/middle because all shared dependencies are already current or owned by this batch. Fields promoted first, then pages; coverage is now 174/381 pages and 1,641/2,220 fields. Current sequence is a scheduling change only; every target and field still has exactly one owner in batch-plan.json.

## B3 early/middle and B4 completion — 2026-11-11

Early review covers 91 pages, 95 fields, 83 new original images and eight hash-verified reused pilot assets (`evidence/early-{text,visual}-review.json`). Middle review covers 97 pages, 484 fields, 54 new original stills and 84 reused assets (`evidence/middle-{text,visual}-review.json`); full-resolution checks include the coffee diagram, partner arrows, 24 text rows and 100 labels. a_269 actually shows a study, so its Spanish alt now says habitación rather than sala de estar. The p_125 main image is a living room and its separate description remains accurate.

All 19 aggregates and 112 member reasons were read (`evidence/aggregate-text-review.json`) and promoted after all dependencies were current. Strict report: 381/381 targets and 2,220/2,220 fields current, with zero missing/draft/unreviewed/outdated/invalid. Scope was regenerated and every target and field has exactly one batch owner. The full report is `.artifacts/localization/es/full-current.json`; final candidate evidence will be regenerated from its actual commit.

Real-corpus search exposed the missing mapa synonym for plano urbano. The profile now expands that explicit pair; a serialized-engine regression verifies that bare plano (as in primer plano) does not become a map. All 56 focused engine/Spanish/German corpus checks passed. The frozen queries were not changed.

Menu recommendation code is in commit 4bbc6209. Standards review found no material issue: only built locales are selectable, the list remains in registry order, default selection and URL logic are unchanged, and the already-reviewed label crosses the server/client boundary as a single formatted string. Logs retain the two failing red tests, the Firefox animation timing failure, twelve repeated passing phone checks, and all 24 final passing region/browser/width checks. Native zoom and production release gates remain separate.

## Complete-content validation

All eleven required checks passed: es/ja/de strict checks, all-locales report, content validation, typecheck, full ESLint/Prettier, token contrast checks, the full 59-file/517-test unit suite and Storybook build. Details and warning inventory: `evidence/implementation-checks.json`. The Spanish real-corpus unit test now exercises all 32 frozen scenarios because every expected target is current.

Content validation retains ten warnings in existing zh-Hans content (one missing-version group and nine stale source hashes) and one unused-media info item (102 assets). The all-locales report also retains the existing en/zh-Hans/ar missing-scope and Arabic draft/preparation findings. These are not Spanish failures and were not re-approved or removed by this change. Spanish, Japanese and German strict reports are ready and non-blocking. This working-tree evidence is not a production-candidate certificate.

Standards review strengthened the map negative fixture to “Retrato en primer plano con fondo urbano”. The original token-set phrase matcher incorrectly recalled it. The Spanish city-map phrase now requires adjacent whole words; all other profiles keep their existing semantics. The strengthened fixture and Spanish corpus passed; German's 32 scenarios passed in an isolated rerun. Two intermediate combined runs timed out in the existing 20-second German setup while system storage indexing was busy; no timeout limit was raised. Logs: `.artifacts/localization/es/map-phrase-{red,green,green-serial}.log` and `german-after-map-fix.log`.
