# A3 Arabic candidate review

Reviewer/translator: `codex-subagent/rtl_acceptance`. This record identifies AI translation and semantic self-review; it is not a claim of independent native-speaker approval.

## Scope and result

- Read all 94 reported source pages: 75 templates, 16 collections and 3 topics. `template/t_002` and `topic/style/ink` were translated from their real Chinese sources; the others from their reported sources. All titles, descriptions, complete bodies and collection reasons were translated. Repeated source paragraphs reuse the same checked Arabic wording; distinct source content is retained.
- Read and translated all 499 assigned dependent fields: 308 template explanation/label/help/reference fields, 110 image alt fields and 81 recorded run notes. Actual Prompt bodies, sample values, option values and defaults were not modified.
- `a3-pages.json` and `a3-fields.json` pass the repository import batch schema. All MDX link targets match source in order. Candidates contain no new bidi control characters.
- All 593 candidate operations are explicitly listed in `a3-reviews.json` with their exact source and target fingerprints, reviewer identity, conclusion and scope-limiting reason. This file is review evidence only; no import, promotion, enablement or deployment was performed by this subagent.

Fingerprint correction: the first review serialization hashed field values without the target field path. Corrected all 499 field hashes to the import contract `fingerprint({ field: op.targetField, value: op.translation })`, first asserting each old hash exactly matched the same reviewed candidate value and source hash. The 94 page prose hashes were verified and left unchanged. This corrects serialization, not review scope or approved text.

## Visual inspection

All 110 local media assets listed in `a3-media-review.json` were viewed in ten labeled contact sheets with cells up to 490×420 px. IDs, source paths and hashes are recorded, so the reviewed content is identifiable. The original nine frames of `a_492` were also viewed in a 3×3 sheet to check the applause motion described by its alt; a static thumbnail alone was not treated as animation proof.

Checked depicted objects, major colors, physical left/right placement, number of visible panels and preservation of English/Chinese image text. Visible sticker captions, poster labels and map directions were compared where relevant. The field translation does not claim the source imagery was redrawn in Arabic. Corrected the otter wording to a robot *for underwater use*, avoiding the false implication that the depicted robot is physically underwater.

Source run notes retain their original review claims and limitations. This translation review does not re-run generation, validate engineering geometry, or establish new model provenance. No candidate invents a precise model ID, material-safety result, verified weather forecast or navigation-grade map.

## Remaining release checks outside this review

Native browser 200% zoom, actual VoiceOver/NVDA Arabic speech, whole-site interaction acceptance and production deployment remain outside this review. Text and media approval does not satisfy those gates. The engineering review is separately recorded in `subagent-engineering-review.md`.
