# content

The content model for pages (design doc §3.5, §7). `content:build` writes it to `.generated/content/`; this module reads it on the server during the build. Owner: step 1b.

- `types.ts`: the contract. Summaries for lists and links (`PromptSummary`, `TemplateSummary`, …), serializable detail models shared by the full page and the popup (`PromptDetail`, `TemplateDetail`, …), rich text (`RichBlock`) compiled from MDX at build time, and `ImageRef`.
- `index.ts` (server-only): `getEntry(id, locale)`, `listEntries({ kind, locale })`, `getDetailModel(kind, key, locale)`, `findBySlug(kind, locale, slug)`, `localeIndex(locale)`, `manifest()` and `entryParams(kind)` for `generateStaticParams`. Locale arguments are registry codes (`zh-Hans`).
- `files.ts`: where each file lives, shared with the emitter.

Client components receive plain data from pages; they never import `index.ts`. Build-time code (reading `content/`, MDX compilation, validation) lives in `scripts/lib/content/`.
