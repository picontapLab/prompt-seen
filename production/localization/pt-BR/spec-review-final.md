## Final Spec review

Reviewed fixed application/content diff `0306b74b66ab9bf1f76eb5061bc466c3ebf86325...b8e0e7e392ff8fd259a8ef91aa40817de35bca75`, plus the separately reviewed validation-only correction in `tests/e2e/portuguese.http.spec.ts`. Source: `docs/portuguese-localization-spec.md`. The reported artifacts retain their actual b8 buildId; the later validation-only commit is not represented as a newly tested artifact.

### Code findings closed

- Ordered tokenization preserves repeated words in genuine Portuguese phrases; model/template exclusions remain, analyzer version is 5, and RED/GREEN regression evidence was inspected.
- Clipboard-failure acceptance exercises both rejected APIs, actual Portuguese guidance, exact original-text selection and dismissal/focus restoration without browser-specific skips.
- Measured Portuguese/Spanish ICU initial-case differences are normalized without changing proper-name suffixes or other-language grammar. All four actual Prompt source languages and Spanish are covered.
- The preview sitemap test now correctly expects every per-language sitemap to return 404 and the actual HTTP-200 root sitemap to have no locations. This matches `indexableLocales`, static-export placeholder removal and existing SEO tests; production exact-set, empty llms and Markdown-404 checks remain. It fixes an incorrect test expectation, not a product defect.

No remaining actionable Spec product-code finding. Narrow thumbnail/contrast fixes retain their offending-state regressions. Content preservation remains applicable: 381 units, 2,220 fields, 2,601 approvals; original bodies and media unchanged.

### Runtime evidence and limits

Full serial units pass: **61 files / 556 tests, 188.59 seconds**. Final typecheck/lint/format/tokens/Storybook pass; content validation has zero errors/publish errors and ten existing warnings.

The inspected final-preview report records **1,724 unique passes, 56 capability/mode skips, zero unresolved; Portuguese 165 passes, zero skips**. It retains the first invocation's two failures/two flaky cases, a serial follow-up with 12 passes/one failure, and a formal native test run of nine repeated passes with zero actual retries.

**The Firefox native-tab root cause is not proven.** Later serial failure disproves foreground selection as a sufficient fix. Protocol evidence shows the public page event can await readiness; absence of that event does not establish absence of native tab creation. See [deep diagnosis](evidence/firefox-modified-click/deep-diagnosis.md). The formal rerun closes preview acceptance without erasing intermittency. Production root also completes with 1,501 successful cases (one flaky), 97 skips and Portuguese 165/0 skips; Firefox required one retry.

Final b8 Chromium native 200% zoom/font evidence passes; disabled/enabled English initial/idle JavaScript totals match at recorded precision. The template 206.2/261.3 KiB result retains the documented editor-budget exception. Production subpath also passes: 1,501 expected cases, 97 skips, zero flaky/unresolved; Portuguese 165/0 skips. **All three local technical matrices are complete. P5 still requires a verified pre-release rollback target.** **P6 is not deployed**, and no verified Cloudflare rollback deployment ID is recorded.
