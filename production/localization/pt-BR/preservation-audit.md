# Independent content preservation audit

Baseline: 0306b74b66ab9bf1f76eb5061bc466c3ebf86325. Audited worktree HEAD: 0306b74b66ab9bf1f76eb5061bc466c3ebf86325, including all current uncommitted content. Completed: 2026-11-11T12:42:33.135Z. Reviewer: AI Codex translate_c — independent preservation audit.

Result: PASS; 0 unexpected changes. Read-only audit; no gen/build/config writes.

## Byte preservation

Recomputed Git blob hashes for all 3612 baseline content files and all 2377 public/media files (774035072 bytes). All 601 original prompt.txt and template body.txt files are byte-identical. All original media bytes are unchanged. Other unchanged content files are byte-identical; changed YAML was compared structurally below, ignoring formatting only.

## Content semantics

844 existing YAML files changed; 381 new files are exactly the report's pt-BR explanatory-page targets. 1793 additions are exact report-approved pt-BR target paths. All pre-existing YAML fields, including actual parameters, sample/default values, enums, models, source links, run hashes, IDs and media metadata, compare equal except the documented corrections and Portuguese registry policy.

Allowed source corrections: content/media/a_269.yaml#alt.en, content/media/a_269.yaml#alt.zh-Hans, content/media/a_269.yaml#alt.ja, content/media/a_280.yaml#alt.en, content/media/a_280.yaml#alt.zh-Hans, content/media/a_280.yaml#alt.ja, content/media/a_282.yaml#alt.en, content/media/a_282.yaml#alt.zh-Hans, content/media/a_282.yaml#alt.ja. Existing-language review changes are confined to those three media keys in ja/de reviews. Original media bytes and generation inputs are not altered.

Portuguese registry changes: locales.3.enabled false → true; locales.3.localization.coverage "incremental" → "complete"; locales.3.localization.promptBodies "optional" → "source-only"; locales.3.preview undefined → true. Other locale registry entries compare equal.

## Dynamic scope and approval coverage

Fresh read-only locale-check --strict --json returned ready=true, blocking=false, 381/381 current content units and 2220/2220 current fields. Scope contains 381 items and 2220 fields; exact key sets match the current report. All 2601 records are unique approved keys with matching current source/target hashes. No missing, draft, outdated, unreviewed, archived or invalid targets. This ready report uses evaluation mode candidate-production; it does not assert enabled production deployment or browser acceptance.

## Anomalies

None.

Detailed immutable counts, allowed exact corrections, policy changes, existing review diffs, current sourceRevision and counters are in preservation-audit.json.
