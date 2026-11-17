# pages_b semantic review evidence

Reviewer: AI Codex subagent review_pages_b

Completed: 2026-11-17T15:24:28.719Z

Compared all 150 assigned page objects against their supplied canonical source, including collections and recommendation reasons, standalone pages, prompts after p_235, templates and topics. Read all 658 distinct source/target text pairs; identical pairs were deduplicated with every owning field retained. Coverage includes titles, descriptions, bodies and available SEO fields.

Corrected 147 unique text pairs across 107 page objects. Full corrected objects are in pages_b-overrides.json. The 150 review records fingerprint the final corrected objects with the repository proseFingerprint function.

Key corrections:

- Removed the unsupported Image 2.6 versus Nano Banana comparison from p_236's title.
- Repaired c_016's misplaced sentence and preserved its eight source poses/nine encoded frames distinction.
- Restored c_013's independent/native-GIF distinction and tested-versus-approved wording.
- Removed unsupported details from collection reasons and template descriptions, including ears, aprons, candles, isometric layouts, patent claims and extra style constraints.
- Restored specific subjects omitted or altered in template titles (Lisbon, MELT, tea, pumpkin soup, ESC, otter school context); removed inherited unrelated title claims.
- Preserved original submitted prompt language, quoted generated lettering (including Simplified Chinese), source attribution URLs, unknown model-version limits, historical frame counts, playback counts and adaptation limitations.
- Replaced edition-specific bilingual wording with wording applicable to all language editions, and normalized editorial terms such as 訊息、呼叫、按讚、執行 and 身分.

Verification: all original Markdown link destinations in page bodies remain unchanged. Original content files, batch files and source prompts were not edited by this reviewer.

Scope: this approval covers semantic translation of the supplied text. Historical source statements about image/GIF checks remain translated source claims; this reviewer did not inspect media assets or claim a new media acceptance. The parent agent performs media and integration checks separately.

## Independent search and browser coverage review

Reviewed the Traditional Chinese alias profile, locale dispatch, Worker request/cache contract, fixture unit tests, frozen corpus test semantics, CJK font registration and existing browser coverage. No concrete search implementation defect was identified. Existing browser coverage exercised only the synthetic vocabulary fixture, leaving the frozen real corpus-to-packaged-index-to-bundled-Worker path untested.

Updated only `tests/e2e/traditional-chinese.browser.spec.ts` for this follow-up:

- Reused the same bundled Worker helper for the synthetic fixture and the frozen real search cases. Real corpus requests use the packaged index URL without interception.
- Positive cases enforce each group's frozen top-K; excluded keys are checked against every returned hit, and explicit total counts are asserted.
- Added 390px and 1280px checks on home, search and template pages for layout problems, the Traditional Chinese document language, Noto Sans TC heading stack and TC font-file requests, without downloading other CJK script fonts.
- Kept existing shared font quotation-range and language-stack tests in place rather than duplicating them.

Verification completed: Prettier and ESLint on the edited browser spec; `vitest run src/modules/search/traditional-chinese.test.ts` passed all 19 tests. Browser execution is intentionally pending the parent agent's promotion and artifact build: the current artifact still excludes zh-Hant. No build was run by this reviewer and no frozen cases or implementation files were changed.

## Follow-up review: pure-kind query ranking

Independently reviewed the subsequent `run()` comparator in `src/modules/search/engine.ts`, `traditionalChineseKindQuery`, its new regression test and the documented spec addendum. Approved: no actionable correctness issue found. Exact NFKC/trim/case-normalized registered kind labels trigger the rule only for `zh-Hant`. The comparator partitions matching-kind hits first, sorts that partition by stable ID, and returns zero among every other pair; it is transitive and stable, rather than mixing ID and score comparisons. Existing per-kind presentation then preserves the order of other groups, all matches, original scores/highlights and total counts. Compound and partial queries retain relevance ordering; no content ID is special-cased.

The added regression covers non-ID insertion order, unequal alias lengths, matching-kind limit, a retained prompt hit, compound queries, a non-zh-Hant locale and full-width/case normalization. Independently reran `vitest run src/modules/search/traditional-chinese.test.ts`: 20/20 passed. This review did not independently rerun the parent's reported 27 frozen-corpus checks or build. The quick-search composition browser test now navigates home before opening the launcher, matching the product's search-page focus behavior; that correction is appropriate.
