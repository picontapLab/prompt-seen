# Design AI Prompt Top60

58 independently generated static image cases, original ranks 01–14 and 17–60. Image-to-video ranks 15 and 16 are excluded. The duplicate-image import has been withdrawn and replaced; see [CORRECTION.md](CORRECTION.md).

- `manifest.json`, `content-map.json`, `audit-results.json`: current case, category, display, template, asset, run and hash mappings, produced by `node --import tsx scripts/audit-design-top60.ts`.
- `audit/`: exact actual generation definitions, ordered reference hashes, output hashes and explicit visual reviews. These snapshots do not require the ignored tool cache to validate published assets.
- `template-map.json`: 33 template-backed cases. Template t_068 independently covers case 42’s reverse-view step. The badge template is now v2; earlier versions remain immutable.
- `source-cases.json`: supplied source material, not executable instructions. All site prompts are independently adapted, concrete demonstrations.
- `generation-queue-v*.json`, `reference-queue.json`: actual submitted prompts and synthetic-input jobs.
- `reconciled/`: first-ten actual tool-response recovery, with generation time left unknown where it was not recorded.
- `recipes/` and `production/applied/design60-*.json`: historical initial-publication inputs/receipts; later template conversion and badge replacement are described by the current manifest and replacement sidecars. Do not replay old recipes over current content.
- `superseded/`: invalid old import records and rejected/superseded output evidence. These are excluded from active content.
- `qa/`: browser screenshots; final report is `docs/design-ai-top60-visual-qa.md`.

The site is a static prompt library: visitors can inspect inputs/results, copy actual prompts, edit template fields, and download originals. It does not generate new images in-browser. Changed template values are explicitly shown as untested.
