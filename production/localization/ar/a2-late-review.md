# Late Arabic prompt batch: AI review

Reviewer: `codex-subagent/arabic_content_late` (AI, not a human/native-speaker sign-off).

The candidate contains 139 prompt pages (`p_151` onward, only the keys in the frozen scope) and 763 shared-field operations. Every complete source body was read and translated; exact repeated source paragraphs share translations, while observed results, limitations and provenance remain specific to each entry. Source-only Prompt bodies, submitted values and assets were not changed. Fourteen taxonomy dependencies belong to A0 and are excluded. Shared dependencies with other batches require the coordinator's exact-key deduplication.

`a2-late-reviews.json` records the final source and target hashes for all 902 approved editorial operations. `a2-late-media-evidence.json` records the inspected assets and contact-sheet hashes. There are no pending editorial keys in this assigned batch. These records do not approve human language acceptance, screen-reader interaction, deployment, or other batches.

## Checks actually completed

- Parsed both candidate files with the repository's `batchSchema`.
- Checked all 139 bodies retain ordered Markdown link destinations, including source evidence URLs and internal references.
- Checked every page and field retains its source `R` reference identifiers, media IDs and version identifiers; checked page bodies for hidden bidi controls.
- Compared all 184 local dependency media previews against their translated descriptions in eight labelled contact sheets. No asset was missing.
- Extracted and inspected every encoded frame of the 38 dependency GIFs in eight further labelled sheets. Frame counts and delays are recorded. The coarse poses, drift, approximate geometry and composed-animation qualifications are retained.
- Opened original-size assets `a_325`, `a_326`, `a_328`, `a_329`, `a_370`, `a_371` for dense-text/count verification. The 24-line layout matches its reference; the 10×10 technology grid, four exercise panels, cellular compartments, and 2026/2027/2028 bars of 10/14/19 are visible. Scientific/fitness/market material remains explicitly illustrative, not validated instruction or data.
- Corrected otter noun/verb agreement in `p_208`, `x_268` notes and `a_357` alt; distinguished the Christmas card from birthday cards.

## Independent cross-review corrections

The coordinator's independent cross-review found two substantive translation-generation errors. Both are fixed in the final candidates and the review hashes bind the corrected values:

1. A reference-ID extractor matched `image(s)` instead of the later `(R...)`. Restored the exact reference IDs in both page instructions and `inputRequirements.instructions` for `p_273`, `p_286`, `p_287`, `p_292`, `p_297`, `p_298`, `p_299`, `p_300`, `p_301`, `p_302`, `p_303`, `p_304`, `p_305`, `p_306`, `p_307`, `p_308`, `p_309`, `p_311`. The two-reference order `R08, R08-side` remains unchanged.
2. `p_242` has its own source tail about the author's Chinese text and the earlier independently adapted cat case. Restored that distinction and removed the incorrectly reused model-comparison sentence from `p_236`.

Also corrected the Arabic number agreement for the twelve cat views in `p_296` and its repeated run note, and verb agreement for the twelve staff orientations. All 11 author-source paragraphs were inspected for distinct trailing clauses; only `p_236` and `p_242` have such clauses, now independently translated.

## Limits

Visual inspection verifies the content represented in these local files; it does not establish the historical provider/version claims independently. Statements about earlier generation/review remain attributed translations of the recorded source. No new provider run, audio playback, real screen reader, browser interaction or human language review was performed by this subagent. Keep the separate release gates explicit.
