# French cross-language empty-result timing diagnosis

The failing WebKit assertion waits only the default five seconds for a second-stage, cross-language search suggestion. On the unchanged `790dc273-subpath-preview` artifact, cold Worker index processing naturally exceeds that budget. The correct Chinese link then appears in the same page without any reload, retry, input change, forced click, network interception or product mutation. The minimal test-only correction in `ff55596f25ff97b845df387d0f4ca55195e9867a` is approved.

## Reproduction and verification

All runs use actual WebKit 27.2, Playwright 1.64.1 and Node 24.19.0 against the reference nginx serving the original preview build on port 8199. Every attempt creates and closes a fresh browser context. Worker request/reply listeners, DOM observations and Playwright request events record timing without delaying or changing behavior. Nothing writes to product files, dist or test-results.

| Independent probe | Attempts | Initial assertion failures | Same-page later recovery |
| --- | ---: | ---: | ---: |
| Original five-second assertion, serial | 8 | 0 | 0 |
| Original five-second assertion, four concurrent contexts | 8 | 0 | 0 |
| Further original five-second assertion, four concurrent contexts | 24 | 7 | 7 |
| Single fifteen-second assertion, four concurrent contexts | 8 | 0 | 0 |

The original failing attempts recovered up to 9.9 seconds after the observed empty result. The single fifteen-second assertion passed eight of eight attempts, including one requiring 10.4 seconds. In this last group, the probe then waited for all twelve help replies (local help plus eleven other locales); the Chinese link remained present in all eight cases. This also checks that a later help reply does not overwrite an already published match.

## Evidence and cause

The archived matrix screenshot and error context show the French empty-result heading, preserved query `梅枝` and browse link, but no cross-language suggestions. The independent failures reproduce that state.

`use-search.ts` first publishes the local `results.total === 0`, then requests optional help for the other built locales. Each index load resolves independently and merges its matches. The empty-result container therefore does not establish that Chinese help is ready.

For example, `concurrent-long-15.json` records the French empty DOM around 1,191 ms after navigation; the Chinese index network transfer is finished around 1,452 ms, but its Worker help reply arrives around 11,109 ms with `{ locale: 'zh-Hans', total: 1 }`. The page then renders exactly `/prompt-seen/zh-hans/search/?q=%E6%A2%85%E6%9E%9D`. The seven failed attempts contain no index request failure or Worker error. The delay occurs after transfer and before the correct help response, consistent with cold JSON/engine loading and Worker processing. The probe does not separately profile those internal phases.

No incorrect href, missing locale, bad translation, lost help update or permanently stuck state was found. The old assertion fails before the existing asynchronous operation is finished. This is a test synchronization issue; no product performance optimization is claimed.

## Minimal correction

Keep the exact selector and visibility assertion, and use `toBeVisible({ timeout: 15_000 })` only for this cross-language help step. This matches the two corresponding shared search assertions in `tests/e2e/search.browser.spec.ts` and the existing French interaction check in `tests/e2e/french-interactions.browser.spec.ts`. No retry or weakened expectation is needed.

Reviewed commit `ff55596f` changes only this timeout and adds an explanatory comment. The final product build and matrix rerun remain the parent agent's responsibility. All diagnostic browsers have exited; the dedicated 8199 nginx container is stopped.

Per-attempt JSON, original-deadline screenshots, the standalone probe and machine-readable `summary.json` are retained in this directory. The archived matrix failure itself did not record Worker messages; the causal evidence above comes from natural independent reproduction against the unchanged artifact.
