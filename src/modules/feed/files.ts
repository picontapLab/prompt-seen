// Where the `feed` emitter writes the list's data and where pages and the browser find it
// (design doc §3.5). Shared by the emitter, the server reader and the browser, so they cannot
// drift. Public files are relative to public/generated/ (`paths.generated(file)` gives their
// address); internal ones to .generated/.

/** Newest-first page n of a locale's list (§3.5 "按 locale、排序方式与页码拆分"). */
export const feedPageFile = (locale: string, page: number) => `${locale}/feed/latest/${page}.json`;

/** The slim metadata index: filter facts, featured order, terms and interludes. */
export const feedIndexFile = (locale: string) => `${locale}/feed/index.json`;

/** The popup's detail model of a prompt, prefetched when a card shows intent (§3.5, §11.8.2). */
export const promptJsonFile = (locale: string, slug: string) => `${locale}/prompts/${slug}.json`;

/** The showcase band, read by the list page only (internal: the browser never needs it). */
export const feedBandFile = (locale: string) => `feed/${locale}/band.json`;
