# Localization implementation status

Recorded 2026-11-11 UTC before release. German content is complete and strict ready.
The isolated production candidate enables German and has passed production
acceptance. This document records pre-release evidence; deployment must publish
the rebuilt, verified release commit and check its live build ID.

## Implemented contracts

Core commit `995fa0f2` implements P0–P4: explicit locale policy, shared pure
classification, report v2 and evidence-backed scope migration, registered-language
import, transactional promotion, fingerprint/concurrent-edit protection, separate
browse and SEO eligibility, actual text language, German search normalization,
versioned indexes, shared build gates, all-language CI diagnostics and maintenance
instructions. The original Prompt bodies, parameter values and generation facts
remain unchanged by translation.

Japanese policy and review history are preserved. Its strict report remains ready:
381/381 current targets and 2,220/2,220 current fields. No policy was weakened.

## Completed German content

All dynamic targets are current and candidate-indexable: 285 Prompt descriptions,
75 templates, 16 collections, 3 topics, About and License. All 2,220 fields are
current, including 427 UI messages in 14 namespaces. There are no missing, draft,
unreviewed or outdated targets. The 2,604 exact-hash records include three
superseding corrections. Every approval represents an actual AI review; these
records do not claim human review.

`review-evidence.md` records each batch, reviewer, time and scope. All media alts
were checked against actual assets. The final animation batch includes all 300
decoded frames of 37 GIFs; its dimensions, frame delays, durations, playback settings
and source asset hashes are retained in `gif-review-metadata.json`. The earlier
six-frame representative GIF was reviewed separately. Historical run-review claims
remain historical, and all source uncertainties and adaptation limitations remain
explicit. Glossary and style-guide terminology have been checked against the corpus.

## Search acceptance

All 32 frozen German cases pass through the public serialized search engine without
changing their queries or expected targets. TopK means top results within each
independently displayed content-kind group, matching the existing UI design and
search API. `search-preview-results.json` records the actual group results.

Search now includes visible explanatory prose at the existing secondary body weight,
explicit maintained compounds, kind terms and directional product-photography aliases.
A negative regression prevents generic family photography from matching Packshot.
`search-index-cost.json` records the cost of prose indexing against the same current
corpus/analyzer: roughly +18% German, +14% English, +29% Chinese and +46% Japanese
gzip index size. These indexes remain loaded on demand; no new ordinary-page
first-load dependency was added. Browser Worker acceptance is a separate check.

## Verification history and current limits

The earlier 29-target preview snapshot passed TypeScript, ESLint, 462 unit tests,
content validation, 201 HTTP tests, 30 actual-German browser checks and 55 search
browser checks (2 Chromium-only composition cases skipped in other browsers).
The German checks covered Chromium, Firefox and WebKit, widths 360/768/1024/1440,
both themes, multiple reference inputs, a GIF, template editing, clipboard/download
agreement, keyboard handling and axe. A 720 CSS-pixel viewport tested reflow
equivalent to 200% zoom; native browser zoom was not certified.

Earlier three-locale production root/subpath builds and HTTP checks passed, as did
five-locale preview home-language/RTL checks, Storybook and 44/44 token contrast
checks. These are historical regression evidence, not certification of the final
German production candidate. Content validation still reports 0 errors and
0 publication errors, with 10 existing stale-translation warnings and 1 unused-media
information finding retained.

The full-corpus Vitest run passed 56 files and 495 tests; a subsequent German
highlighting check adds one passing test. TypeScript and focused ESLint pass.
The regenerated preview passed 201 HTTP checks and all 132 German browser cases
across Chromium, Firefox and WebKit (126 initial passes, six browsing-flow passes
after correcting test assumptions about popup navigation and saved-button labels).
All nine explicit rendered umlaut/transliterated/decomposed highlighting checks
pass. The multilingual run passed 202 checks, skipped four Chromium-only IME
cases, and one Firefox navigation timeout passed on isolated rerun. These
working-tree checks include the user's pre-existing source edits; the eventual
production candidate must be isolated.

## Production candidate acceptance

Candidate `2450f6fdafb6df4c84cf8edcfc5d6cbcd9ab3d3d` was prepared on
`codex/german-production-candidate`, separate from the automatic deployment branch.
It differs from search/content commit `a66244882a690a37769a296eb5c3966588ea29e5`
only by `de.enabled: true`. The isolated checkouts exclude the user's uncommitted
source edits. Both German and Japanese remain strict ready: 381/381 current,
indexable targets and 2,220/2,220 current fields.

Root and `/prompt-seen` production artifacts were built from that same candidate.
The root full suite accepted 1,221 HTTP/browser tests with 71 existing conditional
skips; subpath HTTP, German, layout, search and navigation acceptance passed 536
with 30 conditional skips. Chromium, Firefox and WebKit cover all four widths,
both themes, actual German Worker queries and highlighting, popup/favorites,
copy/download consistency, keyboard use, metadata/output sets and axe.

The initial concurrently running suites timed out on seven root and two subpath
cases. All passed in subsequent one-worker runs with unchanged code; the subpath
rerun also checked both scenarios in both affected browsers. These are recorded
as reruns, not hidden initial passes. Existing preview CJK/Arabic coverage is
historical working-tree evidence from build `f85b29e611f1`; the release CI rebuilds
its preview matrix from the release commit.

Native Chromium zoom used `chrome.tabs.setZoom(tabId, 2)`, confirmed by the browser
zoom API and 720 CSS-pixel layout viewport. Twelve page/theme combinations at each
base path passed layout, keyboard and axe checks. Firefox and WebKit additionally
passed the equivalent 720 CSS-pixel reflow checks; those are not labelled native
browser zoom measurements.

`production-acceptance.json` retains the same-configuration production comparison,
strict counts and native-zoom results. Adding German increased output from 13,384
to 16,858 files and HTML from 134,081,216 to 181,737,451 bytes. German's compressed
search index is 228,043 bytes. English first-load gzip JavaScript changed by one
byte on home, Prompt list and template detail; all measured English/German pages
requested six fonts. Existing first-load budget exceptions remain unchanged.
Ordinary-page lazy search behavior passed browser acceptance. Local build timings
are descriptive single runs with different cache warmth, not a speed claim.

Final isolated unit verification passed all 56 files and 496 tests. One corpus
query test initially timed out rebuilding indexes; its fixture now caches engines
by locale/page flags and warms them before assertions. All assertions are retained.
TypeScript, ESLint and repository formatting checks passed. Standards and spec
reviews have no remaining actionable findings. Earlier 44/44 token contrast and
Storybook checks remain applicable; release CI repeats them on the release commit.

## Release procedure and rollback

Release `b1e181d87d67ad97fae6779fff4a574757de1855` was rebuilt and passed
225 checks (one conditional skip) at each production base path, then pushed.
Its CI run [42971016324](https://github.com/picontapLab/prompt-seen/actions/runs/42971016324)
failed before deployment. The production gate correctly retained the previous live
version; that release is not a successful deployment.

The preview matrix exposed inherited Arabic fonts on English fallback labels.
Language boundaries now resolve their own text stack while native language links
keep their existing face; search taxonomy and aspect-ratio labels explicitly retain
their mono role. Browser regressions reproduced the original fallback defect and
the mono-role regression before the corrections. Preview Markdown assertions now
require absent alternates and 404 responses, consistent with non-indexable output.
Japanese search waits for the cold Worker result summary before unchanged ranking
assertions; the foreign-history popup close allows the full gallery route load.
Both waits remain bounded at 15 seconds and retain all behavior assertions.

The corrected preview passed 117 targeted tests across Chromium, Firefox and
WebKit, then 320 broader layout, mixed-font and actual German checks with 13 existing
conditional skips. This includes five languages, four widths and both themes.
Standards and spec re-reviews found no remaining actionable issues in these fixes.

Rebuild the superseding commit at root and subpath with its full SHA as BUILD_ID,
and rerun HTTP and German browser acceptance before updating the automatic
deployment branch. Production must deploy that exact verified commit; CI and the
deployment workflow retain every publication gate and live check.

Immediately before release, both the canonical site's build endpoint and the
immutable previous deployment served `5bdd4e7392d89d22a638761b6898e65903fa3bf1`.
The rollback artifact is https://f5ad7f21.prompt-seen-dkj.pages.dev; the existing
Rollback workflow can select that commit. A rollback must also address the enabling
commit on the deployment branch, as described in `docs/operations.md`.

P7 is complete only after the release workflow and independent canonical
`check:live --expect-build` pass. Keep the final deployment receipt with the local
release artifacts and workflow run, rather than altering the already accepted
release commit to insert its own hash.
