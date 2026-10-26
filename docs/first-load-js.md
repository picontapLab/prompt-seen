# First-load JavaScript: where it goes and what is left to cut

> Measured 2026-10-25 on `main` (85541a2) and on branch `perf-first-load-js`: preview build under
> `/prompt-seen`, reference nginx, Chrome, cold cache, 1280 × 800. Sizes are gzip (level 6) of each
> script, since the reference nginx serves files uncompressed. "First load" is the scripts the HTML
> references, as design doc §16.1 counts it; "after idle" is every script fetched until the page
> has been idle for 6 s. Re-measure with `npx tsx scripts/measure-first-load.ts` (add
> `--no-prefetch` to leave out the router's prefetches).

## Summary

- The ~290–300 KiB every page seemed to load is not first load. Shell-only pages reference
  186–193 KiB, within the ~200 KiB budget. The rest arrives after hydration and is the same on
  every page, which is why every page ended on the same 21–22 scripts:
  - **idle preloads** (~52 KiB): the quick search panel (with React Aria's list box, popover and
    dialog code) and the toast region, loaded on purpose when the page is idle (steps 1c, 3d);
  - **next/link viewport prefetch** (~49 KiB): the four header links prefetch their routes, and
    React preloads the client code those routes use, mostly the Prompt list's filter bar, feed
    and detail popup. Blocking the `*.txt` segment requests removes exactly these.
- Over budget at first load: the **Prompt list** (268.7 KiB) and **template detail** (244.9 KiB).
  Both carried React Aria collection and overlay code (`ListBox`, `Popover`, `Dialog`, `TagGroup`,
  ~42 KiB) that is only needed once the visitor uses a control.
- The floor: React DOM and the Next.js runtime are ~133 KiB of every page; the shell's own code
  is ~54 KiB. Motion is in no client chunk yet.

## Per page

| Page | First load before | after | After idle before | after |
| --- | --- | --- | --- | --- |
| `/en/` (placeholder home on `main`) | 186.3 | 186.4 | 287.0 | 269.4 |
| `/en/prompts/` (and `/page/2/`, `zh-hans`) | **268.7** | **214.2** | 287.0 | 269.4 |
| `/en/styles/ink/` (topic) | 204.7 | 204.8 | 294.9 | 277.2 |
| `/en/collections/`, a collection, `/en/about/` | 187.4 | 187.5 | 287.0 | 269.4 |
| `/en/prompts/amber-harbor-sunset/` | 192.7 | 192.8 | 293.4 | 275.8 |
| `/en/templates/` | 186.7 | 186.8 | 287.0 | 269.4 |
| `/en/templates/ink-scroll/` | **244.9** | **208.8** | 310.6 | 285.9 |
| `/en/search/` | 191.5 | 191.6 | 300.8 | 283.2 |

KiB, gzip. The root production build measures the same within 0.1 KiB. The +0.1 KiB elsewhere is
Turbopack splitting shared code at different boundaries; for the same reason the idle-loaded
search panel code is 2 KiB larger than before (53.6 instead of 51.6 KiB on `/en/`).

Without prefetch (`--no-prefetch`), `/en/` is 186.3 → 237.9 KiB before and 186.4 → 240.0 KiB after:
the drop in the after-idle totals is the list's filter code no longer travelling with the prefetch.

## Where the bytes are

Shell (every page; from `next analyze` mapped onto the real chunks):

| gzip | What | Avoidable at first load? |
| --- | --- | --- |
| 70.3 | `react-dom` (62.6), Next.js client bootstrap, scheduler | no |
| 43.5 | App Router runtime, RSC client | no |
| 18.8 | small Next.js and React chunks, Turbopack runtime | no |
| 14.8 | React Aria interactions behind every `Button`: `usePress`, focus-visible, hover | no |
| 12.8 | `intl-messageformat` with the ICU parser (30.7 KiB minified), `use-intl`, React Aria `I18nProvider` | the parser, with precompiled messages |
| 12.2 | `Tooltip` with overlay positioning, `next/link`, config, `url` | positioning, until a tooltip shows |
| 6.6 | `SegmentedControl` (footer theme chooser): toggle group, `FocusScope`, selection indicator | no (visible control) |
| 8.3 | search launcher, header switches, providers, CSS module maps | no |

Prompt list, on top of the shell (before): the shared React Aria list box / popover / dialog chunk
(34.9, for the sort `Select` and the filter panel's `Dialog`), `Select` itself (7.3), feed, filter
bar and `TagGroup` for the active filters (19.9, including ~15 KiB minified of React Aria's
strings for 34 locales), `PopupHost` and `DetailPopup` (10.5), detail-body client parts for the
popup and the showcase band (9.8). Template detail: the same shared chunk (34.9) for the editor's
`Select`, which no sample template renders, plus the editor (~23).

## Changes in this branch

1. **Filter bar** (`src/ui/gallery/`): the panel (`Dialog` with the counted chips) moved to
   `FilterPanel.tsx`, loaded with `React.lazy`, mounted on the first press and kept for the close
   animation; the active-filter chips (`RemovableChips`) are lazy; the sort control is
   `SortSelect`, a button that looks and reads like the `Select` until the visitor reaches for it:
   pointing at or focusing it starts the download, and pressing it (or ↑ ↓) swaps in the `Select`,
   focused and open, so Esc returns focus to it. The bar's pointer-enter and focus preload all three.
2. **Template editor**: `Select` is imported with `React.lazy` inside `Suspense`. The server still
   renders it; it hydrates once its code arrives (checked by temporarily turning 3–4 option
   fields into selects: same HTML, no hydration warnings, the choice updates the prompt).
3. `scripts/measure-first-load.ts`, so later steps can take the §16.1 numbers the same way.

## Further reductions, ranked

| # | Change | Saves (gzip) | Risk and cost | Owner |
| --- | --- | --- | --- | --- |
| 1 | `DetailPopup` on demand: `PopupHost` keeps the click capture; the popup loads at hydration or on intent | ~10–14 KiB first load on the list and topic pages (list ≈ 200) | Medium–high. The click commits the open dialog synchronously so an Esc right after it closes the popup (§12.8-3); a click before the code arrives needs a pending state that handles Esc and Back itself | step 4a |
| 2 | Header links prefetch on intent (hover / focus → `router.prefetch`) instead of in the viewport | ~29 KiB JS and ~27 KiB RSC payload after idle on every page but the list | Low in code; the first header navigation waits for the network. A §16.4 "导航预取" decision | shell (1c) |
| 3 | Precompiled ICU messages (next-intl `experimental.messages.precompile`, icu-minify) | ~9 KiB first load on every page | Medium. Catalogs are read with `fs` and passed as props, so either load them through the plugin's catalog loader or precompile the client namespaces at build time and alias `use-intl/format-message` for the browser only | i18n (1a) |
| 4 | Quick search code on intent instead of idle | ~45 KiB after idle on every page | Reverses the 3d decision that `/` followed at once by typing reaches a ready field; needs buffered keystrokes | search (3d) |
| 5 | Tooltip positioning on demand | ~4–5 KiB first load on every page | Medium. React Aria's `TooltipTrigger` and `Tooltip` share one module; the trigger would move to the `useTooltipTrigger` hooks | primitives (1c) |
| 6 | React Aria strings only for built locales | a few KiB per collection chunk, now mostly lazy | Turbopack has no counterpart of `@react-aria/optimize-locales-plugin`; needs a `turbopack.rules` loader | — |

With 1 and 3 the gallery and detail pages would sit at or under ~200 KiB; the shell-only pages
would be ~177 KiB. Below that, the framework floor leaves ~67 KiB of the budget for everything else.
