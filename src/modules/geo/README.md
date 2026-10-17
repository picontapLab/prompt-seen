# geo

Machine-readable versions for AI search, answer engines and agents (design doc §9.10). Step 3b.

- **`index.md`** of every published Prompt and template page (`markdown.ts`): title, summary, test record, the full prompt in a code block, annotations, how to use it, test prints with their parameters, source and licence, the page's address and the other languages' Markdown versions. Headings and labels are the page's own (`detail` messages; `geo` for the few Markdown-only ones), so the twin says what the page says. Routes: `src/app/[locale]/(public)/{prompts,templates}/[slug]/index.md/route.ts`. Hosts serve it as `text/markdown` with `Link: <page>; rel="canonical"` (generated nginx include and Cloudflare `_headers`).
- **`llms.txt`** (`llms.ts`): the site in the default locale with links to every public language and Markdown version.
- **robots** (`robots.ts`): search, AI search and user-triggered crawlers are allowed; training crawlers follow `robots.aiTraining`. At the root of a host the exported `robots.txt` is the host's file. Under a subpath with `robots.mode: snippet`, `scripts/emitters/robots.ts` also writes `deploy/generated/robots-snippet.txt` for the host to merge into its own root `robots.txt` (§15.4.3).
- `documents.ts` builds the documents from explicit sources, so the route handlers (`index.ts`, server-only) and `npm run content:export` (Node) produce the same text.
