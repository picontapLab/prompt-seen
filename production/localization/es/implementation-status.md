# Spanish implementation status

Baseline: `ec6051f3ac7c0c066930eb49bc64d44dc619255c` plus the pre-existing working tree. Language: universal `es`; complete/fingerprint/source-only. Spanish is enabled only on the isolated production candidate; live release remains pending. The user requested staged commits with continued implementation, then limited delivery to local commits; pushing and deployment are outside the final scope.

| Stage | Status | Evidence / remaining work |
| --- | --- | --- |
| P0 | Complete | Dynamic scope and batch plan cover all current targets and fields. |
| P1 | Complete | Reviewed UI, independent pages and taxonomy; preview enabled. |
| P2 | Complete | Pilot accepted; dependent aggregates were subsequently promoted in B4. |
| P3 | Complete | All targets and fields current; actual text/media evidence saved; strict gate passes. |
| P4 | Complete | Analyzer v3, character/alias fixtures and all 32 real-corpus queries pass reloaded engine and three browser Workers. |
| P5 | Complete | Expanded width/theme interactions, layout/axe, original Prompt, shared regressions and native Chromium 200% zoom. See evidence/preview-acceptance.json for first-run failures and isolated reruns. |
| P6 | Local validation recorded; not release-certified | Three configurations, performance, full suites and Pages checks saved. Default Firefox background-tab case remains a documented local environment limitation; alternate-profile validation passed. Remote CI is deferred by the local-commit-only instruction. |
| P7 | Deferred by user | Local commits only; no push or production deployment. Live checks and rollback remain a future release gate. |


All 32 search queries are frozen in `search-cases.json` and now required even in preview. Missing descriptions remain missing; preview fallback is never translation completion.

Stage checks: subpath preview build passed (six built locales, production Spanish still disabled); all 24 foundation browser checks passed, including layout, serious/critical axe findings and uncaught page errors on About/License. The 32 frozen German corpus queries passed. These checks do not cover Spanish library interactions or full search acceptance.

Initial checks: 43 focused tokenizer/serialized-engine/Worker/highlighting tests passed. `node --import tsx scripts/config-gen.ts` and `npx tsc --noEmit` passed. The npm typecheck wrapper initially failed because the sandbox disallowed the tsx CLI IPC socket; the direct Node loader executes the same configuration generator without that socket. No runtime workaround was added.

Existing unrelated Prompt/example/model annotation and other language-spec work remains outside the staged implementation commits. Scope fingerprints capture actual source text independently of commit identity. Candidate validation must bind all final inputs to one actual release commit.

The first preview build encountered a concurrently edited deployment-hook test with missing ProcessEnv.NODE_ENV. That other work updated its fixtures; no deployment files were changed here, and the repeated build passed.

P2: 20 Prompt pages and five templates promoted with 235 dependency fields; three aggregate drafts remain intentionally unpromoted. Serialized real-corpus cases for current targets pass. Browser acceptance covers layout, theme, accessibility, template editing/copy/download, favorites, popup and real Worker search. WebKit exposed a server/client Intl.DisplayNames casing difference (inglés/Inglés); Spanish language names now consistently begin lowercase, and all 96 pilot browser checks pass after the fix. Equivalent 200% reflow was checked; native zoom remains a P5 gate.

B2: all 75 templates are current. The remaining 70 pages and 410 fields were promoted after actual text review and inspection of 87 new original assets (three unchanged-hash assets reused from B1). Current coverage: 97/381 pages and 1,106/2,220 fields. B3 candidates cover 265 remaining Prompt pages with distinct dependency ownership; textual review is complete and visual review continues. B4 textual review covers all 19 aggregate pages and 112 member reasons; promotion waits for members.

P3 completed: all 381 dynamic targets and 2,220 fields are current; missing/draft/unreviewed/outdated/invalid are zero, ready=true and blocking=false. B4 promoted only after all members and dependencies were current. All media descriptions have actual inspection evidence; GIFs were checked frame by frame. Production is still disabled pending P5–P7.

ES12 implementation: the old language-suggestion component was only mounted in Storybook. The existing on-demand language menu now reuses suggestLanguage and one already-reviewed server-formatted label. Four Spanish regional preferences passed 24 phone/desktop checks across three browsers, with no automatic redirect. Firefox needed the nested options animation to settle before a test click; twelve repeated mobile checks and the final complete matrix passed.

P5 completed in isolated worktree `codex/spanish-release` because concurrent work replaced the shared build artifact. Two reproduced shared UI defects were fixed: mobile filter tools now shrink so Spanish sorting text wraps without horizontal overflow; light amber frame numbers now pass 4.55:1 on hovered search rows (formerly 4.46:1), with a supplementary token pair and an explicit hover regression. The first targeted run had 384 passes, two existing Chromium-only IME skips and seven timeouts; all seven passed single-worker reruns. The additional Spanish filter/sort matrix passed 24/24. Native Chromium zoom used chrome.tabs.setZoom(2), verified 1440/DPR1 → 720/DPR2, and passed eight page/theme checks. Source Prompt text, template values and user-data logic were not changed.

Release preparation observed public/main 9f4cc714 as the then-live deployment and contains private artifact customization. P6 must retain that commit. The default GitHub CLI identity is read-only, but the existing public SSH remote passed a push dry-run; the normal public main CI/Deploy workflow is the available publication route. No remote write has occurred.

Historical withdrawn packaging prototype: the five-language raw export has 20,332 files, above the Pages Free limit. All 2,012 full RSC copies match their sibling index payloads. Pages 200 proxy rules preserve those URLs while upload preparation removes the duplicates only after checking the final private-hook output. Root prototype: all 2,012 URLs byte-equal/200, unknown404, 51 browser interactions passed and three existing missing-language checks skipped for absent production fixtures. Prepared count is 18,327 before the private hook's additional files. Fault probes retain all copies on any contract failure. See evidence/packaging-acceptance.json; these withdrawn proxy checks do not certify the final static export; current local checks appear below and live platform checks remain deferred.

The first enabled-candidate unit run had 513 passes and four failures: one stale expected numeric contrast ratio after the token adjustment, plus three timeouts. The expected ratios and authoritative paragraph are now updated; all four files passed a serial rerun (57 tests). This failed attempt remains archived; the final c73a2c9f suite subsequently passed all 59 files / 517 tests (below).

Final scope clarification: the owner confirmed a paid Pages plan and requested local commits only. The Free-tier payload compaction was withdrawn; the complete Next.js export and existing private deployment hook are retained. Historical prototype evidence is marked withdrawn. Candidate 72c724a0 passed 516/517 unit tests; the queue integration check exceeded its incidental five-second timeout. The three previously reproduced corpus/CLI timeout cases now receive scoped limits (20–30 seconds), retaining every behavior assertion and all other defaults. These changes were revalidated in the final candidate below.

Candidate d046f4c4: the full unit suite passed 516/517; the stable-ID search fixture exceeded its existing 15-second limit twice. A phase-timing probe measured 13.778 seconds loading/validating the real multilingual corpus, 0.908 seconds creating/serializing/reloading the English index, and 0.004 seconds for all three queries/assertions. Corpus preparation now runs in a scoped 30-second beforeAll; the original query test, corpus and assertions remain unchanged. This separates fixture preparation from the existing search check rather than claiming a query-performance fix.

## Final local delivery

Tested implementation commit: `c73a2c9fc565f1faf38e16690c13050f29fae74f`. The later audit commit changes documentation/evidence only; it does not claim to have built or deployed its own SHA. No push, remote CI or production deployment was performed, per the user’s final instruction.

The final candidate passed strict es/ja/de, all-locale evaluation, content validation, types, lint, format, token contrast, all 59 unit-test files / 517 tests, and Storybook. Spanish remains 381/381 current/indexable targets and 2,220/2,220 current fields. Content validation retains ten existing Simplified Chinese warnings and one unused-media informational finding, with every message saved.

| Full local matrix | Passed | Flaky (retry passed) | Skipped | Failed in that run |
| --- | --- | --- | --- | --- |
| production / `/` | 1586 | 2 | 73 | 0 |
| production / `/prompt-seen` | 1583 | 4 | 73 | 1 |
| preview / `/prompt-seen` | 1685 | 3 | 54 | 0 |

Every configuration passed all 84 Spanish tests in each of three browsers, and all 174 Spanish critical-flow checks against its prepared Pages artifact. Root native Chromium 200% zoom passed eight page/theme checks. All complete RSC payload URLs were byte-checked; preview noindex headers were verified locally. Production HTTPS platform checks and private production-hook execution remain deferred.

The default-profile subpath Firefox modified-click case failed, including isolated repetitions. Plain native links reproduced the missing new-tab event independently of application code; Meta was present and defaultPrevented was false. Setting browser.tabs.loadInBackground=false restored Meta clicks in plain and gallery controls. Two unchanged test repetitions then passed, with one further click timeout at the default 30-second budget; three repetitions with that profile and an explicit 60-second local budget passed in 23.5, 9.1 and 6.7 seconds. The subsequent preview matrix used that Firefox preference; Chromium/WebKit settings and full-matrix test budgets stayed unchanged. This verifies the alternate foreground-tab behavior, not a fix for default background tabs or native middle-click recovery. Exact browser/automation root cause remains unconfirmed. All original failures, retries, configuration and commands are retained.

The full static export is preserved: the project owner confirmed paid Pages capacity, so the Free-plan compaction prototype remains withdrawn. Source Prompt bytes, template values, IDs and media are unchanged. See [production acceptance](production-acceptance.json) and its committed evidence directory for exact build identities, findings, browser versions, performance and limitations.
