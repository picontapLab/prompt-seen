# Prompt Seen

A browsable, searchable library of tested image prompts and templates. Every work shows its
prompt and what each phrase does. The site is a static export of a Next.js app that deploys at
the root of a domain or under a subpath of another site, such as `example.com/prompt-seen`.

Status: the first version is built (design doc §17, steps 1a–5): Prompt and template pages,
the list with continuous loading and filters, the template editor, search, topics and collections,
the detail popup, the home page, favourites, structured data, sitemaps and Markdown versions for AI
tools, and the production deploy with rollback. The content is a sample set (`content/README.md`)
until tested prompts replace it. Step 6, the full acceptance pass, is next.

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
| `npm run content:export`                      | Published content as JSON into `export/`; `-- --format markdown` writes the `index.md` documents           |
| `npm run media:import -- <image> --slug <s>`  | Stores an image and its display sizes in `public/media/` and writes `content/media/<id>.yaml`              |
| `npm run typecheck` / `lint` / `format:check` | Static checks                                                                                              |
| `npm test`                                    | Unit tests (Vitest)                                                                                        |
| `npm run tokens:check`                        | Checks the colour contrast pairs of the design tokens (WCAG 2.2, design doc §11.1.9)                       |
| `npm run storybook` / `storybook:build`       | Component states in light, dark, RTL and reduced motion, at <http://localhost:6006/>                       |
| `npm run test:e2e`                            | Builds must exist; serves `dist/` with the reference nginx in Docker and runs Playwright                   |
| `npm run serve`                               | Serves `dist/` with the reference nginx at <http://127.0.0.1:8090/> for manual checks                      |
| `npm run deploy:cloudflare:prepare`           | Assembles `.deploy/cloudflare/` (`dist/` plus `_headers`, `_redirects` and 404 pages) for Cloudflare Pages |
| `npm run media:sync`                          | Uploads the images in `public/media/` to object storage (`MEDIA_STORAGE=s3`); never replaces an object     |
| `npm run media:check`                         | After a build with a CDN: every image address the site uses answers with an image                          |
| `npm run check:live`                          | Checks the deployed site from outside: pages, statuses, sitemaps, the host's robots.txt, crawler access    |
| `npm run deploy:rollback -- --list`           | Production deployments on Cloudflare Pages; `-- --yes [--to <id or commit>]` rolls back                    |
| `npm run indexnow -- snapshot` / `submit`     | Before and after a deploy: submits new, changed and removed addresses to IndexNow                          |
| `sh scripts/host-rehearsal.sh`                | Builds for a local host site under `/prompt-seen`, behind a proxy, and checks it end to end (Docker)       |

Redirects and removed addresses (`content/redirects.yaml`) become host configuration in
`deploy/generated/` on every `content:build`: the reference nginx include, `cloudflare/_redirects`,
`netlify/_redirects`, `vercel/vercel.json`, and `static/`, meta refresh pages to copy over `dist/`
for hosts without redirect rules (GitHub Pages, a bare bucket).

Build-time settings come from `content/site.yaml` ([`site.example.yaml`](site.example.yaml)
documents every key), overridden by environment variables ([`.env.example`](.env.example)):
`SITE_ORIGIN`, `BASE_PATH` (empty for a root deployment), `URL_PATTERN`, `MEDIA_BASE_URL`,
`BUILD_MODE` (`preview`, the default, marks every page noindex; `production` is for the live
site), `BUILD_ID` and `CONTENT_DIR`. Changing the base path needs a new build.

## Deploying

The build is static files in `dist/{basePath}/` plus host configuration in `deploy/generated/`.
There is no server process to run or patch; keep the build dependencies up to date. Build with
the address the site will have, in production mode:

```bash
SITE_ORIGIN=https://xxx.com BASE_PATH=/prompt-seen BUILD_MODE=production npm run build
```

Then pick one of three forms (design doc §15.4):

1. **The host serves the files.** Copy `dist/` to the server, point nginx's `root` at it and
   `include` `deploy/generated/nginx/prompt-seen.conf`, and turn on compression for text, as
   [`deploy/nginx/host-server.conf`](deploy/nginx/host-server.conf) shows. Merge
   `deploy/generated/robots-snippet.txt` into the host's `robots.txt`.
2. **Static hosting.** Upload `dist/` with the host's file from `deploy/generated/`: Cloudflare
   Pages (`npm run deploy:cloudflare:prepare`, then `wrangler pages deploy .deploy/cloudflare`),
   Netlify (`netlify/_redirects`), Vercel (`vercel/vercel.json`), or GitHub Pages and plain
   buckets (`static/`, meta refresh pages for redirects). For a root deployment build with
   `BASE_PATH=` and `robots.mode: standalone`.
3. **Static hosting behind the host site.** Deploy as in 2 and let the host forward
   `/prompt-seen/*` there: [`deploy/hosts/`](deploy/hosts/) has an nginx and a Cloudflare Worker
   example. This is how the project's own instance runs: GitHub Actions deploys every merge to
   Cloudflare Pages and checks the live site ([`docs/operations.md`](docs/operations.md)).

Afterwards, `npm run check:live` checks the deployed site from outside.

## Documentation

- [`content/README.md`](content/README.md): how to write and publish content, for maintainers.
- [Design document](docs/prompt-library-website-design.md) (Chinese): the source of truth.
  §17 is the implementation plan and session map.
- [Engineering conventions](docs/engineering-conventions.md): how code in this repository is organised and extended.
- [Subpath hosting decision](docs/subpath-hosting-decision.md): why the site is a static export, with prototype results.
- [Language coverage assessment](docs/language-coverage-assessment.md).
- [First-load JavaScript](docs/first-load-js.md): what each page loads, by module, and what is left to cut.
- [Operations](docs/operations.md): production setup, deploying, rolling back, search engines, analytics.
- [Contributing](CONTRIBUTING.md), [code of conduct](CODE_OF_CONDUCT.md), [security](SECURITY.md), [changelog](CHANGELOG.md).
- [`design/`](design/README.md): the chosen visual direction and reference pages. Tokens live in `src/styles/tokens/`.

## Licenses

Code: [MIT](LICENSE). Prompt text and descriptions: [CC BY 4.0](content/LICENSE). Images are
licensed per file. Bundled fonts: [SIL OFL 1.1](src/styles/fonts/OFL.txt). The name and brand are
not licensed for reuse.
