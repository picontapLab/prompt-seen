# Engineering conventions

How code in this repository is organised and extended. Set up in step 1a; every later session
follows it. The design document ([§17](prompt-library-website-design.md)) decides _what_ to build;
this page covers _how_ it fits together. A change to these conventions goes in its own small PR.

## Working in sessions

- One session = one branch = one PR. The PR description lists each pass condition from §17.3 with
  its result and includes screenshots for UI changes.
- Each session owns the files named in its brief. Shared places are extended only as described
  under [Extension points](#extension-points); a contract change goes in a small PR first.
- A decision that changes the design document is written back into the document in the same PR.

## Configuration

- `content/site.yaml` and `content/locales.yaml` are validated by `src/config/schema.ts`. Unknown
  keys are errors. Keys reserved for later steps (`home.featured`, `feed.showcase`,
  `feed.interludes`) are loose arrays until the owning step tightens their schema.
- Environment variables override `site.yaml`: `SITE_ORIGIN`, `BASE_PATH`, `URL_PATTERN`,
  `BUILD_MODE`, `BUILD_ID`, `CONTENT_DIR`. Only `src/config/load.ts` reads them.
- `npm run gen` writes `src/config/generated/config.ts` (git-ignored). App code imports `@/config`;
  it never reads YAML or `process.env` (lint-enforced).
- `BUILD_MODE=preview` (the default) builds enabled locales plus those marked `preview: true` and
  marks every page `noindex`. `BUILD_MODE=production` builds enabled locales only.

## Addresses

All addresses come from `@/modules/url` (lint-enforced for `config.origin`, `config.basePath` and
`config.urlPattern`):

| Need                                                              | Use                                        |
| ----------------------------------------------------------------- | ------------------------------------------ |
| `next/link`, `router.push`                                        | an internal path, e.g. `paths.prompt(locale, slug)` |
| plain `<a>`, `fetch`, `history.pushState`, Workers, `public/` files | `withBasePath(path)`                       |
| canonical, hreflang, Open Graph, sitemap, JSON-LD                 | `absoluteUrl(path)` (follows `urlPattern`) |
| `location.pathname` back to an internal path                      | `stripBasePath(pathname)`                  |

Pages end with `/`; files such as `index.md` do not. A new kind of address is a new function in
`paths`, never a template string in a page.

## Routes under static export

- The site is built with `output: 'export'`, `trailingSlash: true` and a build-time `basePath`.
  No server features: no `next.config` redirects, rewrites or headers, no Proxy, ISR, Server
  Actions or cookies. Redirects, 410s and response headers are generated host configuration.
- Every dynamic segment has `generateStaticParams` and `dynamicParams = false`.
- Route Handlers (`index.md`, `llms.txt`) sit outside the `[locale]` layout, so their
  `generateStaticParams` returns every parameter, `locale` included.
- `src/app/layout.tsx` passes children through. `<html lang dir>` is rendered by
  `[locale]/layout.tsx` and by the language entry layout, so each page carries its own language
  and direction. If a page under `[locale]` calls `notFound()`, add a `[locale]/not-found.tsx`
  that does not render `<html>`; the root `not-found.tsx` (exported as `404.html`) renders a full
  document.
- Per-locale error pages live at `/{locale}/404/` and `/{locale}/410/`. Hosts serve them through
  error rules and keep the pages themselves internal.
- Next.js treats a route ending in `sitemap.xml` (below the root too), `robots.txt` or `icon.*` as a
  metadata route; a dynamic one is prerendered with a placeholder param and fails. Name such files
  otherwise (the per-locale sitemaps are `sitemap-pages.xml`).
- In `next dev`, an address outside `generateStaticParams` (an unknown or unbuilt locale) logs
  "missing param … required with output: export" and answers 404. That is expected.
- `next.config.ts` regenerates `src/config/generated/`, so starting `next dev` or `next build`
  directly uses the same configuration as `npm run dev` and `npm run build`.

## Messages (i18n)

- [next-intl](https://next-intl.dev) is used for ICU message formatting only. Locale routing,
  prefixes and hreflang come from the locale registry and the url module.
- Catalogs are split per feature: `src/i18n/messages/{locale code}/{namespace}.json`. A session
  adds its own namespace file in every buildable locale and never edits another feature's file.
- Every layout and page under `[locale]` calls `enterLocale(params.locale)` (`@/i18n/locale`)
  first. Under static rendering, layouts and pages render separately and a page does not inherit
  its layout's locale; without the call, next-intl falls back to English without any error.
- `generateMetadata` and shared server components pass the locale explicitly:
  `getTranslations({ locale: entry.code, namespace })`.
- Never call `setRequestLocale` in `not-found.tsx`, error boundaries or other components that
  can render inside another page's tree: React renders the root not-found element in every page,
  so setting the locale there switches every page to that language. Pass the locale explicitly
  instead.
- Server components: `getTranslations('namespace')` after `enterLocale`. Client islands: wrap
  them in `<ClientMessages namespaces={['namespace']}>`, which sends only those namespaces plus
  `common`.
- End-to-end tests check that each locale's visible text comes from that locale's catalog
  (`message()` in `tests/e2e/support/artifact.ts`); add the same check for new pages.
- `content:validate` fails on invalid ICU syntax, missing keys and arguments that differ from
  English. Translations written by machine are drafts until a reviewer signs them off (§8.4, §17.6).

## Generated output

- `public/generated/`, `.generated/`, `deploy/generated/`, `src/config/generated/`, `out/`,
  `dist/` and `.deploy/` are generated and git-ignored. Never edit them by hand.
- Every output of `content:build` is an emitter: one file in `scripts/emitters/` whose default
  export is `defineEmitter({ name, description, run })`. The registry discovers it; the main
  script does not change. Emitters write only through `ctx.write('public' | 'internal' | 'deploy', file, contents)`.
  Files starting with `_` are helpers, not emitters.
- `npm run build` packages `out/` into `dist/{basePath}/`, so file paths match public addresses,
  and fails if a built locale's pages or error pages are missing.

## Content pipeline

Content is files under `content/` (format and maintainer commands: [`content/README.md`](../content/README.md)).
Build-time code lives in `scripts/lib/content/`; the app reads only what the build produces.

- `content:build` runs: read (`read.ts`: files, line endings, schemas) → validate (`validate.ts`:
  references, templates, media files, redirects, publishing rules) → index (`build-index.ts`: what
  this build shows) → emitters. Blocking findings stop it before any output is replaced.
- The model is defined in `src/modules/content/types.ts`: per-locale summaries for lists and links,
  and serializable detail models that the full page and the popup render alike. Rich text is a
  `RichBlock[]` tree compiled from MDX at build time; the browser never compiles MDX.
- Emitters read `ctx.content` (`manifest`, `locales`, `details`), never content files. The
  `content` emitter writes the model to `.generated/content/`.
- Pages read it through `@/modules/content` (server-only): `findBySlug`, `getDetailModel`,
  `listEntries`, `entryParams(kind)` for `generateStaticParams`. Locale arguments are registry
  codes (`zh-Hans`), not URL prefixes. Pass plain data to client components.
- Links in rich text with `internal: true` hold internal paths (`next/link`, or `withBasePath` for
  a plain `<a>`). Images go through `@/modules/media` (`getImage`, `srcSet`).
- Template rendering is the pure `@/modules/template` (`renderTemplate`), shared by the build,
  the template page and the editor, so the default prompt, preview, copy and download agree.
- Production builds show a locale version only when the locale is enabled and the version meets
  every publishing rule; preview builds also show drafts and `preview: true` locales.
- Findings have four levels: `error` and `publish` block, `warning` and `info` do not (§14.3).
  A new content check goes in `validate.ts` (or a module it calls) and names the file, the line
  when known, the field and the fix.
- Images are stored by the local media driver in `public/media/` and committed, so a fresh clone
  runs without cloud credentials. `media:import` writes them; keys contain a content hash and
  are never overwritten.
- `npm run dev` rebuilds content on every change under `content/` (`content:build --watch`); a
  failed rebuild keeps the previous output.

## Design system and shell

Set up in step 1c (design doc §11.1, §11.6.3, §12.4, §15.5.2).

- **Tokens** are the CSS files in `src/styles/tokens/` (`color`, `type`, `layout`, `motion`), the
  only source of visual and motion values. Components use custom properties, never literal
  colours or durations, and token sizes wherever a token exists. Code that needs a value imports its TypeScript mirror
  (`motion.ts`, `breakpoints.ts`, `theme-color.ts`); `tokens.test.ts` keeps mirrors equal.
- `npm run tokens:check` verifies the 44 contrast pairs of §11.1.9 plus supplementary pairs
  (`scripts/lib/tokens/check.ts`). A new colour token that text or controls sit on gets a pair.
- **Cascade layers**: `reset < tokens < base < components < utilities`. Component styles are CSS
  Modules wrapped in `@layer components`. States are styled from React Aria data attributes
  (`[data-hovered]`, `[data-pressed]`, `[data-focus-visible]`, `[data-selected]`,
  `[data-disabled]`, `[data-pending]`, `[data-invalid]`), hover only under
  `@media (hover: hover) and (pointer: fine)`. Logical properties only.
- **Breakpoints** (min-width): 480, 768, 1024, 1280, 1600 px, written literally in media and
  container queries (CSS cannot use custom properties there); a test rejects other widths. Use
  container queries inside components.
- **Primitives** (`src/ui/primitives/`): Button, IconButton, Tooltip, Dialog, Select, Combobox,
  SegmentedControl, TextField, Chip, Toast. Feature code uses these, not
  `react-aria-components`. Brand elements: `src/ui/brand/`. Motion: `src/ui/motion/`
  (`MotionProvider` around an animating area only, never the root; presets from the tokens).
- **Import UI modules by file** (`@/ui/primitives/Button`), never through an index file: a server
  component that imports an index re-exporting `'use client'` modules puts all of them in the
  first-load bundle. Code needed only on interaction loads on demand (`React.lazy`), as the
  language list, the menu sheet, the toast region, the list's filter panel and sort list
  (`SortSelect`) and the editor's select do. React Aria's collections and overlays (`Select`,
  `Combobox`, `Dialog`, `TagGroup`) are the usual cost: one of them on a page can add ~40 KiB gzip.
- **Stories**: next to the component (`*.stories.tsx`), with a states story showing default,
  hover, pressed, focus-visible, selected, disabled, loading and invalid where they apply
  (`.storybook/states.tsx` forces a state). Sample copy per locale: `.storybook/samples.ts`.
  Check light, dark, RTL and reduced motion from the toolbar.
- **Theme**: `@/state/preferences/theme-provider` (`useThemePreference`). Visual differences that
  must be right at first paint go in CSS (`.when-dark`, `.when-light`), never in rendered state.
- **Fonts**: `src/styles/fonts/` declares every subset; text that carries its own `lang` sets
  `font-family: var(--font-text)` (or display, mono) on the same element so the stack for that
  script applies.
- **Shell**: `src/ui/navigation/Shell.tsx` renders the skip link, header, the one `<main>` and the
  footer; pages render content only. `shell.header` in `site.yaml` picks `default` or `host`.

## Pages, metadata and details

Set up in step 2 (design doc §9.3, §11.8.3, §17.3). Later pages follow the same pattern.

- A page under `[locale]` loads its model with `@/modules/content`, wraps client islands in
  `<ClientMessages namespaces={[…]}>` and renders a body component from `src/ui/`. Its
  `generateMetadata` returns `promptMetadata`, `templateMetadata` or `pageMetadata` from
  `@/modules/seo`; pages never set title, canonical, hreflang or Open Graph themselves.
- Detail bodies (`PromptDetailBody`, `TemplateDetailBody`) take only the serializable model, the
  locale entry and messages. No file reads, request state or server-only imports, so the popup
  of step 4a renders the same component in the browser.
- A `'use client'` file's plain function exports become client references in server
  components and cannot be called there. Shared helpers live in files without the directive
  (e.g. `src/ui/prompt-detail/language.ts`, `src/ui/annotation/layout.ts`).
- Links point only at pages that exist in this build: header sections and `linkedPages` in
  `src/ui/navigation/sections.ts` say which do; the step that adds a page flips its flag.
- Interface text set in the display face (`var(--font-display)`) needs its message keys in
  `DISPLAY_MESSAGE_KEYS` (`src/styles/fonts/display-cjk.ts`), so the CJK subsets include it.
- Plain `<img>` is intended: static export has no image optimizer, `media:import` makes the
  sizes and `@/modules/media` builds `srcset` (`@next/next/no-img-element` is off in `src/`).

## Search engines and AI tools

Set up in step 3b (design doc §9.3, §9.6, §9.7, §9.10).

- Every page renders its structured data with `<JsonLd data={…} />` and a `*StructuredData`
  function from `@/modules/seo`. A page with a breadcrumb passes the same items it shows
  (`promptCrumbs`, `templateCrumbs` in `src/ui/prompt-detail/crumbs.ts`); a new page with a
  breadcrumb adds its builder there. Lists, topics and collections use `collectionStructuredData`
  with the items in the order the page shows them.
- Sitemaps, `index.md`, `llms.txt` and `content:export` include a version only when
  `isIndexable(locale, visibility)`: the locale is enabled and the version published. Preview
  builds show drafts and preview-only locales; machine-readable outputs never do.
- They list a kind of page only when it exists in this build: `pageSections()` reads the flags in
  `src/ui/navigation/sections.ts`. A step that adds a list, collection, topic, about or license
  page flips the flag there, and the sitemap and `llms.txt` pick the page up.
- Markdown versions use the page's own labels (`detail` messages; the `geo` namespace holds the
  few Markdown-only ones), rendered by `src/modules/geo/markdown.ts`. Tests compare them with the
  HTML (`tests/e2e/seo.http.spec.ts`).
- Response headers the HTML cannot carry (the Markdown `Content-Type` and `Link: rel="canonical"`)
  are host configuration: the `nginx` and `cloudflare` emitters.

## Lists

Set up in step 3a (design doc §9.4, §11.8.2).

- The `feed` emitter writes each locale's newest-first pages (`public/generated/{locale}/feed/latest/{n}.json`)
  and the slim index (`feed/index.json`); list pages read the same files through `@/modules/feed`, so a
  page's HTML and its JSON agree. Batch layout (`assemble.ts`) and filters (`query.ts`) are pure and
  run both at build time and in the browser; reuse them rather than re-deriving lists.
- Cards and interludes (`src/ui/gallery/`) carry no `'use client'`: the server renders the first page
  and the client feed appends later batches with the same components.
- Works link to their detail page with a plain `<a href>` carrying `data-prefetch` (the popup JSON);
  the detail popup (step 4a) takes over plain clicks on them.
- Feed articles carry `data-entry` (the work's ID; an editorial feature row repeats its work's ID),
  `data-key` (unique) and `data-feed-page`. Tests that want one card use
  `article[data-entry="…"]:not([data-interlude])`.

## Detail popup

Set up in step 4a (design doc §11.3, §11.3.1, §11.3.2, §12.2).

- A gallery whose works open in the popup is wrapped in `PopupHost` (`src/ui/detail-popup/`), inside a
  `<ClientMessages>` with the `detail` and `popup` namespaces. The host takes over plain clicks on
  links to Prompt detail addresses of its locale; modified clicks, other tabs and pages without
  JavaScript reach the full page. Links stay real `<a href>` (or `next/link`) elements.
- The list inside registers its works in reading order: `usePopupList({ items, hasMore, loadMore })`
  for a growing list (the feed), `<PopupWorks items={…} />` for a fixed one (topic pages). Previous
  / next follow that order and call `loadMore` at the end of what is loaded.
- The address is the only state: the popup is open while the path is a detail address of the
  locale and the host is mounted. Code that replaces history entries under a host keeps the site's
  fields with `siteState()` from `history.ts` (the popup mark and the list's snapshot) and skips
  address updates while `document.documentElement.dataset.popupOpen` is set.
- The popup is a native modal `<dialog>` in the top layer. Overlays of the primitives inside it
  render into the dialog through `PortalScope`; an icon button there passes `tooltip={false}` or
  relies on that scope. An Esc that a control inside handles itself calls `preventDefault()`, so the
  dialog does not also close (the annotation phrases do).
- Next.js's patched `pushState` / `replaceState` are framework internals:
  `tests/e2e/popup.browser.spec.ts` is their regression suite; run it on every Next.js upgrade.

## Templates

Set up in step 3c (design doc §11.4, §11.6.2, §11.8.4).

- The editor (`src/ui/template-editor/TemplateEditor.tsx`) is the template page's client island. It
  receives an `EditorModel` (the current version's body, fields and samples, and the cover), never
  the whole detail. The prompt is computed with `renderTemplate` on every render; it is not state,
  so the preview, copy (`copyText` read at press time) and download are always one string.
- Pure parts live beside it without `'use client'`: `values.ts` (complete values, control choice,
  grouping), `editor-state.ts` (reducer), `share.ts` (link fragments) and `draft.ts` (storage).
  Server components may import them, as the Prompt detail does for its "Customize" link.
- Filled-in links: `paths.templateFilled(locale, slug, encodeShare(version, values))`. The editor
  reads the fragment after hydration, applies it only for the same version, then removes it from
  the address.
- Drafts: `prompt-library:template-draft:v1:{templateId}:{version}`, written 400 ms after a change;
  the default sample is never stored.
- `BottomSheet` (`src/ui/primitives/`) is a non-modal docked sheet; `staticFrom="lg"` makes the same
  element a normal block from 1024 px, so the preview exists once in the HTML.

## Search

Set up in step 3d (design doc §11.8.6, §11.10, §13).

- The `search` emitter writes one index per built locale (`public/generated/{locale}/search/index.json`)
  from the same content model the pages render. Kinds join the index when their pages exist
  (`pageSections()`): a step that adds collection or topic pages gets them into search by flipping
  its flag.
- Tokenising (`@/modules/search/tokenize`) and the engine options (`engine.ts`) are shared by the
  build and the Worker; an index and its queries must use the same version of both. Change them
  together and rebuild.
- Pages never import the engine. Client code asks the Worker through `searchClient()` (or the
  `useSearch` / `usePopular` hooks in `src/ui/search/use-search.ts`); every request carries the
  build ID and a sequence number, and only the latest answer is applied.
- The header's entry (`SearchLauncher`) is a plain link to `/{locale}/search/` until hydration.
  `/` and ⌘K / Ctrl+K are handled there; a page with its own search field registers it with
  `registerPageSearch` so the keys focus that field instead of opening the panel.
- Single-key shortcuts read `singleKeyShortcuts` from the preferences store (step 4c adds the
  switch). New ones follow the same rule: ignored in text fields and during IME composition.
- Search terms for taxonomy: `aliases` in `content/taxonomy/*.yaml` (see `content/README.md`).
  Labels in other languages are aliases automatically.

## Topics, collections, content and error pages

Set up in step 3e (design doc §8.2, §9.1, §9.5, §11.8.5, §11.8.7).

- Page bodies live in `src/ui/pages/` (server components, `server-only`); the routes only load the
  model and render them. Shared parts: `PageHead`, `Cover` (a work complete at its ratio),
  `Article` (rich text with the sticky `TableOfContents`) and `WorkRows` (the list's cards in
  justified rows). Works shown outside the list take their card from the list's own pages
  (`cardsFor` in `src/ui/pages/works.ts`), never from a second card model.
- A dynamic route under `[locale]` whose list can be empty in some locale returns
  `[{ slug: EMPTY_PARAM }]` (`@/modules/url`), renders `null` for it, and `scripts/package.ts`
  removes the output. Static export rejects an empty param list.
- Content pages are served at `/{locale}/{slug}/`; their slugs must avoid `RESERVED_PAGE_SEGMENTS`
  (`@/modules/url`). A new top-level route under `[locale]` adds its segment there.
- Client islands that read browser state (`location`, `navigator`, the preferences store) use
  `useSyncExternalStore` with an empty server snapshot, so the first output is the same for every
  visitor and the value appears right after hydration.
- Host configuration for address changes comes from `scripts/lib/hosts.ts` (pure, unit-tested)
  through one emitter per host: `nginx`, `cloudflare`, `netlify`, `vercel`, `static-redirects`.
  `scripts/package.ts` fails when a redirect target is missing from the build or an old or removed
  address still has a file.

## Tests

- Unit tests sit next to the code: `*.test.ts`, run by Vitest.
- End-to-end tests run against `dist/` served by the reference nginx
  (`deploy/nginx/host-server.conf` plus the generated include), never against `next dev`:
  - `tests/e2e/*.http.spec.ts`: raw HTTP and the HTML crawlers see; runs once.
  - `tests/e2e/*.browser.spec.ts`: real browsers; CI runs Chromium, Firefox and WebKit.
  - Tests read the build's configuration from `generated/build.json`, so the same tests run against
    the root build and the `/prompt-seen` build.
- Locally, `PW_BROWSERS` picks browsers (default: the installed Chrome).
- First-load JavaScript (design doc §16.1, [`first-load-js.md`](first-load-js.md)):
  `npx tsx scripts/measure-first-load.ts [paths]` against the served build prints, per page, the
  scripts the HTML references and everything fetched after 6 s idle (`--no-prefetch` leaves out
  next/link prefetches). Record the numbers when a change moves them.
- Pages have no serious or critical axe-core violations (WCAG 2.2 AA tags). Check with
  `seriousViolations(page)` from `tests/e2e/support/a11y.ts`: it waits for entry animations to
  finish first (`settle()`), since axe measures contrast at the opacity of the moment.
- `tests/e2e/support/content.ts` reads the build's content model, so tests pick real entries
  (`samplePrompt`, `sampleTemplate`) and compare pages with their data.
- Before clicking a client control, wait for hydration where the click must be handled
  (`hydrated()` in `detail.browser.spec.ts`). WebKit on macOS tabs to buttons with Option held.

## CI

`.github/workflows/ci.yml` runs on every PR and on `main`:

1. `check`: content validation, token contrast, typecheck, lint, format, unit tests, Storybook build.
2. `build-and-test`: a production build at the root and a preview build under `/prompt-seen`,
   each tested end to end in three browsers.
3. `preview`: uploads the tested `/prompt-seen` build to Cloudflare Pages. Needs the repository
   secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and optionally the variable
   `CLOUDFLARE_PAGES_PROJECT` (default `prompt-seen`). Without them the job reports a notice and
   skips.

## Style

Prettier (120 columns, single quotes) and the Next.js ESLint config, both checked in CI.
`content/`, `docs/`, `design/` and `spikes/` are not reformatted. Comments explain why, and cite
the design document section they implement.

## Extension points

| Shared place                        | Extend by                                                           |
| ----------------------------------- | ------------------------------------------------------------------- |
| `scripts/content-build.ts`          | adding an emitter file in `scripts/emitters/` that reads `ctx.content` |
| UI messages                         | adding a namespace file per locale in `src/i18n/messages/`          |
| `site.yaml` schema, `src/config/`   | a small PR that adds or tightens a key, merged first                |
| `@/modules/url`                     | a new function in `paths`                                           |
| `content:validate`                  | a check in `scripts/lib/content/validate.ts`, or a module it calls  |
| Root layout, navigation, shell      | owned by step 1c; changes go in their own PR                        |
| Header sections                     | set `available: true` in `src/ui/navigation/sections.ts` with the page |
| Sitemaps, `llms.txt`                | the same flags (`pageSections()`); new kinds of page go in `@/modules/seo/sitemaps` |
| Structured data                     | a function in `@/modules/seo` (mapping in `structured-data.ts`), rendered with `<JsonLd>` |
| Primitives, tokens                  | a new variant or token in the owning file, with its story and contrast pair |
| Detail popup                        | wrap the gallery in `PopupHost` and register its works with `usePopupList` or `<PopupWorks>` |
