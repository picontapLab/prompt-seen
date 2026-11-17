# Independent Arabic linguistic review (AI)

Reviewer: Codex subagent `/root/arabic_acceptance` (AI, not a human/native-speaker sign-off).

Completed textual review: 2026-11-17T14:55:59.894445+00:00.

Scope: all 427 UI message leaves across 14 namespaces, compared individually with their English counterparts; both A0 page candidates compared with `content/pages/{about,license}/locales/en.mdx`; all 34 A0 taxonomy operations compared with report source values and the Arabic glossary/style guide. The first message read was truncated in the middle; messages 175–280 were explicitly reread before completing this review.

Corrections applied:

- `home.hero.label` incorrectly added “this week” to “Featured frame”; the label now means “selected frame”, while the eyebrow retains the source's weekly qualifier.
- `home.more.all` lost the “All” action in zero/one/two forms. It now preserves the action with a grammatical six-category count in parentheses.
- `home.description` and `home.hero.intro` now distinguish advertising posters from stickers, per glossary.
- `feed.status.shown` used awkward agreement; replaced with a neutral “Displayed frames: …” label.
- `shortcuts.singleHelp` had mismatched agreement; the rewritten clause preserves the complete shortcut behavior.
- `pages.missing.goTo/home` now introduces the dynamic language name with “in the language”, avoiding an adjective assumption for arbitrary language names.
- About's “using a model, date and parameters” was overly literal: the candidate now says the model, date and parameters are recorded. Facts, counts, model name, limitations and licensing are unchanged.

The A0 taxonomy translations are semantically suitable. Existing conventional transliterations (بورتريه, باوهاوس, نيون, سومي إي) are retained, and aliases remain distinct from immutable technical identifiers. No source/English messages were modified.

This is a textual AI review only. It does not establish native-speaker, screen-reader, visual media, rendered layout, or full-corpus approval. No fingerprint approvals or production enablement were created. The modified About candidate requires re-import if a prior candidate has already been imported. Catalog test result is recorded below after execution.

Reviewed final file SHA-256 values (file bytes, evidence only; these are not localization review-schema field fingerprints):

- `production/localization/ar/a0-pages.json`: `afa299dda3d47d469773dac2e1f41e90032fbd20282e090098812ff631f33128`
- `production/localization/ar/a0-taxonomy.json`: `834592b9dd0c2e85e3c02ae513b2f31cd15da3e559ad01994ebe1ab0db0a58ac`
- `src/i18n/messages/ar/common.json`: `52177501aa029350ecd3e42062cb991bcb4937960cc8eb4d3351aa80c409371f`
- `src/i18n/messages/ar/detail.json`: `e0f319453a2b106cf9b57c8c4b39f9625b0bc546e8ff3a38c3e2a0b1e73155fe`
- `src/i18n/messages/ar/explore.json`: `c3d0bdf7716beeb425e555c76cd962bb04592df06b834f42101a8b298fd802b5`
- `src/i18n/messages/ar/favorites.json`: `2b934777338645368bd8e0db500c6cd6c8b80d3c34faa025203884fbc0c5faf7`
- `src/i18n/messages/ar/feed.json`: `ca4e8444d9eddb5a7dd5bd5b693bd63ce1688008a4cf4d32a4e62dadccdef19b`
- `src/i18n/messages/ar/geo.json`: `49e2fd62bddee08b434ec1f7b7c47c4662bc2db17e99024ca97660a576da9222`
- `src/i18n/messages/ar/home.json`: `90ad599a2841e030a291f0e8b30dc5c26bcc128907e5ca0f2b2bc848d34d47db`
- `src/i18n/messages/ar/pages.json`: `05bd496a868f7a141d7f5127b9f7443226d1360fb0630fb9925769d21eadfca3`
- `src/i18n/messages/ar/popup.json`: `3df66c63c3105dfccdcbe8cf521a063343a6d9c1bb91a5f000ca1b064b001eba`
- `src/i18n/messages/ar/primitives.json`: `974ab1eb12931f0521422f1c0d6400a9587b39363302041a1ab12f16caae6e36`
- `src/i18n/messages/ar/search.json`: `e4978c931099680e4d1c32f746aa5a0ccee0d9e1baafb20167c1afe7168597a2`
- `src/i18n/messages/ar/shell.json`: `b215e68acbd475856c2099bd57a5c1dde514a3a39c7168be486eece7289f7aca`
- `src/i18n/messages/ar/shortcuts.json`: `69375a13d94d8aba576d43e344d5028e5c1c946f74669d661db464d7347c2522`
- `src/i18n/messages/ar/templates.json`: `2b6d34b1315e6492df12fbfe3ca71c9cdba39a0bf02a652bd9c87accd1905ea6`


Catalog validation: `npx vitest run src/i18n/catalog.test.ts` — 14 tests passed.

## A2 early pages and dependencies

Translated and textually reviewed 146 actual scope pages p_001–p_150, 750 non-A0 shared fields (262 unique source strings), and visually inspected all 178 dependency media assets. Thirty taxonomy dependencies were excluded because A0 owns them. Source selection follows `/tmp/arabic-complete-report.json`, including the actual zh-Hans sources; no Prompt bodies or template values were translated. Exact repeated source segments reuse reviewed translations; unknown segments fail generation instead of receiving generic prose. Full links, heading counts and list item counts were independently compared after generation. No bidi controls were introduced.

All 178 media thumbnails were opened as nine labelled contact sheets; a_111, a_128 and a_146 were additionally inspected at detail size to resolve the circular background, leaf count and clipped semicircle. They agree with the source descriptions. Actual file hashes and view scope are in `subagent-media-evidence.json`.

`subagent-language-decisions.json` contains 1359 exact source-key/candidate decisions, including UI and A0. It deliberately stores the actual translation rather than fabricating target fingerprints; the main agent must derive targetHash with the repository fingerprint implementation from the final imported candidates and reject stale source/target combinations. These are AI approvals within the documented textual/visual scope, not blanket first-release acceptance. Pending keys within this inspected scope: none. Human/native-speaker and screen-reader gates remain pending separately.
