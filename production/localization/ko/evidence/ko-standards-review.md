# Standards review

Reviewed the staged change against `0306b74b66ab9bf1f76eb5061bc466c3ebf86325`, using `CONTRIBUTING.md`, `docs/engineering-conventions.md`, `content/README.md`, `docs/general-localization-spec.md`, and `docs/localization-workflow.md`.

## Documented standards

No confirmed violations found. Search analysis remains shared between build and Worker, the analyzer version is incremented, original Prompt bodies and template contracts are preserved, and Korean UI messages stay in the catalog. Acceptance evidence distinguishes AI text review, actual image inspection, synthetic composition tests, and outstanding real-device checks. Keeping Korean preview-only is consistent with those outstanding release gates.

## Baseline smells

No unresolved findings. The earlier P3 Duplicated Code judgment is resolved: `tests/e2e/support/composition.ts` now owns the Firefox composition-input adapter, and `korean.browser.spec.ts`, `korean-interactions.browser.spec.ts`, and `korean-ime-submit.browser.spec.ts` import it. There are no remaining local `composingText` implementations in those suites.

This was a read-only source review; the full test suite was not rerun as part of the review.
