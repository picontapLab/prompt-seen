# Spanish implementation status

Baseline: `ec6051f3ac7c0c066930eb49bc64d44dc619255c` plus the pre-existing working tree. Language: universal `es`; complete/fingerprint/source-only. Production remains disabled. The user requested staged commits with continued implementation.

| Stage | Status                | Evidence / remaining work                                                                                                                                                                                                                                               |
| ----- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0    | Implemented           | Scope v2 and batch plan cover the dynamic target and field sets; current German status documented; original general-spec baseline marked historical.                                                                                                                    |
| P1    | Complete              | 14 namespaces, 427 messages, two pages, 34 taxonomy fields, glossary/style guide reviewed; B0 promoted with 463 real approvals; preview enabled; subpath preview build passed and foundation pages passed 24 Chromium/Firefox/WebKit checks (four widths × two themes). |
| P2    | Pending               | 30 pilot units; 27 standalone units must become current; aggregate drafts wait for their members.                                                                                                                                                                       |
| P3    | Pending               | Remaining templates, prompts, aggregates and dependencies need translation and actual review.                                                                                                                                                                           |
| P4    | Partially implemented | Spanish ñ distinction, accent folding, aliases, original-word ranking and photography boundary pass serialized-engine fixtures. Analyzer version 3 shared with emitter. Full corpus recall and browser evidence pending.                                                |
| P5    | Pending               | Full preview/browser acceptance and performance evidence.                                                                                                                                                                                                               |
| P6    | Pending               | Isolated enabled candidate and three build configurations.                                                                                                                                                                                                              |
| P7    | Pending               | Deployment, live checks and rollback evidence.                                                                                                                                                                                                                          |

All 32 search queries are frozen in `search-cases.json`. Fixture tests do not certify those corpus scenarios. Missing Spanish library descriptions continue to be counted as missing; preview fallback is not translation completion.

Stage checks: subpath preview build passed (six built locales, production Spanish still disabled); all 24 foundation browser checks passed, including layout, serious/critical axe findings and uncaught page errors on About/License. The 32 frozen German corpus queries passed. These checks do not cover Spanish library interactions or full search acceptance.

Initial checks: 43 focused tokenizer/serialized-engine/Worker/highlighting tests passed. `node --import tsx scripts/config-gen.ts` and `npx tsc --noEmit` passed. The npm typecheck wrapper initially failed because the sandbox disallowed the tsx CLI IPC socket; the direct Node loader executes the same configuration generator without that socket. No runtime workaround was added.

Existing unrelated Prompt/example/model annotation and other language-spec work remains outside the staged implementation commits. Scope fingerprints capture actual source text independently of commit identity. Candidate validation must bind all final inputs to one actual release commit.

The first preview build encountered a concurrently edited deployment-hook test with missing ProcessEnv.NODE_ENV. That other work updated its fixtures; no deployment files were changed here, and the repeated build passed.
