# seo

Page metadata (design doc §9.3): title, description, self-referencing canonical, hreflang for the versions this build has (x-default: the default locale's version), Open Graph and Twitter cards. Set up in step 2.

- Pages call `promptMetadata(detail, locale)`, `templateMetadata(detail, locale)` or `pageMetadata({ … })` from `generateMetadata` (server-only, `index.ts`).
- The rules are the pure `buildPageMetadata(page, context)` in `build.ts`, tested in `build.test.ts`.
- Addresses come from `@/modules/url` and `@/modules/media`, never assembled here.

Step 3b adds structured data, sitemaps and the `ItemList` helpers (§9.6, §9.7).
