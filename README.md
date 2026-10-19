# Prompt Seen

A browsable, searchable library of tested image prompts and templates. Every work shows its
prompt and what each phrase does. The site is a static export of a Next.js app that deploys at
the root of a domain or under a subpath of another site, such as `example.com/prompt-seen`.

Status: under construction. Steps 1a, 1b and 1c of the implementation plan (design doc §17) are
in place: the project scaffold, configuration and CI; the content model with its build pipeline,
validation, template rendering, image import and a sample content set; and the design system
(tokens, fonts, theme, React Aria primitives, Storybook) with the page shell. Step 2 adds the
Prompt and template detail pages, e.g. `/prompt-seen/en/prompts/jazz-club-poster/`; step 3a adds the
Prompt list with continuous loading and filters, `/prompt-seen/en/prompts/`; step 3b adds structured data,
sitemaps (`/prompt-seen/sitemap.xml`), `robots.txt`, Markdown versions of every published page (`…/index.md`)
and `/prompt-seen/llms.txt`; step 3c adds the template editor on every template page and the template list,
`/prompt-seen/en/templates/`; step 3d adds search: the quick panel (`/` or ⌘K on any page) and
`/prompt-seen/en/search/`; step 3e adds the language entry at the base path, topic pages
(`/prompt-seen/en/categories/landscape/`), collections (`/prompt-seen/en/collections/`), the about and
license pages, the 404, 410 and missing-translation pages, and host configuration for redirects and
removed addresses; step 4a opens works from the list and topic pages in a detail popup at the work's
own address, with previous / next, swipes on phones and the image expanding from its card. The home
page is still a placeholder.

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

Redirects and removed addresses (`content/redirects.yaml`) become host configuration in
`deploy/generated/` on every `content:build`: the reference nginx include, `cloudflare/_redirects`,
`netlify/_redirects`, `vercel/vercel.json`, and `static/`, meta refresh pages to copy over `dist/`
for hosts without redirect rules (GitHub Pages, a bare bucket).

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
- [`design/`](design/README.md): the chosen visual direction and reference pages. Tokens live in `src/styles/tokens/`.

## Licenses

Code: [MIT](LICENSE). Prompt text and descriptions: [CC BY 4.0](content/LICENSE). Images are
licensed per file. Bundled fonts: [SIL OFL 1.1](src/styles/fonts/OFL.txt). The name and brand are
not licensed for reuse.
