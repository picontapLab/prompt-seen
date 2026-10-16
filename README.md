# Prompt Seen

A browsable, searchable library of tested image prompts and templates. Every work shows its
prompt and what each phrase does. The site is a static export of a Next.js app that deploys at
the root of a domain or under a subpath of another site, such as `example.com/prompt-seen`.

Status: under construction. Steps 1a and 1b of the implementation plan (design doc §17) are in
place: the project scaffold, configuration and CI, and the content model with its build pipeline,
validation, template rendering, image import and a sample content set. Pages are placeholders.

## Quick start

Requires Node.js 24 (see `.nvmrc`). The end-to-end tests also need Docker.

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3000/prompt-seen/>. To work without the base path, start with `BASE_PATH= npm run dev`.

## Commands

| Command                                       | What it does                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                 | Generates configuration and data, then starts the dev server; content rebuilds on every change             |
| `npm run build`                               | Static export into `out/`, packaged into `dist/{basePath}/`                                                |
| `npm run content:validate`                    | Checks configuration, UI messages and every content file; lists errors, publish errors and warnings        |
| `npm run content:build`                       | Builds the content model and runs every emitter in `scripts/emitters/`                                     |
| `npm run content:new -- prompt <slug>`        | Creates a draft entry with the next ID (also `template`, `collection`, `page`, `example`)                  |
| `npm run media:import -- <image> --slug <s>`  | Stores an image and its display sizes in `public/media/` and writes `content/media/<id>.yaml`              |
| `npm run typecheck` / `lint` / `format:check` | Static checks                                                                                              |
| `npm test`                                    | Unit tests (Vitest)                                                                                        |
| `npm run test:e2e`                            | Builds must exist; serves `dist/` with the reference nginx in Docker and runs Playwright                   |
| `npm run serve`                               | Serves `dist/` with the reference nginx at <http://127.0.0.1:8090/> for manual checks                      |
| `npm run deploy:cloudflare:prepare`           | Assembles `.deploy/cloudflare/` (`dist/` plus `_headers`, `_redirects` and 404 pages) for Cloudflare Pages |

Build-time settings come from `content/site.yaml`, overridden by environment variables:
`SITE_ORIGIN`, `BASE_PATH` (empty for a root deployment), `URL_PATTERN`, `BUILD_MODE`
(`preview`, the default, marks every page noindex; `production` is for the live site),
`BUILD_ID` and `CONTENT_DIR`. Changing the base path needs a new build.

## Documentation

- [`content/README.md`](content/README.md): how to write and publish content, for maintainers.
- [Design document](docs/prompt-library-website-design.md) (Chinese): the source of truth.
  §17 is the implementation plan and session map.
- [Engineering conventions](docs/engineering-conventions.md): how code in this repository is organised and extended.
- [Subpath hosting decision](docs/subpath-hosting-decision.md): why the site is a static export, with prototype results.
- [Language coverage assessment](docs/language-coverage-assessment.md).
- [`design/`](design/README.md): the chosen visual direction, tokens and reference pages.

## Licenses

Code: [MIT](LICENSE). Prompt text and descriptions: [CC BY 4.0](content/LICENSE). Images are
licensed per file. The name and brand are not licensed for reuse.
