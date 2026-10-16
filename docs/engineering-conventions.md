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

## Messages (i18n)

- [next-intl](https://next-intl.dev) is used for ICU message formatting only. Locale routing,
  prefixes and hreflang come from the locale registry and the url module.
- Catalogs are split per feature: `src/i18n/messages/{locale code}/{namespace}.json`. A session
  adds its own namespace file in every buildable locale and never edits another feature's file.
- Server components: `getTranslations('namespace')`. Client islands: wrap them in
  `<ClientMessages namespaces={['namespace']}>`, which sends only those namespaces plus `common`.
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

## Tests

- Unit tests sit next to the code: `*.test.ts`, run by Vitest.
- End-to-end tests run against `dist/` served by the reference nginx
  (`deploy/nginx/host-server.conf` plus the generated include), never against `next dev`:
  - `tests/e2e/*.http.spec.ts`: raw HTTP and the HTML crawlers see; runs once.
  - `tests/e2e/*.browser.spec.ts`: real browsers; CI runs Chromium, Firefox and WebKit.
  - Tests read the build's configuration from `generated/build.json`, so the same tests run against
    the root build and the `/prompt-seen` build.
- Locally, `PW_BROWSERS` picks browsers (default: the installed Chrome).
- Pages have no serious or critical axe-core violations (WCAG 2.2 AA tags).

## CI

`.github/workflows/ci.yml` runs on every PR and on `main`:

1. `check`: content validation, typecheck, lint, format, unit tests.
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
| `scripts/content-build.ts`          | adding an emitter file in `scripts/emitters/`                       |
| UI messages                         | adding a namespace file per locale in `src/i18n/messages/`          |
| `site.yaml` schema, `src/config/`   | a small PR that adds or tightens a key, merged first                |
| `@/modules/url`                     | a new function in `paths`                                           |
| `content:validate`                  | step 1b adds content checks; later steps add checks next to theirs  |
| Root layout, navigation, shell      | owned by step 1c; changes go in their own PR                        |
