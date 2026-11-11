# Localization implementation status

Recorded 2026-11-11 UTC. German content is complete and strict ready. Production
candidate acceptance and deployment remain outstanding; `de.preview: true` and
`de.enabled: false` are intentional at this stage.

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

## Remaining acceptance and release

P6 requires an isolated commit/workspace with `de.enabled: true`, complete root and
`/prompt-seen` production builds, source and HTTP/SEO/output-set checks, actual German
Worker search, full browser/axe coverage, keyboard and 200% zoom acceptance, plus
comparable build time, file/byte counts, gzip search sizes, first-load JS and font
requests with and without German. Existing CJK and Arabic RTL behavior must pass.

P7 has not started. No enabling production commit, push, deployment or live
verification has been performed. Deploy the same fully accepted commit, verify its
build ID with `check:live`, and retain the previous successful deployment for rollback.
Preview artifacts and disabled-German production builds do not replace these steps.
