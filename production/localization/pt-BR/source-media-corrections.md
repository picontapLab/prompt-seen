# Source media corrections

AI Codex translate_b/translate_c independently inspected the originals during Portuguese review. AI Codex root then opened all three full-size originals with view_image and checked the exact EN/ZH/JA/DE descriptions before writing the corrections and Japanese/German review records. No human review is claimed.

- a_269: the cutaway shows a home office with desk, swivel chair, bookshelf and window, not a living room. Corrected EN/ZH/JA; existing German already accurately described the desk, mint chair, bookshelf and terracotta floor.
- a_280: one cloud-material circular mountain emblem against a blue sky. The original two-material claim was incorrect for this asset. Corrected EN/ZH/JA; existing German correctly identifies the three peaks, small ring and clouds.
- a_282: one transparent, refractive glass emblem with three peaks and a small ring against blue sky. Corrected EN/ZH/JA; existing German correctly describes the actual glass asset.

Original bytes, media hashes, Prompt bodies and recorded generations are unchanged. Portuguese source and target fingerprints were recomputed only after the corrected text was actually reviewed. Japanese/German source fingerprints changed, so their exact target wording was explicitly re-reviewed against each asset; no blanket renewal was used.

## Spanish integration review — 2026-11-11 (America/Los_Angeles)

When integrating current main, the Spanish alt descriptions still reflected the superseded English descriptions for a_269/a_280/a_282. AI Codex opened all three original PNGs, updated the Spanish candidates to describe the office, cloud emblem and glass emblem respectively, then separately checked every full source/target pair and asset before approving the pending hashes. Generation and review were performed in distinct passes by the same AI agent; no independent human/native-speaker review is claimed. Other locale fields and original image bytes were preserved.

Batch `production/localization/es/batches/portuguese-merge-source-alignment.json` (ID `a0a854d7cf44d21070d7312ac36b5b51a9ba1c439c1758402c9163e1e004f00a`) passed import dry-run, pending import and guarded promotion; new approvals append to the Spanish reviews ledger. This preserves Spanish coverage after the Portuguese branch's source corrections, rather than renewing approvals against obsolete text.
