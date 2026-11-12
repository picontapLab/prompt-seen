# Portuguese translation and independent review

AI translation was split into three disjoint groups (143, 142, 96 pages). Review rotated to a different agent for each group: group 1 authored by translate_a and reviewed by translate_b; group 2 authored by translate_b and reviewed by translate_c; group 3 authored by translate_c and reviewed by translate_a. UI was authored by root and independently reviewed by translate_a. No human or native-speaker review is claimed.

All page prose, non-media fields and UI source/target pairs were read. Reviewers corrected the target texts before producing exact-hash approval records. Unchanged technical terms and proper nouns retain field-specific reasons. Import and promotion revalidate the actual candidate hashes, dependencies and all enabled-language gates.

## Evidence

- [UI and glossary](ui-review-evidence.md)
- Text: [group 1](review-evidence-1.md), [group 2](review-evidence-2.md), [group 3](review-evidence-3.md)
- Actual media: [group 1](media-review-evidence-1.md), [group 2](media-review-evidence-2.md), [group 3](media-review-evidence-3.md)
- [Source corrections](source-media-corrections.md)
- [Sequential import/promotion results](batch-results.jsonl)

All 363 media assets were inspected using contact sheets and selected full originals. All 38 GIF assets were decoded into their complete frame sequences and checked with timing/loop metadata. These are visual frame reviews, not claims of real-time browser playback. Browser checks are reported separately in acceptance.md. Scratch source paths in the detailed review logs identify the exact authoring inputs; retained batches and reviews.json hold the reproducible imported translations and approvals.

## Focused translation corrections — 2026-11-11 (America/Los_Angeles)

AI Codex corrected and then separately checked two complete source/target pairs against their original assets: `x_244#notes` now uses `leque` for the folding hand fan visible in `a_323`; `x_155#notes` now describes the tables and upholstered bench seating visible in `a_212`. This was an AI correction and quality-review pass by the same agent, not independent human/native-speaker approval. Existing source text, other language fields and all generation facts were verified unchanged.

The retained batch is `batches/review-corrections-2026-11-11.json`, ID `0e74fe0c7c7962555a690e5503f51b603bc00d3380729fde1b384bd727dc4753`. It passed import dry-run, pending import and guarded promotion. The two new exact-hash approvals append to `reviews.json`, preserving the superseded reviews. A fresh strict Portuguese check passed: 381/381 pages, 2220/2220 fields, no fallback, ready=true. Historical browser acceptance predates these prose corrections; this entry does not claim a new deployment or browser matrix.
