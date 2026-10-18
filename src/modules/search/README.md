# search

Per-locale search (design doc §13, §11.8.6). Owner: step 3d.

- `tokenize.ts`: one tokeniser for documents and queries; CJK character pairs, folded case and accents.
- `engine.ts`: MiniSearch options, index creation (build) and loading (browser), search and no-result help.
- `documents.ts`: build time, the documents of one locale from the content model; used by `scripts/emitters/search.ts`.
- `search.worker.ts`, `worker-core.ts`: the Worker and its request handler, which also runs on the main thread when Workers are unavailable.
- `client.ts`: the page side; one Worker per page, started on first use; sequence numbers per request.
- `files.ts`, `types.ts`: index file location and data shapes.

The UI (header entry, quick panel, search page) is in `src/ui/search/`.
