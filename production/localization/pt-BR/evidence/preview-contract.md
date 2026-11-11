# Portuguese preview sitemap expectation diagnosis

Read-only investigation of `e2e-final-preview.txt` against code candidate b8e0e7e. The subsequent authorized correction changes only the Portuguese HTTP assertion; no browser, generator, build or test execution was run for this correction.

**Verdict: HTTP 404 is the correct packaged-preview contract. The Portuguese test expectation is wrong; no sitemap product defect is demonstrated.**

Evidence chain:

1. `docs/portuguese-localization-spec.md` §8 requires preview to expose no indexable outputs; sitemap, Markdown twins and llms follow the same indexing state.
2. `src/modules/seo/sitemaps.ts:17–18` returns zero indexable locales whenever buildMode is not production, regardless of registry enabled flags. `localeSitemapUrls` likewise returns no URLs in preview.
3. `src/app/[locale]/(public)/sitemap-pages.xml/route.ts:14–19` creates one empty placeholder only to satisfy static-export parameter requirements. Its comment explicitly says packaging removes it.
4. `scripts/package.ts:53–56` explicitly removes every built locale's per-language sitemap in preview. Therefore `/prompt-seen/pt-br/sitemap-pages.xml` must be absent/404, even though Portuguese remains enabled in registry metadata.
5. `src/app/sitemap.xml/route.ts` always emits the root index, which correctly remains HTTP 200 with zero sitemap references. Read-only inspection of `dist/prompt-seen/sitemap.xml` confirms that empty sitemapindex; no per-language sitemap files are present.
6. Existing `tests/e2e/seo.http.spec.ts:25,104–110` defines public locales as empty in preview and expects the root sitemap references to equal that empty set. Its llms assertion at lines 259–261 expects the served text to be empty.

The new Portuguese test at line 200 incorrectly equates `portuguese.enabled` with “indexable in this build.” Production enablement does not override the preview exclusion. The retained log shows expected 200, received 404, in both original and retry attempts.

Smallest correction: in `if (!production)`, replace the conditional status expectation with `expect(sitemap.status()).toBe(404)`. Prefer also replacing the following `xmlLocations(await sitemap.text())` assertion (which merely parses the HTML 404 body) with a read of the actual root `/sitemap.xml` using the existing 200-checking helper and asserting its locations are empty. Keep the llms empty-text and every Markdown-twin 404 assertions intact. Production exact-set coverage remains unchanged.

Run the corrected targeted HTTP case on the retained preview artifact after the full suite finishes; retain the failing log as RED evidence. No generator, routing, enabled flag or indexing-policy change is warranted.

## Applied correction

The Portuguese preview branch now expects the locale sitemap to return 404 and verifies the actual root sitemap (via the existing helper requiring HTTP 200) has zero locations. The llms empty-text and Markdown 404 checks remain intact, as does exact production coverage. Formatting was checked on this file only. The targeted GREEN execution is pending completion of the active full suite; this document does not claim a passing rerun.
