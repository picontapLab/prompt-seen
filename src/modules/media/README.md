# media

Image addresses and responsive attributes (design doc §7, §10): `getImage(imageRef, preset)`, `srcSet`, `imageUrl` and `absoluteImageUrl`. Works on the server and in the browser. Images come from the CDN when `media.baseUrl` (or `MEDIA_BASE_URL`) is set, otherwise from the local media driver's files in `public/media/`; the switch is `mediaUrl` / `absoluteMediaUrl` in `@/modules/url` (step 5). Owner: step 1b; `media:import` lives in `scripts/`.
