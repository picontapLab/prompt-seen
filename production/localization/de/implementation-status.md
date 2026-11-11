# Localization implementation status

Recorded 2026-11-11 UTC. This is a partial delivery against
`docs/general-localization-spec.md`, not a German production-release approval.

## Implemented

Core commit: `995fa0f2` (policy-driven localization and publication workflow).
P0–P4 contracts are implemented: explicit registry policy; shared pure classification;
report v2 and evidence-backed scope migration; registered-language import and
transactional promote; fingerprint review and concurrent-edit protection; browse/SEO
separation; actual text language; German search normalization and index versions;
shared build gates; all-language CI diagnostics; maintenance documentation.

The Japanese migration preserves the existing review history. Before and after
migration its candidate-production report contains 381 current targets and 2,220
current fields, with no blocking findings. No policy was weakened to obtain this result.

German preparation and representative content include all 427 messages in 14
namespaces, About and License, 34 global taxonomy fields, 22 Prompt descriptions,
3 templates, 2 collections and their 111 dependent fields. The sample includes
English/Chinese sources, literal/template-derived Prompts, annotations, historical
runs, two ordered reference inputs and a six-frame composed GIF. Actual review and
asset evidence is recorded in `review-evidence.md`, with 601 exact-hash approvals in
`reviews.json`. The original Prompt bodies and generation facts remain unchanged.

The German candidate-production report now has 381 targets: 29 current and 352
missing/fallback. Of 2,220 fields, 572 are current and 1,648 missing. Two translated
collections still contain fallback members, so only 27 targets are indexable under
candidate-production simulation. Actual preview outputs are all noindex.
`de.preview` is true and `de.enabled` remains false.

## Subsequent content progress

The early-library expansion adds 76 reviewed Prompt descriptions, 69 visually
checked media descriptions and 14 annotation notes (159 approvals). The latest
completed batch has 105/381 current targets and 655/2,220 current fields; 276
targets and 1,565 fields remain. The two sample collections are now indexable in
candidate simulation because their members are current. The verification below
remains the earlier 29-target snapshot; no new browser acceptance is claimed.

All 75 template descriptions are now current after review of the remaining 72
pages and 431 dependent fields, plus an early-alt grammar correction. The latest
completed snapshot is 177/381 current targets and 1,086/2,220 current fields.
There are 204 missing targets and 1,134 missing fields. Full-production acceptance
and the browser results below have not been rerun against this larger corpus.

## Verification

These checks ran against the working source tree, including the user's existing
content changes. They are implementation/preview checks, not an isolated de-enabled
production candidate or a deployed-commit certification.

- TypeScript and ESLint: passed.
- Full Vitest suite after final code/fixture changes: 55 files, 462 tests passed.
- Content validation: 0 errors, 0 publication errors; 10 existing stale-translation
  warnings and 1 unused-media information finding remain visible.
- Japanese strict report: ready, 381/381 targets and 2,220/2,220 fields current.
- Root production build/package and HTTP checks: 141 passed, 2 skipped.
- `/prompt-seen` production build/package and HTTP checks: 142 passed, 1 skipped.
  These three-locale production checks preceded the final search-label provenance
  adjustment; the final five-locale preview rebuild includes that adjustment.
- Earlier editor/search/home-language/page browser regression: 152 passed, 19 skipped.
- Five-locale preview home-language/page checks: 87 passed across Chromium, Firefox
  and WebKit, including real German UI and Arabic RTL.
- Final reviewed-sample preview build/package: passed for en, zh-Hans, ja, de, ar.
- Final reviewed-sample preview HTTP checks: 201 passed.
- Real German sample browser checks: 30 passed across the three browsers. Widths
  360/768/1024/1440 and both themes cover home, translated details, multiple inputs,
  GIF, editor and search. Edited Prompt preview/download agree; Chromium clipboard
  agrees too. Editor axe and keyboard checks pass. A 720 CSS-pixel viewport checks
  reflow equivalent to 200% zoom on a 1440px display; native browser zoom is not claimed.
- Search browser regression on the final preview: 55 passed, 2 skipped (the skipped
  cases use Chromium-only CDP composition automation).
- Token contrast: 44/44 passed. Storybook build passed.
- Frozen German search set: 6/32 pass on the partial corpus. All original 32 cases
  are retained. `search-preview-results.json` records actual top-five results and
  failures; this is explicitly not search launch acceptance.

Playwright reports use separate output directories. Initial shared-directory trace
errors were rerun independently. Layout checks expand the intentionally collapsed
mobile preview before inspecting its controls, and use the repository's existing
scroll-to-top and navigation-cancellation handling; no accessibility rule is disabled.

## Review

Standards review found no remaining core violation after fixing a missed
`tagLocales` copy in the public search result. A serialized-index regression first
failed, then passed with that fix. Spec review prompted fixes for first-page featured
content, collection/topic eligibility, and global taxonomy publication dependencies.
Both reviews distinguish implemented mechanism from unfinished German rollout.
The final browser-test review also required waiting for a known German Worker result
before measuring the search layout; that wait is now explicit.

## Still required

P5 flow acceptance is partial: the representative content is translated and reviewed,
but the complete sample path through favorites, popup, native zoom and every
copy/download interaction has not been certified as a single acceptance run.

P6 remains unfinished: translate/review the remaining 352 descriptions and 1,648
fields, inspect their actual assets, pass all frozen search cases, complete the full
browser/axe/performance matrix, and prepare an isolated full production candidate
with `de.enabled: true`. Record comparable build time, file/byte counts, gzip search
size, first-load JavaScript and font requests before approving that candidate.

P7 has not started. No language-enabling production commit, push, deployment or live
verification was performed. Deploy only the same fully accepted commit, verify its
build ID with `check:live`, and retain the previous successful deployment for rollback.
The current preview and disabled production build cannot substitute for those steps.
