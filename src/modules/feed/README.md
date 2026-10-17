# feed

The continuous Prompt list's data (design doc §3.5, §9.4, §11.8.2).

- `types.ts`: pages, blocks (cards, feature rows, template strips, collection banners), the slim index.
- `compose.ts`: build time, used by `scripts/emitters/feed.ts`: newest-first pages, editorial
  interludes, the featured order and the showcase band.
- `assemble.ts`: lays out one batch; shared by the build and the browser.
- `query.ts`: filters, counts, order and the URL fragment; browser side, reused by step 4c's explore.
- `files.ts`: where the files live; `index.ts`: server-only reader for list pages.
