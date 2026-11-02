# Correction and resolution

The prior 58 run records incorrectly attributed six generic images to unrelated prompts. Those records and acceptance assertions are invalid. They remain under `superseded/` for audit; the six generic assets have been removed from active content and `public/media/`.

Resolved on 2026-10-30 (America/Los_Angeles): all 58 static cases now have different, genuinely generated showcase images. There are 59 active output runs, including the second axonometric view, 33 template-backed cases, one additional reverse-view template, and 18 cases with ordered reference images. Both English and Chinese entries and all five collections are published in the local project. Cases 15 and 16 remain excluded.

The first ten genuine attempts were recovered from tool responses under `reconciled/`; their subsequent pipeline record dates are reconciliation dates, not invented original generation timestamps. Rejected attempts do not count as showcase evidence. In particular, case 53 was regenerated again to correct the Euro-slot hole; its old run is archived.

Run `node --import tsx scripts/audit-design-top60.ts` to verify byte hashes, one-to-one output mappings, actual submitted prompts, ordered references and rendered template defaults. `audit/` holds durable generation/review snapshots; public originals are the durable image source. Historical absolute tool/cache paths in snapshots are evidence, not required by the site or audit command.

See `docs/design-ai-top60-visual-qa.md` for the final visual/interaction observations and remaining limitations. Verified means a recorded generation exists; it does not promise perfect model compliance or production-ready engineering, medical, vector or pixel assets.
