# Standards review

Initial fixed diff: `git diff 0306b74b66ab9bf1f76eb5061bc466c3ebf86325...88701511f2fa653cb4cdafb773a222a6bb80fd7b`.
Commit: `88701511 feat(i18n): prepare fully reviewed Brazilian Portuguese candidate`.
Follow-up: read-only `git diff 88701511` of the 11 uncommitted code/test files, 2026-11-11.

**Hard violations: none found. Actionable runtime smells: none. One nonblocking test-isolation recommendation below.**

Sources: `CONTRIBUTING.md`, `docs/engineering-conventions.md`, `AGENTS.md`, `docs/localization-workflow.md`, design §§8.4–8.6 and 13, installed Next Playwright guide.

Initial review covered changed runtime search code, tests, registry and documentation; sampled content and checked independent preservation/review evidence. It did not repeat every translation/asset review. Search remains in its existing owner with shared analyzer versions; messages stay in feature catalogs; full fingerprint/source-only policy and explicitly AI review records follow the localization workflow. Per-feature/per-owner locale files are prescribed extension points, not actionable Shotgun Surgery. Formatting enforced by tools was excluded.

Follow-up findings:

- `Detail.module.css:264` adds `flex-wrap: wrap` at the actual nowrap reference-thumbnail list. This matches the independently reproduced min-content cause: 365px document overflow becomes 360px without image distortion or clipping.
- `QuickSearch.module.css:139` scopes `--mark: var(--text-primary)` to focused/hovered options. Existing tokens replace the failing 4.46:1 pair; independent transient-CSS axe probes passed light and dark. No global brand token changed.
- `profiles.ts:130` uses `tokenize`, preserving repeated source words; the new regression includes earlier `de`/`modelo` occurrences. Analyzer version 5 correctly invalidates old indexes (Engineering conventions → Search).
- Literal `nativeName` locators avoid treating `(Brasil)` as regex syntax while retaining substring matching for options that append a translated description.

**Judgment call, test coverage:** `tests/e2e/portuguese.browser.spec.ts:254–260` hovers the option before ArrowDown and leaves the pointer there. The subsequent keyboard axe check may still receive the hover rule, masking a future missing focus rule. Move the pointer away and assert `data-hovered` cleared before ArrowDown; the second reopen can remain keyboard-only instead of repeating hover. This strengthens the actual-control regression required by Engineering conventions → Tests; it is not a current CSS failure.

No repository edits or gen/build were run. Ongoing final acceptance is not a standards violation, and this report does not certify the rebuilt/deployed artifact.
