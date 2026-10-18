// Where the `search` emitter writes each locale's index and where the Worker finds it (design doc
// §13.3). Relative to public/generated/; `paths.generated(file)` gives the address.

/** The search index of one locale. */
export const searchIndexFile = (locale: string) => `${locale}/search/index.json`;
