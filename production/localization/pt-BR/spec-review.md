## Spec review

Reviewed fixed diff `git diff 0306b74b66ab9bf1f76eb5061bc466c3ebf86325...88701511f2fa653cb4cdafb773a222a6bb80fd7b` (commit `88701511 feat(i18n): prepare fully reviewed Brazilian Portuguese candidate`), read-only.

### Implementation defect

- **[P2] Repeated words break Portuguese phrase aliases.** Spec `docs/portuguese-localization-spec.md:220–222` requires `fotografia de produto / foto de produto / packshot` and source-grounded phrase expansion. `src/modules/search/profiles.ts:130–136` constructs the phrase string with `queryTerms`, which removes repeated tokens (`src/modules/search/tokenize.ts:130–133`). Consequently, an earlier `de` removes the `de` inside a later genuine phrase. Read-only reproduction: `Fotografia de produto em estúdio.` produces a `packshot` hit; `Guia de iluminação. Fotografia de produto em estúdio.` produces none, despite containing the identical phrase. Build phrase matching from ordered, non-deduplicated normalized tokens; add this regression. This is an actual retrieval defect, independent of pending browser evidence.

### Missing / partial acceptance

- **[P2] Portuguese clipboard-failure behavior lacks an acceptance case.** Spec `docs/portuguese-localization-spec.md:244` explicitly requires “复制失败状态必须使用真实葡语字典”. The Portuguese template and popup tests (`tests/e2e/portuguese.browser.spec.ts:177–180,208–211`) only grant clipboard permissions and assert success, and do not trigger denial/manual-copy fallback. Add a real Portuguese failure-path browser assertion for its localized message and recovery. This is a verification gap, not a demonstrated product failure.

- **Pending delivery evidence, not additional code defects:** spec `:327–356` requires the same-commit root/subpath/preview matrix, three browsers, native zoom, performance comparison and rollback identification; the fixed commit’s `production/localization/pt-BR/acceptance.md:29–35` explicitly leaves these in progress. Parent reports root production and serial unit reruns now pass; the ongoing results must be appended before P5 acceptance. P6 deployment/live verification remains outstanding under spec `:301,305,362–371`; do not describe the candidate as a completed launch.

### Scope

No unjustified scope expansion found. The three corrected inherited image descriptions are documented, narrowly reviewed exceptions. Independent preservation audit confirms 381 content targets, 2,220 current fields and 2,601 matching approvals; all 601 original Prompt/template bodies and 2,377 media files are unchanged.
