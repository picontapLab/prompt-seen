# Firefox language-option click diagnosis

Conclusion: the reproduced failure is a Playwright click/scroll timing race with the ComboBox Popover's entry transform. Waiting for the target option to be visible and for finite entry animations to finish preserves the existing real-click, unfiltered-menu path and removed the failure in 16 independent attempts. No product implementation change is warranted by this evidence.

## Reproduction

Standalone Firefox 157 (Playwright 1.64.1, revision 1555) against the unchanged local root artifact served on port 8197. Each attempt uses a fresh context, 1280×720 viewport, clicks the home page's “Another frame”, opens “Language: English”, then selects Russian or Arabic through a normal locator click. The diagnostic uses a 3.5-second click timeout because the failed menu has already closed; it does not recover or retry an individual attempt.

The first helper branch does **not** fill the filter input: it only clicks the initial LanguageSwitch placeholder and selects from all 12 options. Input filtering happens only in the helper's existing else branch. Therefore these first en→ru/ar failures are not stale filtered results.

| Probe | Passed | Failed |
| --- | ---: | ---: |
| Original click path | 20 | 4 |
| Original path with additional geometry capture | 9 | 3 |
| Target visible → finite animations settled → normal click | 16 | 0 |
| Fill native name → one filtered option → normal click | 16 | 0 |
| 1280×420, settled unfiltered menu → real mouse wheel → normal click | 12 | 0 |

Raw counts are saved in `summary.json`. Per-attempt records, failure screenshots and standalone scripts are in this directory. No repository, dist, tracked acceptance screenshots or test-results files were changed. All diagnostic browsers are closed.

## Observed cause chain

- The original failure signature is reproduced exactly: option visible/enabled/stable → scroll into view → HTML intercepts pointer events → option detaches → click timeout.
- In every captured detailed failure, **no option pointerdown or click occurs**. The first incorrect event is a document scroll: Russian moves window.scrollY from 0 to 41; Arabic moves it from 0 to 173. The Popover's own scrollTop remains 0.
- At that document scroll the Popover still has `data-entering` and a non-none transform, even though the residual translation is tiny (for example `matrix(1, 0, 0, 1, 0, -0.000602866)`). A visually stable rectangle is not proof that its entry transform has ended.
- About 6ms later, ComboBox aria-expanded becomes false, input value returns to English, and the Popover has `data-exiting`. This matches React Aria `useCloseOnScroll`: scrolling an ancestor containing the trigger closes the overlay. The close is expected for a real ancestor scroll; the unexpected initiating scroll comes from the automated click's scroll-into-view step during entry motion.
- Actual stable layout at 1280×720 has a 538px Popover containing a 528px list. All 12 options fit; its inline available-height positioning makes the effective max height larger than the stylesheet's 22rem. Therefore there is no need to scroll the default-desktop list to reach Russian or Arabic once settled.
- A separate genuinely overflowing 1280×420 scenario confirms real-user reachability. Mouse-wheel input scrolls the Popover to scrollTop=188 while window.scrollY stays 0. Russian/Arabic remain hit-testable and normal clicks navigate successfully in all 12 attempts.

## Recommended minimal test change

In `chooseLanguage`, keep the existing opening/filtering branches. Before the final option click:

```ts
const option = page.getByRole('option', { name: to.nativeName });
await expect(option).toBeVisible();
await settle(page);
await option.click();
```

Import the existing `settle` helper from `./support/a11y`. It waits for actual finite animations, including the Popover's 140ms entry animation. Do not use force clicks, disable product animation, raise click retry counts, or replace the first full-menu path with filtering merely to avoid the failure. The successful filtered probe is diagnostic evidence, not a required behavior change.

The main agent's proposed validation is appropriate: all home-language round trips across three browsers, followed by five Russian and five Arabic Firefox repetitions with retries=0. The short-viewport wheel probe can remain diagnostic evidence; a new repository test is not necessary for this narrow timing fix.
