# Correction and resolution

The prior 58 run records incorrectly attributed six generic images to unrelated prompts. Those records and acceptance assertions were invalid; the old import records and six generic assets were removed from the repository and active content.

Resolved on 2026-10-30 (America/Los_Angeles): all 58 static cases now have different, genuinely generated showcase images. There are 59 active output runs, including the second axonometric view, 33 template-backed cases, one additional reverse-view template, and 18 cases with ordered reference images. Both English and Chinese entries and all five collections are published in the local project. Cases 15 and 16 remain excluded.

The first ten genuine attempts were recovered from tool responses during production; their subsequent pipeline record dates are reconciliation dates, not invented original generation timestamps. The accepted results are represented by the durable `audit/` snapshots. Rejected attempts do not count as showcase evidence. In particular, case 53 was regenerated again to correct the Euro-slot hole; its old run was discarded.

Run `node --import tsx scripts/audit-design-top60.ts` to verify byte hashes, one-to-one output mappings, actual submitted prompts, ordered references and rendered template defaults. `audit/` holds durable generation/review snapshots; public originals are the durable image source. Local tool/cache paths are omitted or kept relative because they are not required by the site or audit command.

See `docs/design-ai-top60-visual-qa.md` for the final visual/interaction observations and remaining limitations. Verified means a recorded generation exists; it does not promise perfect model compliance or production-ready engineering, medical, vector or pixel assets.
