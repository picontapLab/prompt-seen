# Final Standards review

Fixed diff: `git diff 0306b74b66ab9bf1f76eb5061bc466c3ebf86325...995d0d27dd6f352b9480aac8969d017c1e4c4462`.
Commits: `88701511` Portuguese candidate; `995d0d27` search/accessibility acceptance fixes.

**Result: no hard violations, no actionable runtime smells, no outstanding Standards recommendations. The earlier hover/focus isolation recommendation is closed.**

Sources: `CONTRIBUTING.md`, `docs/engineering-conventions.md`, `AGENTS.md`, `docs/localization-workflow.md`, design §§8.4–8.6 and 13, installed Next Playwright guide. This review builds on the initial fixed-diff review and checks the final committed follow-up. Content changes were sampled against independent preservation/review evidence; it does not repeat every language or asset review.

- `tests/e2e/portuguese.browser.spec.ts:257` now moves the pointer away and asserts `data-hovered` cleared before ArrowDown and the keyboard axe check. The reopened-panel flow also clears hover before keyboard activation. Both themes remain covered; no acceptance threshold was weakened.
- `Detail.module.css:264` wraps reference thumbnails at the actual min-content cause. `QuickSearch.module.css:139` uses the existing primary text token only for focused/hovered frame numbers. Both match independently reproduced causes and previously verified transient-CSS probes, without hiding overflow or changing global brand colors.
- `profiles.ts:130` preserves source token order/repetition through `tokenize`; the regression exercises repeated words, and analyzer version 5 prevents incompatible cached indexes (Engineering conventions → Search).
- Literal native-name locators correctly preserve `(Brasil)` and still accommodate additional accessible descriptions.
- `portuguese-policy.browser.spec.ts:49` injects refusal at both browser clipboard boundaries while exercising the actual copy control, original text selection, Portuguese recovery guidance, Escape/close-button dismissal and restored opener focus. It asserts both API attempts and selected text, rather than fabricating a successful copy. This follows the real-control testing conventions and localization workflow.

The initial catalog, source-only fingerprint policy, review identity and content preservation conclusions remain unchanged. Mandatory per-feature locale files are not actionable Shotgun Surgery. Tool-enforced formatting was excluded.

No repository files were changed and no gen/build was run. Final runtime acceptance is recorded separately by the main agent; this review does not certify the rebuilt artifact or deployment.
